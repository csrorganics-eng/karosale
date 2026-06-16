import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, productImages, products, vendors } from "@/lib/db/schema";
import { STATIC_BLOG_POSTS } from "@/lib/blog-static";
import { getSiteOrigin } from "@/lib/seo/site-config";

export type SeoAuditProductSample = { id: string; slug: string; name: string };
export type SeoAuditSlugSample = { id: string; slug: string };
export type SeoThinCategory = { slug: string; name: string; productCount: number };
export type SeoDuplicateTitle = { title: string; count: number };

export type SeoAuditReport = {
  generatedAt: string;
  siteOrigin: string;
  counts: {
    activeProducts: number;
    activeCategories: number;
    activeVendors: number;
    staticBlogPosts: number;
  };
  productsMissingMetaDescription: { total: number; samples: SeoAuditProductSample[] };
  productsMissingImages: { total: number; samples: SeoAuditSlugSample[] };
  thinCategories: SeoThinCategory[];
  duplicateMetaTitles: SeoDuplicateTitle[];
  sitemapEstimatedUrls: number;
  score: {
    value: number;
    grade: "excellent" | "good" | "fair" | "needs-work";
  };
};

function computeScore(input: {
  activeProducts: number;
  missingDesc: number;
  missingImg: number;
  thinCats: number;
  dupTitles: number;
}): SeoAuditReport["score"] {
  const { activeProducts, missingDesc, missingImg, thinCats, dupTitles } = input;
  let score = 100;
  if (activeProducts > 0) {
    score -= Math.min(28, (missingDesc / activeProducts) * 100 * 0.28);
    score -= Math.min(28, (missingImg / activeProducts) * 100 * 0.28);
  } else {
    score -= 15;
  }
  score -= Math.min(14, thinCats * 3.5);
  score -= Math.min(10, dupTitles * 2.5);
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const grade =
    value >= 90 ? "excellent" : value >= 75 ? "good" : value >= 55 ? "fair" : "needs-work";
  return { value, grade };
}

/**
 * Full SEO health dataset for admin UI and (optionally) the public audit API.
 */
export async function getSeoAuditReport(): Promise<SeoAuditReport> {
  const siteOrigin = getSiteOrigin();

  const [activeProductsRow] = await db
    .select({ n: count() })
    .from(products)
    .where(and(eq(products.isActive, true), isNull(products.deletedAt)));
  const activeProducts = Number(activeProductsRow?.n ?? 0);

  const [activeCategoriesRow] = await db
    .select({ n: count() })
    .from(categories)
    .where(eq(categories.isActive, true));
  const activeCategories = Number(activeCategoriesRow?.n ?? 0);

  const [activeVendorsRow] = await db
    .select({ n: count() })
    .from(vendors)
    .where(eq(vendors.isActive, true));
  const activeVendors = Number(activeVendorsRow?.n ?? 0);

  const missingMetaDescRows = await db
    .select({ id: products.id, slug: products.slug, name: products.name })
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        isNull(products.deletedAt),
        sql`(trim(coalesce(${products.metaDescription}, '')) = '' and trim(coalesce(${products.shortDescription}, '')) = '')`,
      ),
    )
    .limit(500);

  const missingImagesRows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .where(and(eq(products.isActive, true), isNull(products.deletedAt), isNull(productImages.id)))
    .limit(500);

  const thinCategories = await db
    .select({ slug: categories.slug, name: categories.name, productCount: categories.productCount })
    .from(categories)
    .where(and(eq(categories.isActive, true), sql`${categories.productCount} < 3`))
    .limit(100);

  const duplicateTitleRows = await db
    .select({ title: products.metaTitle, c: count() })
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        isNull(products.deletedAt),
        sql`trim(coalesce(${products.metaTitle}, '')) <> ''`,
      ),
    )
    .groupBy(products.metaTitle)
    .having(sql`count(*)::int > 1`)
    .limit(40);

  const sitemapEstimatedUrls =
    6 + activeProducts + activeCategories + activeVendors + STATIC_BLOG_POSTS.length;

  const dupTitles = duplicateTitleRows.map((r) => ({
    title: r.title ?? "",
    count: Number(r.c),
  }));

  const score = computeScore({
    activeProducts,
    missingDesc: missingMetaDescRows.length,
    missingImg: missingImagesRows.length,
    thinCats: thinCategories.length,
    dupTitles: dupTitles.length,
  });

  return {
    generatedAt: new Date().toISOString(),
    siteOrigin,
    counts: {
      activeProducts,
      activeCategories,
      activeVendors,
      staticBlogPosts: STATIC_BLOG_POSTS.length,
    },
    productsMissingMetaDescription: {
      total: missingMetaDescRows.length,
      samples: missingMetaDescRows.slice(0, 24).map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
      })),
    },
    productsMissingImages: {
      total: missingImagesRows.length,
      samples: missingImagesRows.slice(0, 24).map((r) => ({ id: r.id, slug: r.slug })),
    },
    thinCategories: thinCategories.map((c) => ({
      slug: c.slug,
      name: c.name,
      productCount: c.productCount,
    })),
    duplicateMetaTitles: dupTitles,
    sitemapEstimatedUrls,
    score,
  };
}
