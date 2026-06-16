import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVendorBySlug } from "@/lib/db/queries/vendors-public";
import { listProductCardsByVendor } from "@/lib/db/queries/products";
import { ProductCard } from "@/components/storefront/ProductCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateBrandMetadata } from "@/lib/seo/metadata";
import { generateBrandStoreSchema } from "@/lib/seo/structured-data";
import { getSiteOrigin } from "@/lib/seo/site-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Brand not found", robots: { index: false, follow: true } };
  return generateBrandMetadata(vendor);
}

export default async function BrandDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();

  const items = await listProductCardsByVendor(vendor.id, 48);
  const origin = getSiteOrigin();
  const url = `${origin}/brands/${vendor.slug}`;
  const orgSchema = generateBrandStoreSchema(vendor, url);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <JsonLd data={orgSchema as unknown as Record<string, unknown>} />
      <nav className="mb-6 text-sm text-text-secondary">
        <Link href="/">Home</Link>
        {" / "}
        <Link href="/brands">Brands</Link>
        {" / "}
        <span className="text-text-primary">{vendor.businessName}</span>
      </nav>
      <h1 className="font-display text-3xl font-bold text-text-primary">{vendor.businessName}</h1>
      {vendor.description ? (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-secondary">{vendor.description}</p>
      ) : null}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>
      {items.length === 0 ? (
        <p className="mt-10 text-sm text-text-secondary">
          No live listings for this partner yet.{" "}
          <Link href="/shop" className="font-medium text-primary underline-offset-4 hover:underline">
            Browse the full shop
          </Link>
        </p>
      ) : null}
    </div>
  );
}
