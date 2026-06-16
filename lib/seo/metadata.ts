import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/brand";
import { getSiteOrigin } from "@/lib/seo/site-config";
import { seoTranslations } from "@/lib/seo/translations";
import type { BlogPost, CategoryRow, ProductRow, VendorRow } from "@/lib/seo/types";
import { buildProductTitle, extractKeywords, truncateDescription } from "@/lib/seo/utils";

const TITLE_SUFFIX = ` | ${seoTranslations.en.siteName}`;

const defaultOg = process.env.NEXT_PUBLIC_OG_DEFAULT_IMAGE?.trim();

type OgImageDescriptor = { url: string; width: number; height: number; alt: string };

function ogImage(params: {
  title: string;
  description?: string;
  image?: string;
  type?: string;
}): OgImageDescriptor[] {
  const origin = getSiteOrigin();
  const u = new URL("/og", origin);
  u.searchParams.set("title", params.title.slice(0, 200));
  if (params.description) u.searchParams.set("description", params.description.slice(0, 280));
  if (params.image) u.searchParams.set("image", params.image);
  u.searchParams.set("type", params.type ?? "default");
  return [
    {
      url: u.toString(),
      width: 1200,
      height: 630,
      alt: params.title,
    },
  ];
}

export function buildCanonicalUrl(path: string): string {
  const origin = getSiteOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  const normalized = p.replace(/\/+$/, "") || "/";
  return `${origin}${normalized === "/" ? "" : normalized}`;
}

export function buildAlternateUrls(
  path: string,
  locales: string[],
): NonNullable<Metadata["alternates"]> {
  const canonical = buildCanonicalUrl(path);
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    if (loc === "x-default") languages["x-default"] = canonical;
    else languages[loc] = canonical;
  }
  return { canonical, languages };
}

function baseRobots(index: boolean): Metadata["robots"] {
  return {
    index,
    follow: true,
    googleBot: {
      index,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

function siteVerification(): Metadata["verification"] | undefined {
  const google = process.env.NEXT_PUBLIC_GSC_VERIFICATION?.trim();
  const bing = process.env.NEXT_PUBLIC_BING_VERIFICATION?.trim();
  if (!google && !bing) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}

export function rootMetadataExtras(): Partial<Metadata> {
  const origin = getSiteOrigin();
  const canonical = `${origin}/`;
  const ogDefault = defaultOg
    ? [{ url: defaultOg, width: 1200, height: 630, alt: BRAND_NAME }]
    : ogImage({ title: seoTranslations.en.homeTitle, type: "default" });
  const verification = siteVerification();

  return {
    metadataBase: new URL(`${origin}/`),
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "en_IN",
      alternateLocale: ["hi_IN"],
      siteName: seoTranslations.en.siteName,
      url: canonical,
      images: ogDefault,
    },
    twitter: {
      card: "summary_large_image",
      site: process.env.NEXT_PUBLIC_TWITTER_SITE?.trim() || "@csrorganics",
      creator: process.env.NEXT_PUBLIC_TWITTER_CREATOR?.trim() || "@csrorganics",
    },
    robots: baseRobots(true),
    ...(verification ? { verification } : {}),
    authors: [{ name: `${BRAND_NAME} Editorial`, url: origin }],
    creator: BRAND_NAME,
    publisher: BRAND_NAME,
    keywords: [
      "organic food India",
      "certified organic online",
      "NPOP organic",
      "ayurvedic products India",
      "farm fresh organic",
      "MSME artisan India",
      "organic grocery delivery",
      "CSR Organics",
      "Karosale",
    ],
  };
}

export function generateProductMetadata(input: {
  product: ProductRow;
  category: CategoryRow | null;
  imageUrls: string[];
  vendorName?: string | null;
}): Metadata {
  const { product, category, imageUrls, vendorName } = input;
  const path = `/shop/${product.slug}`;
  const canonical = buildCanonicalUrl(path);
  const titleBase = buildProductTitle(product, vendorName ?? category?.name ?? null);
  const title = `${titleBase}${TITLE_SUFFIX}`;
  const rawDesc =
    product.metaDescription?.trim() ||
    product.shortDescription ||
    `${product.name} — ${category?.name ?? "organic"} · Certified marketplace · INR ${product.price}`;
  const description = truncateDescription(rawDesc, 160);
  const primaryImage = imageUrls[0];
  const ogImgs = ogImage({
    title: titleBase,
    description,
    image: primaryImage,
    type: "product",
  });

  return {
    title,
    description,
    keywords: extractKeywords(product),
    alternates: buildAlternateUrls(path, ["en-IN", "hi-IN", "x-default"]),
    robots: baseRobots(true),
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      siteName: seoTranslations.en.siteName,
      locale: "en_IN",
      images: ogImgs,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImgs.map((img) => img.url),
    },
    other: {
      "product:price:amount": String(product.price),
      "product:price:currency": "INR",
    },
  };
}

export function generateCategoryMetadata(input: {
  category: CategoryRow;
  productCount: number;
}): Metadata {
  const { category, productCount } = input;
  const path = `/categories/${category.slug}`;
  const canonical = buildCanonicalUrl(path);
  const title = `${category.name} — ${seoTranslations.en.categoryTitleSuffix}`;
  const raw =
    category.metaDescription?.trim() ||
    category.description ||
    `Buy ${category.name} online in India. ${productCount}+ certified organic listings with PAN-India delivery.`;
  const description = truncateDescription(raw, 160);
  return {
    title,
    description,
    alternates: buildAlternateUrls(path, ["en-IN", "hi-IN", "x-default"]),
    robots: baseRobots(true),
    openGraph: {
      url: canonical,
      title,
      description,
      siteName: seoTranslations.en.siteName,
      locale: "en_IN",
      images: ogImage({
        title: category.name,
        description,
        image: category.imageUrl ?? undefined,
        type: "category",
      }),
    },
    twitter: { card: "summary_large_image", title, description },
    keywords: [
      `${category.name} organic India`,
      "buy organic online",
      "certified organic",
      category.slug.replace(/-/g, " "),
    ],
  };
}

export function generateBrandMetadata(vendor: VendorRow): Metadata {
  const path = `/brands/${vendor.slug}`;
  const canonical = buildCanonicalUrl(path);
  const title = `${vendor.businessName} — ${seoTranslations.en.brandTitleSuffix}`;
  const raw =
    vendor.description?.trim() ||
    `${vendor.businessName} on ${BRAND_NAME} — curated organic and natural products from verified sellers.`;
  const description = truncateDescription(raw, 160);
  return {
    title,
    description,
    alternates: buildAlternateUrls(path, ["en-IN", "hi-IN", "x-default"]),
    robots: baseRobots(true),
    openGraph: {
      url: canonical,
      title,
      description,
      siteName: seoTranslations.en.siteName,
      locale: "en_IN",
      images: ogImage({
        title: vendor.businessName,
        description,
        image: vendor.logoUrl ?? undefined,
        type: "default",
      }),
    },
    twitter: { card: "summary_large_image", title, description },
    keywords: [vendor.businessName, "organic brand India", "verified seller", vendor.slug.replace(/-/g, " ")],
  };
}

export function generateBlogMetadata(post: BlogPost): Metadata {
  const path = `/blog/${post.slug}`;
  const canonical = buildCanonicalUrl(path);
  const title = `${post.title}${TITLE_SUFFIX}`;
  const description = truncateDescription(post.description, 160);
  return {
    title,
    description,
    keywords: post.tags,
    alternates: buildAlternateUrls(path, ["en-IN", "hi-IN", "x-default"]),
    robots: baseRobots(true),
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [BRAND_NAME],
      tags: post.tags,
      siteName: seoTranslations.en.siteName,
      locale: "en_IN",
      images: ogImage({
        title: post.title,
        description,
        image: post.heroImageUrl,
        type: "blog",
      }),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function generateSearchMetadata(query: string, count: number): Metadata {
  const q = query.trim();
  const indexable = q.length > 0 && count >= 3;
  const path = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
  const canonical = buildCanonicalUrl(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  const title = q
    ? `"${q}" ${seoTranslations.en.searchTitleSuffix}`
    : `Search organic products${TITLE_SUFFIX}`;
  const description = q
    ? truncateDescription(`Found ${count} organic products for “${q}” on ${BRAND_NAME}.`, 160)
    : "Search certified organic groceries and wellness products on CSR Organics.";
  return {
    title,
    description,
    alternates: { canonical },
    robots: baseRobots(indexable),
    openGraph: {
      url: canonical,
      title,
      description,
      siteName: seoTranslations.en.siteName,
      locale: "en_IN",
      images: ogImage({ title, description, type: "default" }),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function productNotFoundMetadata(): Metadata {
  return {
    title: `Product not found${TITLE_SUFFIX}`,
    description: "This product is unavailable or the link may be outdated.",
    robots: baseRobots(false),
  };
}
