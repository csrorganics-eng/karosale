import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bundleItems, productBundles, products, productImages } from "@/lib/db/schema";

export async function listActiveBundles(limit = 6) {
  const bundles = await db
    .select()
    .from(productBundles)
    .where(eq(productBundles.isActive, true))
    .orderBy(asc(productBundles.sortOrder))
    .limit(limit);

  const out = [];
  for (const b of bundles) {
    const items = await db
      .select({
        productId: bundleItems.productId,
        qty: bundleItems.qty,
        name: products.name,
        slug: products.slug,
        price: products.price,
        imageUrl: productImages.url,
      })
      .from(bundleItems)
      .innerJoin(products, eq(bundleItems.productId, products.id))
      .leftJoin(
        productImages,
        and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)),
      )
      .where(eq(bundleItems.bundleId, b.id));
    out.push({ bundle: b, items });
  }
  return out;
}

export async function getBundleBySlug(slug: string) {
  const [b] = await db
    .select()
    .from(productBundles)
    .where(and(eq(productBundles.slug, slug), eq(productBundles.isActive, true)))
    .limit(1);
  if (!b) return null;
  const items = await db
    .select({
      productId: bundleItems.productId,
      qty: bundleItems.qty,
      name: products.name,
      slug: products.slug,
      price: products.price,
      stockQty: products.stockQty,
      imageUrl: productImages.url,
    })
    .from(bundleItems)
    .innerJoin(products, eq(bundleItems.productId, products.id))
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)),
    )
    .where(eq(bundleItems.bundleId, b.id));
  return { bundle: b, items };
}
