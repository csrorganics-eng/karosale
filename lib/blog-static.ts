import type { BlogPost } from "@/lib/seo/types";

const now = () => new Date();

/** Curated editorial posts until a CMS table is wired (see `docs/SEO-IMPLEMENTATION.md`). */
export const STATIC_BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-certified-organic-matters-india",
    title: "Why certified organic matters for Indian households",
    description:
      "NPOP, supply chains, and what to look for when you buy organic groceries online in India — in plain language.",
    bodyText: `
# Why certified organic matters

India's National Programme for Organic Production (NPOP) helps ensure traceability from farm to shelf.

When you shop on CSR Organics, look for clear certification cues on packshots and product detail pages.

## Practical tips

- Prefer single-ingredient staples with transparent origins.
- Compare unit prices and delivery timelines for your pincode.
- Read ingredient lists even on "natural" positioning claims.
    `.trim(),
    publishedAt: new Date("2025-11-01T00:00:00.000Z"),
    updatedAt: now(),
    tags: ["organic India", "NPOP", "groceries", "wellness"],
    heroImageUrl: undefined,
  },
  {
    slug: "monsoon-pantry-organic-checklist",
    title: "Monsoon pantry checklist: organic staples that store well",
    description:
      "A practical checklist for pulses, millets, and spices to keep your kitchen monsoon-ready without waste.",
    bodyText: `
# Monsoon pantry checklist

Humidity changes how staples behave in the kitchen. Keep airtight containers, label purchase dates, and rotate stock weekly.

## Staples to consider

- Whole pulses and split dals with intact packaging.
- Whole spices you can dry-roast as needed.
- Unrefined salts and natural sweeteners in sealed jars.
    `.trim(),
    publishedAt: new Date("2025-12-10T00:00:00.000Z"),
    updatedAt: now(),
    tags: ["pantry", "monsoon", "organic staples"],
    heroImageUrl: undefined,
  },
];

export function getStaticBlogPost(slug: string): BlogPost | undefined {
  return STATIC_BLOG_POSTS.find((p) => p.slug === slug);
}
