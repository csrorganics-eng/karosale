import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, productImages, products } from "@/lib/db/schema";
import { listActiveBundles } from "@/lib/db/queries/bundles";
import { getPublishedHomepageBanner } from "@/lib/db/queries/site-homepage-banner";
import { jsonOk, jsonError } from "@/lib/api-response";

/** Aggregated home feed for native app (single round-trip). */
export async function GET() {
  try {
    const [cats, bestsellers, bundles, banner] = await Promise.all([
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          icon: categories.icon,
          productCount: categories.productCount,
        })
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(categories.sortOrder)
        .limit(8),
      db
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
          and(eq(products.isActive, true), isNull(products.deletedAt), eq(products.isBestseller, true)),
        )
        .orderBy(desc(products.totalSales))
        .limit(8),
      listActiveBundles(4),
      getPublishedHomepageBanner(),
    ]);

    return jsonOk({ categories: cats, bestsellers, bundles, banner });
  } catch (error) {
    console.error("[GET /api/home]", error);
    return jsonError("Failed to load home", 500);
  }
}
