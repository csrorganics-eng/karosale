import { createHash } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { abExperiments, searchRankingSettings, users } from "@/lib/db/schema";
import { mergeWeightPatch, normalizeWeightPatch, segmentMatches } from "@/lib/merchandising/patch-weights";
import type { RankingWeights, ShopperSegment } from "@/lib/merchandising/types";
import { DEFAULT_RANKING_WEIGHTS } from "@/lib/merchandising/types";
import { CART_SESSION_COOKIE_NAME } from "@/lib/cart-cookie";

function rowToWeights(row: typeof searchRankingSettings.$inferSelect): RankingWeights {
  return {
    matchNameWeight: parseFloat(String(row.matchNameWeight)),
    matchDescWeight: parseFloat(String(row.matchDescWeight)),
    matchSkuWeight: parseFloat(String(row.matchSkuWeight)),
    salesLogCoef: parseFloat(String(row.salesLogCoef)),
    ratingCoef: parseFloat(String(row.ratingCoef)),
    reviewCountCoef: parseFloat(String(row.reviewCountCoef)),
    featuredBonus: parseFloat(String(row.featuredBonus)),
    bestsellerBonus: parseFloat(String(row.bestsellerBonus)),
    inStockBonus: parseFloat(String(row.inStockBonus)),
  };
}

export function assignAbVariant(experimentId: string, seed: string, trafficBPercent: number): "a" | "b" {
  const h = createHash("sha256").update(`${experimentId}:${seed}`).digest();
  const n = h.readUInt32BE(0) % 100;
  return n < trafficBPercent ? "b" : "a";
}

/**
 * Global admin ranking row + active A/B experiment overrides for this shopper
 * (segment + stable assignment from user id or cart session cookie).
 */
export async function resolveRankingWeightsForRequest(): Promise<RankingWeights> {
  let base = { ...DEFAULT_RANKING_WEIGHTS };

  try {
    const [row] = await db.select().from(searchRankingSettings).limit(1);
    if (row) base = rowToWeights(row);
  } catch {
    /* table missing */
  }

  const session = await auth();
  const cookieStore = await cookies();
  const cartSession = cookieStore.get(CART_SESSION_COOKIE_NAME)?.value ?? "";
  const seed = session?.user?.id ?? cartSession ?? "anonymous";

  let totalOrders = 0;
  if (session?.user?.id) {
    try {
      const [u] = await db
        .select({ totalOrders: users.totalOrders })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);
      totalOrders = u?.totalOrders ?? 0;
    } catch {
      /* */
    }
  }

  const segment: ShopperSegment = session?.user?.id
    ? totalOrders > 0
      ? "returning"
      : "customer"
    : "guest";

  try {
    const experiments = await db
      .select()
      .from(abExperiments)
      .where(eq(abExperiments.isActive, true));

    for (const ex of experiments) {
      if (!segmentMatches(ex.segment, segment)) continue;
      const v = assignAbVariant(ex.id, seed, ex.trafficBPercent);
      const raw = v === "b" ? ex.variantBConfig : ex.variantAConfig;
      base = mergeWeightPatch(base, normalizeWeightPatch(raw));
    }
  } catch {
    /* */
  }

  return base;
}
