import Link from "next/link";
import type { Metadata } from "next";
import { STATIC_BLOG_POSTS } from "@/lib/blog-static";
import { seoTranslations } from "@/lib/seo/translations";
import { buildAlternateUrls } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteOrigin } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: seoTranslations.en.blogTitle,
  description: seoTranslations.en.blogDescription,
  alternates: buildAlternateUrls("/blog", ["en-IN", "hi-IN", "x-default"]),
  robots: { index: true, follow: true },
  openGraph: {
    url: `${getSiteOrigin()}/blog`,
    title: seoTranslations.en.blogTitle,
    description: seoTranslations.en.blogDescription,
  },
};

export default function BlogIndexPage() {
  const origin = getSiteOrigin();
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Editorial articles",
    numberOfItems: STATIC_BLOG_POSTS.length,
    itemListElement: STATIC_BLOG_POSTS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.title,
      url: `${origin}/blog/${p.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd data={schema} />
      <h1 className="font-display text-3xl font-bold text-text-primary">Journal</h1>
      <p className="mt-2 text-sm text-text-secondary">{seoTranslations.en.blogDescription}</p>
      <ul className="mt-8 space-y-4">
        {STATIC_BLOG_POSTS.map((p) => (
          <li key={p.slug} className="rounded-xl border border-border/80 bg-surface-subtle p-4">
            <Link href={`/blog/${p.slug}`} className="text-lg font-semibold text-primary hover:underline">
              {p.title}
            </Link>
            <p className="mt-1 text-sm text-text-secondary">{p.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
