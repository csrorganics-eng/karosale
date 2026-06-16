import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import type { Metadata } from "next";
import { seoTranslations } from "@/lib/seo/translations";
import { buildAlternateUrls } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteOrigin } from "@/lib/seo/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const path = "/categories";
  const title = `Shop by category — ${seoTranslations.en.siteName}`;
  const description = seoTranslations.en.shopDescription;
  return {
    title,
    description,
    alternates: buildAlternateUrls(path, ["en-IN", "hi-IN", "x-default"]),
    robots: { index: true, follow: true },
    openGraph: { url: `${getSiteOrigin()}${path}`, title, description },
  };
}

export default async function CategoriesIndexPage() {
  const cats = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder);

  const origin = getSiteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Product categories",
    numberOfItems: cats.length,
    itemListElement: cats.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `${origin}/categories/${c.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={schema} />
      <h1 className="font-display text-3xl font-bold text-text-primary">Browse categories</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        Explore certified organic collections. Each category page lists live SKUs with filters and PDP links.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <li key={c.id}>
            <Link
              href={`/categories/${c.slug}`}
              className="block rounded-xl border border-border/80 bg-surface-subtle px-4 py-3 text-sm font-medium text-text-primary shadow-sm transition hover:border-primary/30"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
