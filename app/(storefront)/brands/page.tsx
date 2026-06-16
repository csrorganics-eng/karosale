import Link from "next/link";
import type { Metadata } from "next";
import { listActiveVendorsForDirectory } from "@/lib/db/queries/vendors-public";
import { seoTranslations } from "@/lib/seo/translations";
import { buildAlternateUrls } from "@/lib/seo/metadata";
import { getSiteOrigin } from "@/lib/seo/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const path = "/brands";
  const title = `Partner brands — ${seoTranslations.en.siteName}`;
  const description = "Verified sellers and organic-forward brands available on CSR Organics.";
  return {
    title,
    description,
    alternates: buildAlternateUrls(path, ["en-IN", "hi-IN", "x-default"]),
    robots: { index: true, follow: true },
    openGraph: { url: `${getSiteOrigin()}${path}`, title, description },
  };
}

export default async function BrandsIndexPage() {
  const vendors = await listActiveVendorsForDirectory();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-text-primary">Brands &amp; sellers</h1>
      <p className="mt-2 max-w-2xl text-sm text-text-secondary">
        Discover partner storefronts. Each brand page highlights catalog highlights pulled from live inventory.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((v) => (
          <li key={v.slug}>
            <Link
              href={`/brands/${v.slug}`}
              className="block rounded-xl border border-border/80 bg-surface-subtle px-4 py-3 text-sm font-medium text-text-primary shadow-sm transition hover:border-primary/30"
            >
              {v.businessName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
