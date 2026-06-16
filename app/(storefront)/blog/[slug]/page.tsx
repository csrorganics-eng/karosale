import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaticBlogPost } from "@/lib/blog-static";
import { generateBlogMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateArticleSchema, generateFAQSchema } from "@/lib/seo/structured-data";
import { getBlogBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const FAQS = [
  {
    question: "Is this medical advice?",
    answer: "No. Articles are for general education. Consult a professional for medical decisions.",
  },
  {
    question: "Where can I shop organic staples?",
    answer: "Browse the CSR Organics shop for live SKUs, pricing, and delivery to your pincode.",
  },
];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getStaticBlogPost(slug);
  if (!post) return { title: "Article not found", robots: { index: false, follow: true } };
  return generateBlogMetadata(post);
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getStaticBlogPost(slug);
  if (!post) notFound();

  const author = { name: "CSR Organics Editorial", url: process.env.NEXT_PUBLIC_APP_URL ?? "https://csrorganics.com" };
  const article = generateArticleSchema(post, author);
  const crumbs = getBlogBreadcrumbs(post);
  const faq = generateFAQSchema(FAQS);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <JsonLd data={article as unknown as Record<string, unknown>} />
      <JsonLd data={faq as unknown as Record<string, unknown>} />
      <Breadcrumbs
        className="mb-6"
        items={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: post.title },
        ]}
        jsonLdItems={crumbs}
      />
      <header>
        <h1 className="font-display text-3xl font-bold text-text-primary">{post.title}</h1>
        <p className="mt-2 text-xs text-text-secondary tabular-nums">
          Updated {post.updatedAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}
        </p>
      </header>
      <div className="mt-8 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
        {post.bodyText}
      </div>
      <section className="mt-12 border-t border-border pt-8" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-xl font-semibold text-text-primary">
          Frequently Asked Questions
        </h2>
        <dl className="mt-4 space-y-4">
          {FAQS.map((f) => (
            <div key={f.question}>
              <dt className="font-medium text-text-primary">{f.question}</dt>
              <dd className="mt-1 text-sm text-text-secondary">{f.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className="mt-10 text-sm">
        <Link href="/blog" className="text-primary underline-offset-4 hover:underline">
          ← All articles
        </Link>
      </p>
    </article>
  );
}
