import { sql, type SQL } from "drizzle-orm";
import { products } from "@/lib/db/schema";
import type { RankingWeights } from "@/lib/merchandising/types";

/** Escape `%`, `_`, `\` for use in ILIKE pattern (backslash is default escape in PostgreSQL). */
export function escapeIlikePatternFragment(raw: string): string {
  return raw
    .trim()
    .slice(0, 100)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Composite relevance score: text match bonuses + sales/rating signals + merchandising flags.
 * Higher is better. Used for `sort=relevance` and search typeahead.
 */
export function buildRelevanceScoreSql(searchTerm: string | undefined, w: RankingWeights): SQL {
  const term = searchTerm?.trim();
  const pattern = term ? `%${escapeIlikePatternFragment(term)}%` : null;

  const namePart = pattern
    ? sql`(CASE WHEN ${products.name} ILIKE ${pattern} THEN ${w.matchNameWeight}::double precision ELSE 0 END)`
    : sql`0::double precision`;

  const descPart = pattern
    ? sql`(CASE WHEN ${products.shortDescription} ILIKE ${pattern} THEN ${w.matchDescWeight}::double precision ELSE 0 END)`
    : sql`0::double precision`;

  const skuPart = pattern
    ? sql`(CASE WHEN ${products.sku} ILIKE ${pattern} THEN ${w.matchSkuWeight}::double precision ELSE 0 END)`
    : sql`0::double precision`;

  const salesPart = sql`LN(GREATEST(1, ${products.totalSales}::double precision)) * ${w.salesLogCoef}::double precision`;

  const ratingPart = sql`COALESCE(${products.avgRating}::numeric, 0)::double precision * ${w.ratingCoef}::double precision`;

  const reviewsPart = sql`${products.reviewCount}::double precision * ${w.reviewCountCoef}::double precision`;

  const featuredPart = sql`(CASE WHEN ${products.isFeatured} THEN ${w.featuredBonus}::double precision ELSE 0 END)`;

  const bestsellerPart = sql`(CASE WHEN ${products.isBestseller} THEN ${w.bestsellerBonus}::double precision ELSE 0 END)`;

  const stockPart = sql`(CASE WHEN ${products.stockQty} > 0 THEN ${w.inStockBonus}::double precision ELSE 0 END)`;

  return sql`(
    ${namePart} + ${descPart} + ${skuPart}
    + ${salesPart} + ${ratingPart} + ${reviewsPart}
    + ${featuredPart} + ${bestsellerPart} + ${stockPart}
  )`;
}
