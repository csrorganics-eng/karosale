import type { MetadataRoute } from "next";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://csrorganics.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const productList = await db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(and(eq(products.isActive, true), isNull(products.deletedAt)));

    const categoryList = await db
      .select({ slug: categories.slug, updatedAt: categories.updatedAt })
      .from(categories)
      .where(eq(categories.isActive, true));

    return [
      ...staticRoutes,
      ...categoryList.map((c) => ({
        url: `${base}/shop?category=${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...productList.map((p) => ({
        url: `${base}/shop/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
