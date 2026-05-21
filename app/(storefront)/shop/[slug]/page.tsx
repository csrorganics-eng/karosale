import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/db/queries/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { AddToCartSection } from "@/components/storefront/AddToCartSection";

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
  const compare = product.comparePrice ? parseFloat(product.comparePrice) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-6 text-sm text-text-secondary">
        <Link href="/">Home</Link>
        {" / "}
        <Link href={`/shop?category=${category?.slug}`}>{category?.name}</Link>
        {" / "}
        <span className="text-text-primary">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-[14px] border border-border bg-surface-subtle">
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
        </div>

        <div>
          {product.isOrganicCertified && (
            <Badge variant="success" className="mb-3">
              Organic Certified
            </Badge>
          )}
          <h1 className="font-display text-3xl font-bold text-text-primary">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">SKU: {product.sku}</p>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold text-primary">
              {formatINR(price)}
            </span>
            {compare && compare > price && (
              <>
                <span className="text-lg text-text-secondary line-through">
                  {formatINR(compare)}
                </span>
                <Badge variant="destructive">
                  Save {Math.round(((compare - price) / compare) * 100)}%
                </Badge>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-text-secondary">Inclusive of all taxes</p>

          <p className="mt-4 text-text-secondary">{product.shortDescription}</p>

          <AddToCartSection
            productId={product.id}
            stockQty={product.stockQty}
            price={product.price}
          />

          <div className="mt-10 prose prose-sm max-w-none text-text-secondary">
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        </div>
      </div>
    </div>
  );
}
