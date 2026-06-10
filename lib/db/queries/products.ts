import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  productImages,
  products,
} from "@/lib/db/schema";
import { buildRelevanceScoreSql, escapeIlikePatternFragment } from "@/lib/merchandising/relevance-sql";
import { resolveRankingWeightsForRequest } from "@/lib/merchandising/resolve-weights";
import type { RankingWeights } from "@/lib/merchandising/types";
import { DEFAULT_RANKING_WEIGHTS } from "@/lib/merchandising/types";
import { isGeminiConfigured } from "@/lib/gemini";
import { rerankProductIdsByQuery } from "@/lib/search/semantic-rerank";
import { orderProductsByIdList } from "@/lib/db/queries/personalization";
import type { productListQuerySchema } from "@/lib/validations/product";
import type { z } from "zod";

type ProductListQuery = z.infer<typeof productListQuerySchema>;

const productCardSelect = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  shortDescription: products.shortDescription,
  price: products.price,
  comparePrice: products.comparePrice,
  promotionalDiscountPct: products.promotionalDiscountPct,
  stockQty: products.stockQty,
  lowStockThreshold: products.lowStockThreshold,
  isOrganicCertified: products.isOrganicCertified,
  isFeatured: products.isFeatured,
  isBestseller: products.isBestseller,
  avgRating: products.avgRating,
  reviewCount: products.reviewCount,
  categorySlug: categories.slug,
  categoryName: categories.name,
  imageUrl: productImages.url,
} as const;

export async function listProducts(query: ProductListQuery) {
  const { page, limit, category, search, minPrice, maxPrice, isOrganic, inStock, sort } =
    query;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(products.isActive, true),
    isNull(products.deletedAt),
  ];

  if (category) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, category))
      .limit(1);
    if (cat) conditions.push(eq(products.categoryId, cat.id));
  }

  if (search) {
    const pattern = `%${escapeIlikePatternFragment(search)}%`;
    conditions.push(
      or(
        ilike(products.name, pattern),
        ilike(products.shortDescription, pattern),
        ilike(products.sku, pattern),
        ilike(products.description, pattern),
        ilike(products.metaKeywords, pattern),
      )!,
    );
  }

  if (minPrice !== undefined) {
    conditions.push(gte(products.price, String(minPrice)));
  }
  if (maxPrice !== undefined) {
    conditions.push(lte(products.price, String(maxPrice)));
  }
  if (isOrganic) {
    conditions.push(eq(products.isOrganicCertified, true));
  }
  if (inStock) {
    conditions.push(sql`${products.stockQty} > 0`);
  }

  const whereClause = and(...conditions);

  let weights: RankingWeights;
  try {
    weights = await resolveRankingWeightsForRequest();
  } catch {
    weights = { ...DEFAULT_RANKING_WEIGHTS };
  }

  const orderByNonRelevance = (() => {
    switch (sort) {
      case "price_asc":
        return asc(products.price);
      case "price_desc":
        return desc(products.price);
      case "newest":
        return desc(products.createdAt);
      case "rating":
        return desc(products.avgRating);
      case "bestsellers":
        return desc(products.totalSales);
      default:
        return desc(products.isFeatured);
    }
  })();

  const baseQuery = () =>
    db
      .select(productCardSelect)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(
        productImages,
        and(
          eq(productImages.productId, products.id),
          eq(productImages.isPrimary, true),
        ),
      )
      .where(whereClause);

  const SEMANTIC_CANDIDATE_CAP = 64;
  let items: Awaited<ReturnType<typeof baseQuery>>;

  if (
    sort === "relevance" &&
    search?.trim() &&
    page === 1 &&
    isGeminiConfigured()
  ) {
    const rankedRows = await baseQuery()
      .orderBy(desc(buildRelevanceScoreSql(search, weights)), desc(products.id))
      .limit(SEMANTIC_CANDIDATE_CAP);
    if (rankedRows.length > 0) {
      const candidates = rankedRows.map((r) => ({
        id: r.id,
        name: r.name,
        shortDescription: r.shortDescription,
      }));
      const orderedIds = await rerankProductIdsByQuery(search.trim(), candidates);
      items = orderProductsByIdList(rankedRows, orderedIds).slice(offset, offset + limit);
    } else {
      items = [];
    }
  } else if (sort === "relevance") {
    items = await baseQuery()
      .orderBy(desc(buildRelevanceScoreSql(search, weights)), desc(products.id))
      .limit(limit)
      .offset(offset);
  } else {
    items = await baseQuery().orderBy(orderByNonRelevance).limit(limit).offset(offset);
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(whereClause);

  return {
    items,
    total: countResult?.count ?? 0,
    page,
    limit,
  };
}

export async function getProductBySlug(slug: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.slug, slug),
        eq(products.isActive, true),
        isNull(products.deletedAt),
      ),
    )
    .limit(1);

  if (!product) return null;

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(asc(productImages.sortOrder));

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, product.categoryId))
    .limit(1);

  return { product, images, category };
}

export async function searchProducts(
  term: string,
  limit = 8,
  weights?: RankingWeights,
  /** When set, skips Gemini rerank (saves quota — use for shop-chat tool calls). */
  options?: { skipSemanticRerank?: boolean },
) {
  const w = weights ?? (await resolveRankingWeightsForRequest().catch(() => DEFAULT_RANKING_WEIGHTS));
  const scoreSql = buildRelevanceScoreSql(term, w);
  const pattern = `%${escapeIlikePatternFragment(term)}%`;
  const pool = Math.max(limit * 4, 32);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      imageUrl: productImages.url,
      shortDescription: products.shortDescription,
    })
    .from(products)
    .leftJoin(
      productImages,
      and(
        eq(productImages.productId, products.id),
        eq(productImages.isPrimary, true),
      ),
    )
    .where(
      and(
        eq(products.isActive, true),
        isNull(products.deletedAt),
        or(
          ilike(products.name, pattern),
          ilike(products.shortDescription, pattern),
          ilike(products.sku, pattern),
          ilike(products.description, pattern),
          ilike(products.metaKeywords, pattern),
        ),
      ),
    )
    .orderBy(desc(scoreSql), desc(products.id))
    .limit(pool);

  const t = term.trim();
  const skipRerank = options?.skipSemanticRerank === true;
  if (!t || !isGeminiConfigured() || skipRerank) {
    return rows.slice(0, limit).map(({ id, name, slug, price, imageUrl }) => ({
      id,
      name,
      slug,
      price,
      imageUrl,
    }));
  }

  const orderedIds = await rerankProductIdsByQuery(
    t,
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      shortDescription: r.shortDescription,
    })),
  );
  const ordered = orderProductsByIdList(rows, orderedIds).slice(0, limit);
  return ordered.map(({ id, name, slug, price, imageUrl }) => ({
    id,
    name,
    slug,
    price,
    imageUrl,
  }));
}
