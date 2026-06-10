import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Leaf, Tag } from "lucide-react";
import { getProductBySlug } from "@/lib/db/queries/products";
import { Badge } from "@/components/ui/badge";
import { formatINR, cn } from "@/lib/utils";
import { getProductOfferDisplay } from "@/lib/merchandising/product-offer-display";
import { AddToCartSection } from "@/components/storefront/AddToCartSection";
import { ProductViewBeacon } from "@/components/storefront/ProductViewBeacon";
import { SubscribeSection } from "@/components/storefront/SubscribeSection";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) return { title: "Product Not Found" };
  return {
    title: data.product.metaTitle ?? data.product.name,
    description: data.product.metaDescription ?? data.product.shortDescription,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProductBySlug(slug);
  if (!data) notFound();

  const { product, images, category } = data;
  const primaryImage = images.find((i) => i.isPrimary) ?? images[0];
  const price = parseFloat(product.price);
  const { mrp, salePct } = getProductOfferDisplay(
    price,
    product.comparePrice,
    product.promotionalDiscountPct,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ProductViewBeacon productId={product.id} />
      <nav className="mb-6 text-sm text-text-secondary">
        <Link href="/">Home</Link>
        {" / "}
        <Link href={`/shop?category=${category?.slug}`}>{category?.name}</Link>
        {" / "}
        <span className="text-text-primary">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-[length:var(--radius-card)] border border-border bg-surface-subtle shadow-[var(--shadow-soft)]">
          {primaryImage?.url ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText ?? product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-8xl">🌿</div>
          )}
          {salePct != null && salePct > 0 && (
            <div className="pointer-events-none absolute left-4 top-4 z-10">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg",
                  "bg-gradient-to-br from-[#c41e3a] via-[#d32f2f] to-[#9a0007] ring-2 ring-white/30",
                )}
              >
                <Tag className="h-4 w-4" aria-hidden />
                {salePct}% off
              </span>
            </div>
          )}
          {product.isOrganicCertified && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-4 pb-4 pt-14">
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-950/80 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-50 shadow-md ring-1 ring-emerald-400/25 backdrop-blur-md">
                <Leaf className="h-4 w-4 text-emerald-300" strokeWidth={2.5} aria-hidden />
                Certified organic
              </span>
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.isBestseller && (
              <Badge variant="warning" className="text-xs font-semibold uppercase tracking-wide">
                Bestseller
              </Badge>
            )}
            {product.isOrganicCertified && (
              <Badge variant="success" className="text-xs font-semibold uppercase tracking-wide">
                Organic
              </Badge>
            )}
          </div>
          <h1 className="font-display mt-3 text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">SKU: {product.sku}</p>

          <div className="mt-6 rounded-2xl border border-border/80 bg-surface-subtle/80 p-5 shadow-inner">
            <div className="flex flex-wrap items-end gap-3 gap-y-1">
              <span className="font-mono text-3xl font-bold tabular-nums tracking-tight text-primary md:text-4xl">
                {formatINR(price)}
              </span>
              {mrp != null && (
                <div className="flex flex-col">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">MRP</span>
                  <span className="text-lg font-medium tabular-nums text-text-secondary line-through decoration-text-secondary/50">
                    {formatINR(mrp)}
                  </span>
                </div>
              )}
            </div>
            {salePct != null && salePct > 0 && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600/10 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-600/15">
                <span className="tabular-nums">Save {salePct}%</span>
                <span className="font-normal text-emerald-800/80">
                  {mrp != null ? "vs list price" : "limited time"}
                </span>
              </p>
            )}
            <p className="mt-3 text-xs text-text-secondary">Inclusive of all taxes</p>
          </div>

          <p className="mt-6 leading-relaxed text-text-secondary">{product.shortDescription}</p>

          <AddToCartSection productId={product.id} stockQty={product.stockQty} price={product.price} />

          <SubscribeSection
            productId={product.id}
            productName={product.name}
            eligible={product.isSubscriptionEligible}
            subscriptionDiscountPct={
              product.subscriptionDiscountPct != null
                ? String(product.subscriptionDiscountPct)
                : null
            }
          />

          <div className="mt-10 prose prose-sm max-w-none text-text-secondary">
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        </div>
      </div>
    </div>
  );
}
