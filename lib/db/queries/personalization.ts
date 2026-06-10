import { and, desc, eq, inArray, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  orderItems,
  orders,
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
      promotionalDiscountPct: products.promotionalDiscountPct,
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

const EXCLUDED_ORDER_STATUSES = ["cancelled", "returned", "refunded"] as const;

/** Categories weighted by purchased qty (non-cancelled / returned / refunded orders). */
export async function getPurchaseAffinityProductIds(
  userId: string,
  excludeIds: string[],
  limit: number,
): Promise<string[]> {
  if (limit <= 0) return [];

  const lines = await db
    .select({
      categoryId: products.categoryId,
      qty: orderItems.qty,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(
      and(
        eq(orders.userId, userId),
        notInArray(orders.status, [...EXCLUDED_ORDER_STATUSES]),
      ),
    );

  if (lines.length === 0) return [];

  const weight = new Map<string, number>();
  for (const row of lines) {
    weight.set(row.categoryId, (weight.get(row.categoryId) ?? 0) + row.qty);
  }
  const topCats = [...weight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  if (topCats.length === 0) return [];

  const exclude = new Set(excludeIds);
  const whereParts = [
    inArray(products.categoryId, topCats),
    eq(products.isActive, true),
    isNull(products.deletedAt),
    sql`${products.stockQty} > 0`,
  ];
  if (excludeIds.length > 0) {
    whereParts.push(notInArray(products.id, excludeIds));
  }

  const candidates = await db
    .select({ id: products.id })
    .from(products)
    .where(and(...whereParts))
    .orderBy(desc(products.isFeatured), desc(products.totalSales), desc(products.createdAt))
    .limit(Math.min(48, limit * 8));

  const ids: string[] = [];
  for (const row of candidates) {
    if (exclude.has(row.id)) continue;
    exclude.add(row.id);
    ids.push(row.id);
    if (ids.length >= limit) break;
  }
  return ids;
}

export type PersonalProductCard = Awaited<ReturnType<typeof getProductsByIdsForCards>>[number];

export type PersonalizedPick = {
  card: PersonalProductCard;
  source: "recent" | "affinity";
};

/** Merges recent product views with “same category as your orders” picks for the home rail. */
export async function getPersonalizedPicksWithSources(
  userId: string,
  maxTotal = 8,
): Promise<PersonalizedPick[]> {
  const viewCap = Math.min(4, maxTotal);
  const viewIds = await getContinueShoppingProductIds(userId, viewCap);
  const need = maxTotal - viewIds.length;
  const purchaseIds =
    need > 0 ? await getPurchaseAffinityProductIds(userId, viewIds, need) : [];
  const mergedIds = [...viewIds, ...purchaseIds];
  if (mergedIds.length === 0) return [];

  const rows = await getProductsByIdsForCards(mergedIds);
  const ordered = orderProductsByIdList(rows, mergedIds);
  const viewSet = new Set(viewIds);
  return ordered.map((card) => ({
    card,
    source: viewSet.has(card.id) ? "recent" : "affinity",
  }));
}
