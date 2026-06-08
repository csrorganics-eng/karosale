import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { searchRankingSettings } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import { mergeWeightPatch } from "@/lib/merchandising/patch-weights";
import { DEFAULT_RANKING_WEIGHTS, RANKING_WEIGHT_KEYS, type RankingWeights } from "@/lib/merchandising/types";

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

const weightField = z.coerce.number().finite().min(0).max(100000).optional();

const patchSchema = z.object({
  matchNameWeight: weightField,
  matchDescWeight: weightField,
  matchSkuWeight: weightField,
  salesLogCoef: weightField,
  ratingCoef: weightField,
  reviewCountCoef: weightField,
  featuredBonus: weightField,
  bestsellerBonus: weightField,
  inStockBonus: weightField,
});

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

function weightsToRowValues(w: RankingWeights) {
  return {
    matchNameWeight: String(w.matchNameWeight),
    matchDescWeight: String(w.matchDescWeight),
    matchSkuWeight: String(w.matchSkuWeight),
    salesLogCoef: String(w.salesLogCoef),
    ratingCoef: String(w.ratingCoef),
    reviewCountCoef: String(w.reviewCountCoef),
    featuredBonus: String(w.featuredBonus),
    bestsellerBonus: String(w.bestsellerBonus),
    inStockBonus: String(w.inStockBonus),
  };
}

function responseFromWeights(id: string, w: RankingWeights, updatedAt: Date) {
  return { id, ...w, updatedAt };
}

export async function GET() {
  try {
    await requireRole(["admin"]);
    const [row] = await db.select().from(searchRankingSettings).limit(1);
    if (!row) {
      return jsonOk({
        settings: responseFromWeights(SETTINGS_ID, DEFAULT_RANKING_WEIGHTS, new Date()),
        seeded: false,
      });
    }
    return jsonOk({
      settings: responseFromWeights(row.id, rowToWeights(row), row.updatedAt),
      seeded: true,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    return jsonError("Failed to load search ranking settings", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(["admin"]);
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const [existing] = await db.select().from(searchRankingSettings).limit(1);
    const base: RankingWeights = existing ? rowToWeights(existing) : { ...DEFAULT_RANKING_WEIGHTS };
    const patch: Partial<RankingWeights> = {};
    for (const k of RANKING_WEIGHT_KEYS) {
      const v = parsed.data[k];
      if (v !== undefined) patch[k] = v;
    }
    const merged = mergeWeightPatch(base, patch);
    const rowVals = weightsToRowValues(merged);
    const now = new Date();

    if (existing) {
      await db
        .update(searchRankingSettings)
        .set({ ...rowVals, updatedAt: now })
        .where(eq(searchRankingSettings.id, existing.id));
    } else {
      await db.insert(searchRankingSettings).values({
        id: SETTINGS_ID,
        ...rowVals,
      });
    }

    const [updated] = await db.select().from(searchRankingSettings).limit(1);
    if (!updated) return jsonError("Save failed", 500);
    return jsonOk({ settings: responseFromWeights(updated.id, rowToWeights(updated), updated.updatedAt) });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    console.error("[PATCH /api/admin/search-ranking]", e);
    return jsonError("Failed to save settings", 500);
  }
}
