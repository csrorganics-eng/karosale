import Image from "next/image";
import Link from "next/link";
import { Leaf, Star, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, cn } from "@/lib/utils";
import { WishlistToggle } from "@/components/storefront/WishlistToggle";
import { getProductOfferDisplay } from "@/lib/merchandising/product-offer-display";

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: string;
  comparePrice?: string | null;
  /** Admin-set % for sale badge; overrides derived % from MRP when > 0. */
  promotionalDiscountPct?: string | null;
  imageUrl?: string | null;
  avgRating?: string;
  reviewCount?: number;
  stockQty: number;
  lowStockThreshold?: number;
  isOrganicCertified?: boolean;
  isBestseller?: boolean;
  categoryName?: string;
  /** When shown inside “Hand-picked for you”, avoids overlapping corner badges. */
  personalizedContext?: "recent" | "affinity";
}

export function ProductCard({
  id,
  name,
  slug,
  price,
  comparePrice,
  promotionalDiscountPct,
  imageUrl,
  avgRating = "0",
  reviewCount = 0,
  stockQty,
  lowStockThreshold = 10,
  isOrganicCertified,
  isBestseller,
  categoryName,
  personalizedContext,
}: ProductCardProps) {
  const priceNum = parseFloat(price);
  const { mrp, salePct } = getProductOfferDisplay(priceNum, comparePrice, promotionalDiscountPct);

  const stockLabel =
    stockQty === 0
      ? { text: "Out of Stock", variant: "destructive" as const }
      : stockQty <= lowStockThreshold
        ? { text: `Low Stock (${stockQty} left)`, variant: "warning" as const }
        : { text: "In Stock", variant: "success" as const };

  const contextLabel =
    personalizedContext === "recent"
      ? "Recently viewed"
      : personalizedContext === "affinity"
        ? "Inspired for you"
        : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[length:var(--radius-card)] border border-border/80 bg-surface shadow-[var(--shadow-soft)] transition-[box-shadow,transform] duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-[var(--shadow-medium)]">
      <div className="relative aspect-square overflow-hidden bg-surface-subtle">
        <Link href={`/shop/${slug}`} className="absolute inset-0 z-0 block">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 ease-premium group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">🌿</div>
          )}
        </Link>

        {/* Top: wishlist + sale / bestseller stack (no overlap with bottom meta bar) */}
        <WishlistToggle
          productId={id}
          className="absolute right-2 top-2 z-30 rounded-full border border-white/40 bg-white/95 shadow-md ring-1 ring-black/[0.04] backdrop-blur-sm transition-colors hover:bg-white"
        />

        <div className="pointer-events-none absolute left-2 top-2 z-20 flex max-w-[calc(100%-3.5rem)] flex-col items-start gap-1.5">
          {salePct != null && salePct > 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md",
                "bg-gradient-to-br from-[#c41e3a] via-[#d32f2f] to-[#9a0007] ring-1 ring-white/25",
              )}
            >
              <Tag className="h-3 w-3 opacity-95" aria-hidden />
              {salePct}% off
            </span>
          )}
          {isBestseller && (
            <span className="rounded-md border border-amber-400/50 bg-gradient-to-r from-amber-50 to-amber-100/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 shadow-sm ring-1 ring-amber-900/10">
              Bestseller
            </span>
          )}
        </div>

        {/* Bottom: context + organic — frosted strip, readable on any photo */}
        {(contextLabel || isOrganicCertified) && (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center gap-2 px-2.5 py-2",
              "bg-gradient-to-t from-black/75 via-black/45 to-transparent pt-8",
            )}
          >
            {contextLabel && (
              <span
                className={cn(
                  "inline-flex max-w-full truncate rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm ring-1 backdrop-blur-md",
                  personalizedContext === "recent"
                    ? "bg-primary text-primary-foreground ring-white/20"
                    : "border border-white/25 bg-white/90 text-primary ring-primary/10",
                )}
              >
                {contextLabel}
              </span>
            )}
            {isOrganicCertified && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-950/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-50 shadow-sm ring-1 ring-emerald-400/20 backdrop-blur-md">
                <Leaf className="h-3 w-3 shrink-0 text-emerald-300" strokeWidth={2.5} aria-hidden />
                Organic
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {categoryName && <p className="text-xs text-text-secondary">{categoryName}</p>}
        <Link href={`/shop/${slug}`}>
          <h3 className="mt-1 line-clamp-2 font-medium text-text-primary transition-colors group-hover:text-primary">
            {name}
          </h3>
        </Link>

        <div className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
          <span>{avgRating}</span>
          <span>({reviewCount})</span>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-mono text-lg font-bold tabular-nums text-primary">{formatINR(priceNum)}</span>
            {mrp != null && (
              <span className="text-sm font-medium tabular-nums text-text-secondary line-through decoration-text-secondary/60">
                MRP {formatINR(mrp)}
              </span>
            )}
          </div>
          {salePct != null && salePct > 0 && (
            <p className="text-xs font-medium text-emerald-700">
              You save <span className="tabular-nums">{salePct}%</span>
              {mrp != null ? " vs MRP" : ""}
            </p>
          )}
        </div>

        <Badge variant={stockLabel.variant} className="mt-2 w-fit">
          {stockLabel.text}
        </Badge>

        <Button className="mt-4 w-full" disabled={stockQty === 0} asChild={stockQty > 0}>
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
