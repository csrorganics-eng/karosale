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
import { buildRelevanceScoreSql } from "@/lib/merchandising/relevance-sql";
import { resolveRankingWeightsForRequest } from "@/lib/merchandising/resolve-weights";
import type { RankingWeights } from "@/lib/merchandising/types";
import { DEFAULT_RANKING_WEIGHTS } from "@/lib/merchandising/types";
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
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.shortDescription, `%${search}%`),
        ilike(products.sku, `%${search}%`),
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

  const items =
    sort === "relevance"
      ? await baseQuery()
          .orderBy(desc(buildRelevanceScoreSql(search, weights)), desc(products.id))
          .limit(limit)
          .offset(offset)
      : await baseQuery()
          .orderBy(orderByNonRelevance)
          .limit(limit)
          .offset(offset);

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

export async function searchProducts(term: string, limit = 8, weights?: RankingWeights) {
  const w = weights ?? (await resolveRankingWeightsForRequest().catch(() => DEFAULT_RANKING_WEIGHTS));
  const scoreSql = buildRelevanceScoreSql(term, w);

  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      imageUrl: productImages.url,
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
          ilike(products.name, `%${term}%`),
          ilike(products.sku, `%${term}%`),
        ),
      ),
    )
    .orderBy(desc(scoreSql), desc(products.id))
    .limit(limit);
}
