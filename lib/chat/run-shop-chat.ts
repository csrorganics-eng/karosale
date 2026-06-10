import { desc, eq } from "drizzle-orm";
import {
  isAiRouterExhausted,
  routerChatCompletion,
  routerQuotaUserMessage,
  type AiMessage,
  type AiTool,
} from "@/lib/ai-router";
import { getProductBySlug, searchProducts } from "@/lib/db/queries/products";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { insertShopChatEscalation } from "@/lib/db/queries/shop-chat";
import { sendEmail } from "@/lib/resend";
import { BRAND_NAME } from "@/lib/brand";

const shopToolsOpenAI: AiTool[] = [
  {
    type: "function",
    function: {
      name: "search_catalog",
      description: "Search active products by keyword for the shopper.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_summary",
      description: "Load one product by URL slug for details (price, stock, description snippet).",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string" },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_recent_orders",
      description:
        "List the signed-in customer's recent orders with id, status, total, date. Only works when the shopper is logged in.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human",
      description:
        "When you cannot answer, policy requires a human, or the shopper asks for a person. Creates a support ticket and emails the store team.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string" },
          shopper_message: { type: "string" },
          shopper_email: { type: "string", description: "optional" },
        },
        required: ["reason", "shopper_message"],
      },
    },
  },
];

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Tool + model turns per shopper message (each turn is one chat completion). */
function getMaxToolRounds(): number {
  return parsePositiveInt(process.env.CHAT_MAX_TOOL_ROUNDS, 6);
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { userId: string | null; sessionId: string; lastUserMessage: string },
): Promise<Record<string, unknown>> {
  switch (name) {
    case "search_catalog": {
      const q = typeof args.query === "string" ? args.query : "";
      // Skip semantic rerank: chat uses the multi-provider router; rerank would add extra Gemini calls.
      const hits = await searchProducts(q, 6, undefined, { skipSemanticRerank: true });
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
      return {
        orders: rows.map((r) => ({
          id: r.id,
          status: r.status,
          total: r.total != null ? String(r.total) : null,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        })),
      };
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

export async function runShopChatAssistant(params: {
  sessionId: string;
  userId: string | null;
  userEmail: string | null;
  message: string;
  priorMessages: { role: string; content: string }[];
}): Promise<string> {
  const systemInstruction = `You are ${BRAND_NAME}'s helpful shop assistant (organic groceries, India).
Use tools when you need live catalog data or order status. Never invent SKU, price, or stock.
If the shopper is not signed in, do not claim you can see their orders — suggest signing in.
Keep replies concise and friendly. After escalate_to_human, reassure them an email was sent.
Prefer a single search_catalog call with a clear query when exploring products; avoid repeated identical searches.`;

  const signed = params.userId
    ? `Shopper is signed in (user id: ${params.userId}).`
    : "Shopper is browsing as a guest.";
  const emailLine = params.userEmail ? `Email on file: ${params.userEmail}` : "";
  const contextLine = `${signed} ${emailLine}`.trim();

  const historyMessages: AiMessage[] = params.priorMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const messages: AiMessage[] = [
    { role: "system", content: systemInstruction },
    ...historyMessages,
    { role: "user", content: contextLine ? `${contextLine}\n\nShopper: ${params.message}` : `Shopper: ${params.message}` },
  ];

  const ctx = {
    userId: params.userId,
    sessionId: params.sessionId,
    lastUserMessage: params.message,
  };

  const maxRounds = getMaxToolRounds();
  for (let round = 0; round < maxRounds; round++) {
    let result: Awaited<ReturnType<typeof routerChatCompletion>>;
    try {
      result = await routerChatCompletion(messages, shopToolsOpenAI, { maxTokens: 1024 });
    } catch (e) {
      if (isAiRouterExhausted(e)) {
        return routerQuotaUserMessage();
      }
      console.error("[shop-chat] routerChatCompletion failed", e);
      return "The assistant hit an unexpected error. Please try again in a moment.";
    }

    if (result.toolCalls && result.toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: result.content,
        tool_calls: result.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      } as AiMessage);
      for (const tc of result.toolCalls) {
        let output: Record<string, unknown>;
        try {
          const args = JSON.parse(tc.arguments) as Record<string, unknown>;
          output = await runTool(tc.name, args, ctx);
        } catch (e) {
          output = {
            error: "invalid_arguments",
            detail: e instanceof Error ? e.message : String(e),
          };
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(output),
        });
      }
      continue;
    }

    const text = result.content?.trim();
    if (text) return text;
    return "Sorry, I could not generate a reply. Please try again.";
  }

  return "I wasn't able to complete that. Please try again.";
}
