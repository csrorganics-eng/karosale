import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bundleItems, productBundles, products, productImages } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    const bundles = await db
      .select()
      .from(productBundles)
      .where(eq(productBundles.isActive, true))
      .orderBy(asc(productBundles.sortOrder));

    const out = [];
    for (const b of bundles) {
      const items = await db
        .select({
          productId: bundleItems.productId,
          qty: bundleItems.qty,
          name: products.name,
          slug: products.slug,
          imageUrl: productImages.url,
        })
        .from(bundleItems)
        .innerJoin(products, eq(bundleItems.productId, products.id))
        .leftJoin(
          productImages,
          and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)),
        )
        .where(eq(bundleItems.bundleId, b.id));

      out.push({
        id: b.id,
        name: b.name,
        slug: b.slug,
        description: b.description,
        imageUrl: b.imageUrl,
        price: b.price,
        comparePrice: b.comparePrice,
        items,
      });
    }

    return jsonOk({ bundles: out });
  } catch (e) {
    console.error("[GET /api/bundles]", e);
    return jsonError("Failed to load bundles", 500);
  }
}
