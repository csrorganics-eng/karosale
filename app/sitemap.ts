import type { MetadataRoute } from "next";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, categories } from "@/lib/db/schema";
import { STATIC_BLOG_POSTS } from "@/lib/blog-static";
import { getSiteOrigin } from "@/lib/seo/site-config";
import { listActiveVendorsForDirectory } from "@/lib/db/queries/vendors-public";

export const revalidate = 3600;

function langAlts(path: string): Record<string, string> {
  const origin = getSiteOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${origin}${p}`;
  return {
    en: url,
    "en-IN": url,
    "hi-IN": url,
    "x-default": url,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteOrigin();

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1, alternates: { languages: langAlts("/") } },
    { url: `${base}/shop`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9, alternates: { languages: langAlts("/shop") } },
    { url: `${base}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.75, alternates: { languages: langAlts("/categories") } },
    { url: `${base}/brands`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7, alternates: { languages: langAlts("/brands") } },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.65, alternates: { languages: langAlts("/blog") } },
    { url: `${base}/cart`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2, alternates: { languages: langAlts("/cart") } },
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

    const vendors = await listActiveVendorsForDirectory();

    const blogEntries: MetadataRoute.Sitemap = STATIC_BLOG_POSTS.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: { languages: langAlts(`/blog/${p.slug}`) },
    }));

    const total =
      staticPages.length +
      productList.length +
      categoryList.length +
      vendors.length +
      blogEntries.length;

    if (total > 5000) {
      // Next.js supports sitemap index via generateSitemaps — keep single file until split is required.
      console.warn("[sitemap] URL count exceeds 5000; implement generateSitemaps split.", total);
    }

    return [
      ...staticPages,
      ...categoryList.map((c) => ({
        url: `${base}/categories/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.85,
        alternates: { languages: langAlts(`/categories/${c.slug}`) },
      })),
      ...vendors.map((v) => ({
        url: `${base}/brands/${v.slug}`,
        lastModified: v.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.65,
        alternates: { languages: langAlts(`/brands/${v.slug}`) },
      })),
      ...blogEntries,
      ...productList.map((p) => ({
        url: `${base}/shop/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
        alternates: { languages: langAlts(`/shop/${p.slug}`) },
      })),
    ];
  } catch (e) {
    console.error("[sitemap]", e);
    return staticPages;
  }
}
