import { desc, eq } from "drizzle-orm";
import type { Content, FunctionCall, Tool } from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai";
import {
  geminiGenerateContent,
  geminiQuotaUserMessage,
  isGeminiConfigured,
  isGeminiModelNotFoundError,
  isGeminiRateLimitError,
} from "@/lib/gemini";
import { getProductBySlug, searchProducts } from "@/lib/db/queries/products";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { insertShopChatEscalation } from "@/lib/db/queries/shop-chat";
import { sendEmail } from "@/lib/resend";
import { BRAND_NAME } from "@/lib/brand";

const shopTools = [
  {
    functionDeclarations: [
      {
        name: "search_catalog",
        description: "Search active products by keyword for the shopper.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: "Search text" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_product_summary",
        description: "Load one product by URL slug for details (price, stock, description snippet).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            slug: { type: SchemaType.STRING },
          },
          required: ["slug"],
        },
      },
      {
        name: "list_my_recent_orders",
        description:
          "List the signed-in customer's recent orders with id, status, total, date. Only works when the shopper is logged in.",
        parameters: { type: SchemaType.OBJECT, properties: {}, required: [] },
      },
      {
        name: "escalate_to_human",
        description:
          "When you cannot answer, policy requires a human, or the shopper asks for a person. Creates a support ticket and emails the store team.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            reason: { type: SchemaType.STRING },
            shopper_message: { type: SchemaType.STRING },
            shopper_email: { type: SchemaType.STRING, description: "optional" },
          },
          required: ["reason", "shopper_message"],
        },
      },
    ],
  },
];

async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { userId: string | null; sessionId: string; lastUserMessage: string },
): Promise<Record<string, unknown>> {
  switch (name) {
    case "search_catalog": {
      const q = typeof args.query === "string" ? args.query : "";
      const hits = await searchProducts(q, 6);
      return { results: hits };
    }
    case "get_product_summary": {
      const slug = typeof args.slug === "string" ? args.slug : "";
      const full = await getProductBySlug(slug);
      if (!full) return { found: false };
      const { product, category } = full;
      return {
        found: true,
        name: product.name,
        slug: product.slug,
        price: product.price,
        stockQty: product.stockQty,
        shortDescription: product.shortDescription?.slice(0, 400) ?? "",
        category: category?.name ?? "",
      };
    }
    case "list_my_recent_orders": {
      if (!ctx.userId) {
        return { error: "Customer is not signed in. Ask them to sign in to see orders." };
      }
      const rows = await db
        .select({
          id: orders.id,
          status: orders.status,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.userId, ctx.userId))
        .orderBy(desc(orders.createdAt))
        .limit(6);
      return { orders: rows };
    }
    case "escalate_to_human": {
      const reason = typeof args.reason === "string" ? args.reason : "unspecified";
      const shopper_message =
        typeof args.shopper_message === "string"
          ? args.shopper_message
          : typeof args.shopperMessage === "string"
            ? args.shopperMessage
            : ctx.lastUserMessage;
      const shopper_emailRaw =
        typeof args.shopper_email === "string"
          ? args.shopper_email
          : typeof args.shopperEmail === "string"
            ? args.shopperEmail
            : "";
      const shopper_email = shopper_emailRaw.trim() ? shopper_emailRaw.trim() : null;
      await insertShopChatEscalation({
        sessionId: ctx.sessionId,
        userEmail: shopper_email,
        reason,
        lastUserMessage: shopper_message,
      });
      const adminTo =
        process.env.CHAT_ESCALATION_EMAIL?.trim() || process.env.ADMIN_ALERT_EMAIL?.trim();
      if (adminTo) {
        try {
          await sendEmail({
            to: adminTo,
            subject: `[${BRAND_NAME}] Shop chat escalation`,
            html: `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
<p><strong>Last message:</strong> ${escapeHtml(shopper_message)}</p>
<p><strong>Session:</strong> ${escapeHtml(ctx.sessionId)}</p>
${shopper_email ? `<p><strong>Shopper email:</strong> ${escapeHtml(shopper_email)}</p>` : ""}`,
            text: `Reason: ${reason}\nMessage: ${shopper_message}\nSession: ${ctx.sessionId}`,
          });
        } catch (e) {
          console.error("[shop-chat] escalation email failed", e);
        }
      }
      return {
        ok: true,
        message:
          "A human teammate has been notified by email. They will follow up shortly. Anything else I can search for on the site?",
      };
    }
    default:
      return { error: "unknown_tool" };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHistoryBlock(turns: { role: string; content: string }[]): string {
  if (turns.length === 0) return "";
  return (
    "Earlier in this chat:\n" +
    turns.map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`).join("\n") +
    "\n\n"
  );
}

export async function runShopChatAssistant(params: {
  sessionId: string;
  userId: string | null;
  userEmail: string | null;
  message: string;
  priorMessages: { role: string; content: string }[];
}): Promise<string> {
  if (!isGeminiConfigured()) {
    return "Our assistant is offline right now. Please browse the catalog or email support from the site footer.";
  }

  const systemInstruction = `You are ${BRAND_NAME}'s helpful shop assistant (organic groceries, India).
Use tools when you need live catalog data or order status. Never invent SKU, price, or stock.
If the shopper is not signed in, do not claim you can see their orders — suggest signing in.
Keep replies concise and friendly. After escalate_to_human, reassure them an email was sent.`;

  const history = buildHistoryBlock(params.priorMessages.slice(-8));
  const signed = params.userId
    ? `Shopper is signed in (user id: ${params.userId}).`
    : "Shopper is browsing as a guest.";
  const emailLine = params.userEmail ? `Email on file: ${params.userEmail}` : "";

  const userText = `${history}${signed} ${emailLine}\n\nShopper: ${params.message}`;
  let contents: Content[] = [{ role: "user", parts: [{ text: userText }] }];

  const ctx = {
    userId: params.userId,
    sessionId: params.sessionId,
    lastUserMessage: params.message,
  };

  for (let round = 0; round < 4; round++) {
    let res: Awaited<ReturnType<typeof geminiGenerateContent>>;
    try {
      res = await geminiGenerateContent({
        systemInstruction,
        contents,
        tools: shopTools as Tool[],
      });
    } catch (e) {
      if (isGeminiRateLimitError(e)) return geminiQuotaUserMessage();
      if (isGeminiModelNotFoundError(e)) {
        return (
          "The assistant could not load a working Gemini model (invalid or retired model id). " +
          "Remove GEMINI_MODEL or set it to a supported Flash model such as gemini-2.5-flash. " +
          "See https://ai.google.dev/gemini-api/docs/models"
        );
      }
      console.error("[shop-chat] generateContent failed", e);
      return "The assistant hit an unexpected error. Please try again in a moment.";
    }

    const response = res.response;
    const calls = response.functionCalls() as FunctionCall[] | undefined;

    if (calls && calls.length > 0) {
      const modelParts =
        response.candidates?.[0]?.content?.parts ??
        calls.map((c) => ({ functionCall: c }));

      const responseParts = await Promise.all(
        calls.map(async (fc) => {
          const args = (fc.args ?? {}) as Record<string, unknown>;
          const payload = await runTool(fc.name, args, ctx);
          return {
            functionResponse: {
              name: fc.name,
              response: payload,
            },
          };
        }),
      );

      contents = [
        ...contents,
        { role: "model", parts: modelParts },
        { role: "user", parts: responseParts },
      ];
      continue;
    }

    let text: string;
    try {
      text = response.text();
    } catch (e) {
      if (isGeminiRateLimitError(e)) return geminiQuotaUserMessage();
      if (isGeminiModelNotFoundError(e)) {
        return "The assistant could not load a working Gemini model. Check GEMINI_MODEL in your environment.";
      }
      console.error("[shop-chat] response.text() failed", e);
      return "The assistant could not read the model response. Please try again.";
    }
    return text.trim() || "Sorry, I could not generate a reply. Please try again.";
  }

  return "I had trouble finishing that request. Please try again in a moment.";
}
