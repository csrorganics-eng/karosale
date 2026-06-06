import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { WishlistToggle } from "@/components/storefront/WishlistToggle";

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: string;
  comparePrice?: string | null;
  imageUrl?: string | null;
  avgRating?: string;
  reviewCount?: number;
  stockQty: number;
  lowStockThreshold?: number;
  isOrganicCertified?: boolean;
  isBestseller?: boolean;
  categoryName?: string;
}

export function ProductCard({
  id,
  name,
  slug,
  price,
  comparePrice,
  imageUrl,
  avgRating = "0",
  reviewCount = 0,
  stockQty,
  lowStockThreshold = 10,
  isOrganicCertified,
  isBestseller,
  categoryName,
}: ProductCardProps) {
  const priceNum = parseFloat(price);
  const compareNum = comparePrice ? parseFloat(comparePrice) : null;
  const savings =
    compareNum && compareNum > priceNum
      ? Math.round(((compareNum - priceNum) / compareNum) * 100)
      : null;

  const stockLabel =
    stockQty === 0
      ? { text: "Out of Stock", variant: "destructive" as const }
      : stockQty <= lowStockThreshold
        ? { text: `Low Stock (${stockQty} left)`, variant: "warning" as const }
        : { text: "In Stock", variant: "success" as const };

  return (
    <article className="group flex flex-col overflow-hidden rounded-[14px] border border-border bg-surface shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-medium)]">
      <div className="relative aspect-square overflow-hidden bg-surface-subtle">
        <Link href={`/shop/${slug}`} className="absolute inset-0 block">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover transition-transform duration-320 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">🌿</div>
          )}
        </Link>
        <WishlistToggle
          productId={id}
          className="absolute right-2 top-2 z-20 rounded-full bg-white/90 shadow-sm hover:bg-white"
        />
        {isOrganicCertified && (
          <Badge className="pointer-events-none absolute left-2 top-2 z-10" variant="success">
            Organic
          </Badge>
        )}
        {isBestseller && (
          <Badge className="pointer-events-none absolute right-2 top-12 z-10" variant="warning">
            Bestseller
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {categoryName && (
          <p className="text-xs text-text-secondary">{categoryName}</p>
        )}
        <Link href={`/shop/${slug}`}>
          <h3 className="mt-1 line-clamp-2 font-medium text-text-primary hover:text-primary">
            {name}
          </h3>
        </Link>

        <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>{avgRating}</span>
          <span>({reviewCount})</span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-lg font-semibold text-primary">
            {formatINR(priceNum)}
          </span>
          {compareNum && compareNum > priceNum && (
            <span className="text-sm text-text-secondary line-through">
              {formatINR(compareNum)}
            </span>
          )}
          {savings && (
            <Badge variant="destructive" className="text-[10px]">
              -{savings}%
            </Badge>
          )}
        </div>

        <Badge variant={stockLabel.variant} className="mt-2 w-fit">
          {stockLabel.text}
        </Badge>

        <Button
          className="mt-4 w-full"
          disabled={stockQty === 0}
          asChild={stockQty > 0}
        >
          {stockQty > 0 ? (
            <Link href={`/shop/${slug}`}>Add to Cart</Link>
          ) : (
            <span>Notify Me</span>
          )}
        </Button>
      </div>
    </article>
  );
}
