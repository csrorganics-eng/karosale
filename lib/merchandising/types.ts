/** Search relevance weights (shop + typeahead). Tunable in admin; A/B variants merge partial patches. */
export type RankingWeights = {
  matchNameWeight: number;
  matchDescWeight: number;
  matchSkuWeight: number;
  salesLogCoef: number;
  ratingCoef: number;
  reviewCountCoef: number;
  featuredBonus: number;
  bestsellerBonus: number;
  inStockBonus: number;
};

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  matchNameWeight: 100,
  matchDescWeight: 40,
  matchSkuWeight: 80,
  salesLogCoef: 15,
  ratingCoef: 25,
  reviewCountCoef: 0.5,
  featuredBonus: 50,
  bestsellerBonus: 30,
  inStockBonus: 10,
};

export type RankingWeightPatch = Partial<RankingWeights>;

export type ShopperSegment = "guest" | "customer" | "returning";

export const RANKING_WEIGHT_KEYS = [
  "matchNameWeight",
  "matchDescWeight",
  "matchSkuWeight",
  "salesLogCoef",
  "ratingCoef",
  "reviewCountCoef",
  "featuredBonus",
  "bestsellerBonus",
  "inStockBonus",
] as const satisfies readonly (keyof RankingWeights)[];
