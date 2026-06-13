import { and, desc, eq, inArray, like } from "drizzle-orm";
import {
  isAiRouterExhausted,
  routerChatCompletion,
  routerQuotaUserMessage,
  type AiMessage,
  type AiTool,
} from "@/lib/ai-router";
import { getProductBySlug, searchProducts } from "@/lib/db/queries/products";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { insertShopChatEscalation } from "@/lib/db/queries/shop-chat";
import { sendEmail } from "@/lib/resend";
import { BRAND_NAME } from "@/lib/brand";
import { companionKnowledgeBlock } from "@/lib/chat/shop-chat-companion-knowledge";

const shopToolsOpenAI: AiTool[] = [
  {
    type: "function",
    function: {
      name: "search_catalog",
      description:
        "Search active products by keyword (English or transliterated regional names). Use for availability, similar items, and discovery before recommendations.",
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
      description:
        "Load one product by storefront slug: price, stock, SKU, weight, organic flags, ratings, descriptions, shop path. Use after search_catalog when the shopper picks one item.",
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
      name: "get_my_purchase_history",
      description:
        "Distinct product names from the signed-in shopper's recent orders (for recommendations and 'I bought before' questions). Only when logged in.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_order_detail",
      description:
        "Look up one order for the signed-in shopper by full order number (e.g. CSR-YYYYMMDD-0001) or numeric suffix from their email. Returns status, totals, tracking/invoice URLs when stored. Use for 'where is order 2533'.",
      parameters: {
        type: "object",
        properties: {
          order_ref: {
            type: "string",
            description: "Order number or trailing digits as the shopper typed it",
          },
        },
        required: ["order_ref"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_recent_orders",
      description:
        "List the signed-in customer's recent orders with order number, status, total, date. Use before get_my_order_detail when the shopper is unsure of the exact id.",
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
      const { product, category, images } = full;
      const primary = images.find((im) => im.isPrimary) ?? images[0];
      return {
        found: true,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        price: product.price,
        comparePrice: product.comparePrice != null ? String(product.comparePrice) : null,
        stockQty: product.stockQty,
        weightGrams: product.weightGrams,
        isOrganicCertified: product.isOrganicCertified,
        certificationType: product.certificationType ?? null,
        avgRating: product.avgRating != null ? String(product.avgRating) : null,
        reviewCount: product.reviewCount,
        shortDescription: product.shortDescription?.slice(0, 500) ?? "",
        descriptionSnippet: product.description?.slice(0, 700) ?? "",
        category: category?.name ?? "",
        primaryImageUrl: primary?.url ?? null,
        shopPath: `/shop/${product.slug}`,
      };
    }
    case "get_my_purchase_history": {
      if (!ctx.userId) {
        return { error: "Customer is not signed in. Ask them to sign in to see purchase history." };
      }
      const rows = await db
        .select({ name: orderItems.productName, createdAt: orders.createdAt })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orders.userId, ctx.userId),
            inArray(orders.status, [
              "delivered",
              "shipped",
              "out_for_delivery",
              "packed",
              "processing",
              "confirmed",
            ]),
          ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(48);
      const seen = new Set<string>();
      const recentProducts: string[] = [];
      for (const r of rows) {
        if (seen.has(r.name)) continue;
        seen.add(r.name);
        recentProducts.push(r.name);
        if (recentProducts.length >= 18) break;
      }
      return { recentProducts };
    }
    case "get_my_order_detail": {
      if (!ctx.userId) {
        return { error: "Customer is not signed in. Ask them to sign in to look up an order." };
      }
      const raw = typeof args.order_ref === "string" ? args.order_ref : "";
      const orderRef = raw.trim().replace(/^#/i, "").replace(/\s+/g, "");
      if (!orderRef) return { error: "missing_order_ref" };

      const baseSelect = {
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        total: orders.total,
        createdAt: orders.createdAt,
        shippedAt: orders.shippedAt,
        trackingUrl: orders.trackingUrl,
        awbCode: orders.awbCode,
        courierName: orders.courierName,
        invoiceUrl: orders.invoiceUrl,
        estimatedDelivery: orders.estimatedDelivery,
      };

      let match = await db
        .select(baseSelect)
        .from(orders)
        .where(and(eq(orders.userId, ctx.userId), eq(orders.orderNumber, orderRef)))
        .limit(1);

      if (match.length === 0 && /^\d{3,6}$/.test(orderRef)) {
        const candidates = await db
          .select(baseSelect)
          .from(orders)
          .where(and(eq(orders.userId, ctx.userId), like(orders.orderNumber, `%${orderRef}`)))
          .orderBy(desc(orders.createdAt))
          .limit(4);
        if (candidates.length === 1) match = candidates;
        else if (candidates.length > 1) {
          return {
            ambiguous: true,
            candidates: candidates.map((c) => ({
              orderNumber: c.orderNumber,
              status: c.status,
              createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
            })),
            hint: "Ask the shopper to confirm the full order number from their confirmation email.",
          };
        }
      }

      const [order] = match;
      if (!order) return { found: false, hint: "No matching order for this account. Check the order number or sign-in account." };

      const lines = await db
        .select({
          productName: orderItems.productName,
          qty: orderItems.qty,
          unitPrice: orderItems.unitPrice,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id))
        .limit(14);

      return {
        found: true,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        total: order.total != null ? String(order.total) : null,
        createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
        shippedAt: order.shippedAt
          ? order.shippedAt instanceof Date
            ? order.shippedAt.toISOString()
            : String(order.shippedAt)
          : null,
        trackingUrl: order.trackingUrl,
        awbCode: order.awbCode,
        courierName: order.courierName,
        invoiceUrl: order.invoiceUrl,
        estimatedDelivery:
          order.estimatedDelivery != null ? String(order.estimatedDelivery).slice(0, 10) : null,
        lineItems: lines.map((l) => ({
          name: l.productName,
          qty: l.qty,
          unitPrice: l.unitPrice != null ? String(l.unitPrice) : null,
        })),
      };
    }
    case "list_my_recent_orders": {
      if (!ctx.userId) {
        return { error: "Customer is not signed in. Ask them to sign in to see orders." };
      }
      const rows = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.userId, ctx.userId))
        .orderBy(desc(orders.createdAt))
        .limit(8);
      return {
        orders: rows.map((r) => ({
          id: r.id,
          orderNumber: r.orderNumber,
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
  const systemInstruction = `You are ${BRAND_NAME}'s expert shopping companion (organic seeds, natural inputs, and related products — India-focused).

${companionKnowledgeBlock()}

## Tools (required discipline)
- Use **search_catalog** for product discovery; try alternate spellings or English equivalents for regional names.
- Use **get_product_summary** once the shopper is looking at a specific slug from search results.
- For **signed-in** shoppers: **list_my_recent_orders**, **get_my_order_detail** (tracking, invoice URL when present), and **get_my_purchase_history** for personalized suggestions grounded in their past items.
- **Never invent** SKU, price, stock, pack seed counts, delivery promises, COD rules, or tracking. If tools return empty, say so and offer search again or escalate_to_human.
- If the shopper is **not signed in**, do not imply you can see their orders or history — invite them to sign in to **Account → Orders** and paste the order number if needed.
- After **escalate_to_human**, confirm the team was emailed and what to expect.
- Prefer one focused **search_catalog** per distinct intent; avoid duplicate identical searches.

Tone: concise, respectful, and confident about general organic-gardening education; humble about anything that depends on warehouse, payments, or agronomy beyond the catalog.`;

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
      result = await routerChatCompletion(messages, shopToolsOpenAI, { maxTokens: 1400 });
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
