import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBundleBySlug } from "@/lib/db/queries/bundles";
import { BackToHome } from "@/components/storefront/BackToHome";
import { formatINR } from "@/lib/utils";
import { AddBundleToCartButton } from "./AddBundleToCartButton";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { truncateDescription } from "@/lib/seo/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getBundleBySlug(slug);
  if (!data) return { title: "Bundle not found", robots: { index: false, follow: true } };
  const { bundle } = data;
  const description = truncateDescription(bundle.description || bundle.name, 160);
  return {
    title: `${bundle.name} | CSR Organics`,
    description,
    alternates: { canonical: buildCanonicalUrl(`/bundles/${slug}`) },
    openGraph: { title: bundle.name, description },
  };
}

export default async function BundleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getBundleBySlug(slug);
  if (!data) notFound();

  const { bundle, items } = data;
  const price = parseFloat(bundle.price);
  const compare = bundle.comparePrice ? parseFloat(bundle.comparePrice) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <BackToHome />
      <h1 className="font-display text-3xl font-bold">{bundle.name}</h1>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-bold text-primary">{formatINR(price)}</span>
        {compare && compare > price && (
          <span className="text-text-secondary line-through">{formatINR(compare)}</span>
        )}
      </div>
      {bundle.imageUrl && (
        <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-[length:var(--radius-card)] border border-border">
          <Image src={bundle.imageUrl} alt="" fill className="object-cover" sizes="100vw" />
        </div>
      )}
      <p className="mt-6 text-text-secondary">{bundle.description}</p>
      <h2 className="mt-8 font-semibold">What&apos;s included</h2>
      <ul className="mt-3 space-y-3">
        {items.map((it) => (
          <li key={it.productId} className="flex gap-3 rounded-lg border border-border bg-surface p-3">
            {it.imageUrl && it.slug ? (
              <Link href={`/shop/${it.slug}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                <Image src={it.imageUrl} alt="" fill className="object-cover" sizes="64px" />
              </Link>
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-md bg-surface-subtle" />
            )}
            <div>
              {it.slug ? (
                <Link href={`/shop/${it.slug}`} className="font-medium hover:underline">
                  {it.name}
                </Link>
              ) : (
                <span className="font-medium">{it.name}</span>
              )}
              <p className="text-sm text-text-secondary">Qty {it.qty}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <AddBundleToCartButton slug={slug} />
      </div>
    </div>
  );
}
