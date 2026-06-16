import type {
  Article,
  BreadcrumbList,
  CollectionPage,
  FAQPage,
  ItemList,
  LocalBusiness,
  Offer,
  Organization,
  Product,
  WebSite,
  WithContext,
} from "schema-dts";
import { BRAND_NAME } from "@/lib/brand";
import { getSiteOrigin } from "@/lib/seo/site-config";
import type { BlogPost, BreadcrumbItem, CategoryRow, ProductRow, SeoAuthor, SeoFaq, SeoReview, VendorRow } from "@/lib/seo/types";

function orgId(): string {
  return `${getSiteOrigin()}/#organization`;
}

export function generateOrganizationSchema(): WithContext<Organization> {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": orgId(),
    name: BRAND_NAME,
    url: origin,
    logo: `${origin}/brand/csrorganics-logo.webp`,
    sameAs: ["https://csrorganics.com"],
    description:
      "Indian B2B2C organic marketplace connecting certified organic farmers, MSMEs, and conscious consumers.",
  };
}

export function generateWebSiteSchema(): WithContext<WebSite> {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: BRAND_NAME,
    url: origin,
    publisher: { "@id": orgId() },
    inLanguage: ["en-IN", "hi-IN"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    } as WebSite["potentialAction"],
  };
}

function certificationProperties(
  product: ProductRow,
): Array<{ "@type": "PropertyValue"; name: string; value: string }> {
  const props: Array<{ "@type": "PropertyValue"; name: string; value: string }> = [];
  if (product.isOrganicCertified) {
    props.push({ "@type": "PropertyValue", name: "Organic", value: "Certified organic" });
  }
  const c = product.certificationType;
  if (c === "npop") props.push({ "@type": "PropertyValue", name: "Certification", value: "NPOP (India)" });
  if (c === "india_organic")
    props.push({ "@type": "PropertyValue", name: "Certification", value: "India Organic" });
  if (c === "fssai") props.push({ "@type": "PropertyValue", name: "Certification", value: "FSSAI" });
  if (c === "other") props.push({ "@type": "PropertyValue", name: "Certification", value: "Third-party certified" });
  return props;
}

function productAvailability(product: ProductRow): Offer["availability"] {
  if (!product.isActive) return "https://schema.org/Discontinued" as const;
  if (product.stockQty > 0) return "https://schema.org/InStock" as const;
  return "https://schema.org/OutOfStock" as const;
}

function truncatePlain(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function generateProductSchema(
  product: ProductRow,
  options: {
    categoryName: string | null;
    imageUrls: string[];
    productUrl: string;
    brandName?: string | null;
  },
): WithContext<Product> {
  const price = Number.parseFloat(String(product.price));
  const images = options.imageUrls.filter(Boolean);
  const offer: Offer = {
    "@type": "Offer",
    priceCurrency: "INR",
    price,
    availability: productAvailability(product),
    url: options.productUrl,
    seller: { "@id": orgId() },
  };

  const aggregateRating =
    product.reviewCount >= 3 && Number(product.avgRating) > 0
      ? {
          "@type": "AggregateRating" as const,
          ratingValue: Number.parseFloat(String(product.avgRating)),
          reviewCount: product.reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  const extra: Record<string, unknown> = {};
  if (aggregateRating) extra.aggregateRating = aggregateRating;

  const gtin = product.barcode?.replace(/\D/g, "");
  if (gtin && gtin.length === 13) extra.gtin13 = gtin;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: truncatePlain(product.shortDescription || product.description, 5000),
    sku: product.sku,
    image: images.length ? images : undefined,
    category: options.categoryName ?? undefined,
    brand: options.brandName
      ? { "@type": "Brand", name: options.brandName }
      : { "@type": "Brand", name: BRAND_NAME },
    manufacturer: { "@id": orgId() },
    countryOfOrigin: "IN",
    additionalProperty: certificationProperties(product),
    offers: offer,
    ...extra,
  } as WithContext<Product>;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem" as const,
      position: i + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

export function generateArticleSchema(post: BlogPost, author: SeoAuthor): WithContext<Article> {
  const origin = getSiteOrigin();
  const wordCount = post.bodyText.split(/\s+/).filter(Boolean).length;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: post.heroImageUrl ? [post.heroImageUrl] : undefined,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: author.name,
      url: author.url,
    },
    publisher: { "@id": orgId() },
    mainEntityOfPage: `${origin}/blog/${post.slug}`,
    keywords: post.tags.join(", "),
    inLanguage: "en-IN",
    wordCount,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["article h1", "article h2"],
    },
  } as WithContext<Article>;
}

export function generateFAQSchema(faqs: SeoFaq[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function generateLocalBusinessSchema(): WithContext<LocalBusiness> {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${origin}/#localbusiness`,
    name: BRAND_NAME,
    image: `${origin}/brand/csrorganics-logo.webp`,
    url: origin,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: [process.env.BUSINESS_ADDRESS_LINE1, process.env.BUSINESS_ADDRESS_LINE2]
        .filter(Boolean)
        .join(", "),
      addressLocality: "Kochi",
      addressRegion: "Kerala",
      postalCode: "682024",
      addressCountry: process.env.BUSINESS_ADDRESS_COUNTRY || "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 9.9816,
      longitude: 76.2999,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  } as WithContext<LocalBusiness>;
}

export function generateItemListSchema(
  products: Array<{ name: string; slug: string }>,
  listName: string,
): WithContext<ItemList> {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem" as const,
      position: i + 1,
      name: p.name,
      url: `${origin}/shop/${p.slug}`,
    })),
  };
}

export function generateCollectionPageSchema(
  category: CategoryRow,
  products: Array<{ name: string; slug: string }>,
  categoryUrl: string,
): WithContext<CollectionPage> {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description ?? category.metaDescription ?? undefined,
    url: categoryUrl,
    isPartOf: { "@id": `${origin}/#website` },
    numberOfItems: products.length,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem" as const,
        position: i + 1,
        name: p.name,
        url: `${origin}/shop/${p.slug}`,
      })),
    },
  } as WithContext<CollectionPage>;
}

export function generateProductReviewNodes(reviews: SeoReview[]): unknown[] {
  return reviews.slice(0, 12).map((r) => ({
    "@type": "Review",
    reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    author: { "@type": "Person", name: r.authorName || "Verified buyer" },
    datePublished: r.datePublished.toISOString(),
    reviewBody: r.body,
    name: r.title || `Rated ${r.rating}/5`,
  }));
}

export function generateBrandStoreSchema(vendor: VendorRow, vendorUrl: string): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: vendor.businessName,
    url: vendorUrl,
    logo: vendor.logoUrl || undefined,
    description: vendor.description || undefined,
    sameAs: vendor.website ? [vendor.website] : undefined,
  };
}
