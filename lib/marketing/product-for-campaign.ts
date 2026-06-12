import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";

export type ProductForMarketing = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  primaryImageUrl: string | null;
  imageUrls: string[];
};

export async function getProductForMarketing(productId: string): Promise<ProductForMarketing | null> {
  const [p] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .limit(1);
  if (!p) return null;

  const imgs = await db
    .select({ url: productImages.url, isPrimary: productImages.isPrimary, sortOrder: productImages.sortOrder })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder), asc(productImages.url));

  const urls = imgs.map((r) => r.url).filter(Boolean);
  const primary = imgs.find((r) => r.isPrimary)?.url ?? urls[0] ?? null;

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    description: p.description,
    primaryImageUrl: primary,
    imageUrls: urls,
  };
}
