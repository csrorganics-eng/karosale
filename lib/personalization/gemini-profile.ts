import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, orderItems, orders, pageViews, products, users } from "@/lib/db/schema";
import { geminiGenerateContent, parseJsonFromModelText, isGeminiConfigured } from "@/lib/gemini";

const PROFILE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export type GeminiPersonalizationProfile = {
  summary: string;
  categoryHints: string[];
};

function isStale(at: Date | null | undefined): boolean {
  if (!at) return true;
  return Date.now() - at.getTime() > PROFILE_STALE_MS;
}

export async function tryRefreshUserGeminiProfile(userId: string): Promise<void> {
  if (!isGeminiConfigured()) return;

  const [u] = await db
    .select({
      id: users.id,
      geminiPersonalizationProfileAt: users.geminiPersonalizationProfileAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return;
  if (!isStale(u.geminiPersonalizationProfileAt)) return;

  const orderLines = await db
    .select({ name: products.name, category: categories.name })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(40);

  const views = await db
    .select({ name: products.name, category: categories.name })
    .from(pageViews)
    .innerJoin(products, eq(pageViews.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(pageViews.userId, userId))
    .orderBy(desc(pageViews.createdAt))
    .limit(30);

  const purchased = [...new Set(orderLines.map((r) => `${r.name} (${r.category})`))].slice(0, 14);
  const browsed = [...new Set(views.map((r) => `${r.name} (${r.category})`))].slice(0, 10);

  if (purchased.length === 0 && browsed.length === 0) return;

  const prompt = `Purchased (recent, deduped):\n${purchased.join("\n") || "(none)"}\n\nBrowsed:\n${browsed.join("\n") || "(none)"}`;

  try {
    const res = await geminiGenerateContent({
      systemInstruction:
        "You profile organic grocery shoppers in India. Reply ONLY with JSON: " +
        '{"summary":"string max 220 chars","categoryHints":["string"]} with at most 6 hints.',
      prompt,
    });
    const raw = res.response.text();
    const parsed = parseJsonFromModelText(raw) as {
      summary?: unknown;
      categoryHints?: unknown;
    };
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 240) : "";
    const hints = Array.isArray(parsed.categoryHints)
      ? parsed.categoryHints
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];
    if (!summary) return;

    const profile: GeminiPersonalizationProfile = { summary, categoryHints: hints };
    await db
      .update(users)
      .set({
        geminiPersonalizationProfile: profile,
        geminiPersonalizationProfileAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (e) {
    console.warn("[gemini-profile] refresh failed:", e);
  }
}
