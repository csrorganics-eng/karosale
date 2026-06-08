import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  pageViews,
  productImages,
  products,
} from "@/lib/db/schema";

/** Last N distinct products this user viewed (most recent first). */
export async function getContinueShoppingProductIds(userId: string, limit = 4): Promise<string[]> {
  const rows = await db
    .select({ productId: pageViews.productId, createdAt: pageViews.createdAt })
    .from(pageViews)
    .where(and(eq(pageViews.userId, userId), isNotNull(pageViews.productId)))
    .orderBy(desc(pageViews.createdAt))
    .limit(40);

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const r of rows) {
    const pid = r.productId!;
    if (seen.has(pid)) continue;
    seen.add(pid);
    ids.push(pid);
    if (ids.length >= limit) break;
  }
  return ids;
}

export async function getProductsByIdsForCards(productIds: string[]) {
  if (productIds.length === 0) return [];
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      comparePrice: products.comparePrice,
      stockQty: products.stockQty,
      lowStockThreshold: products.lowStockThreshold,
      isOrganicCertified: products.isOrganicCertified,
      isBestseller: products.isBestseller,
      avgRating: products.avgRating,
      reviewCount: products.reviewCount,
      imageUrl: productImages.url,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)),
    )
    .where(
      and(
        inArray(products.id, productIds),
        eq(products.isActive, true),
        isNull(products.deletedAt),
      ),
    );
}

/** Preserve caller order of `productIds` for UI. */
export function orderProductsByIdList<T extends { id: string }>(
  rows: T[],
  productIds: string[],
): T[] {
  const map = new Map(rows.map((r) => [r.id, r]));
  return productIds.map((id) => map.get(id)).filter(Boolean) as T[];
}
