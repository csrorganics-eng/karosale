import type { RankingWeights, RankingWeightPatch, ShopperSegment } from "@/lib/merchandising/types";
import { RANKING_WEIGHT_KEYS } from "@/lib/merchandising/types";

export function mergeWeightPatch(base: RankingWeights, patch: RankingWeightPatch | null | undefined): RankingWeights {
  if (!patch || typeof patch !== "object") return base;
  const out = { ...base };
  for (const k of RANKING_WEIGHT_KEYS) {
    const v = (patch as Record<string, unknown>)[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = v;
    }
  }
  return out;
}

/** Normalize keys from admin JSON (camelCase or snake_case). */
export function normalizeWeightPatch(raw: unknown): RankingWeightPatch {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const snakeToCamel: Record<string, keyof RankingWeights> = {
    match_name_weight: "matchNameWeight",
    match_desc_weight: "matchDescWeight",
    match_sku_weight: "matchSkuWeight",
    sales_log_coef: "salesLogCoef",
    rating_coef: "ratingCoef",
    review_count_coef: "reviewCountCoef",
    featured_bonus: "featuredBonus",
    bestseller_bonus: "bestsellerBonus",
    in_stock_bonus: "inStockBonus",
  };
  const patch: RankingWeightPatch = {};
  for (const key of RANKING_WEIGHT_KEYS) {
    let v = o[key];
    if (v === undefined) {
      const snake = Object.entries(snakeToCamel).find(([, c]) => c === key)?.[0];
      if (snake) v = o[snake];
    }
    if (typeof v === "number" && Number.isFinite(v)) patch[key] = v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = parseFloat(v);
      if (Number.isFinite(n)) patch[key] = n;
    }
  }
  return patch;
}

export function segmentMatches(filter: string, seg: ShopperSegment): boolean {
  const f = (filter || "all").toLowerCase();
  if (f === "all") return true;
  if (f === "guest") return seg === "guest";
  if (f === "customer") return seg === "customer" || seg === "returning";
  if (f === "returning") return seg === "returning";
  return false;
}
