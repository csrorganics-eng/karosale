"use client";

import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProductCartQty } from "@/components/storefront/storefront-cart-items-provider";

/** Floating pill on product imagery — scannable in dense grids. */
export function InCartImagePill({
  productId,
  /** When the card shows the bottom frosted strip (organic / “for you”), lift the pill so it does not cover those badges. */
  clearBottomOverlay = false,
}: {
  productId: string;
  clearBottomOverlay?: boolean;
}) {
  const qty = useProductCartQty(productId);
  if (qty <= 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-2 z-[25] flex max-w-[min(12rem,calc(100%-3rem))]",
        clearBottomOverlay ? "bottom-[4.5rem]" : "bottom-2",
        "items-center gap-1 rounded-full border border-primary/25 bg-surface/95 py-1 pl-1.5 pr-2.5",
        "text-[10px] font-semibold uppercase tracking-wide text-primary shadow-md backdrop-blur-sm ring-1 ring-black/[0.04]",
      )}
      role="status"
      aria-label={qty === 1 ? "Already in your bag, 1 item" : `Already in your bag, ${qty} items`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12">
        <Check className="h-3 w-3 text-primary" strokeWidth={2.5} aria-hidden />
      </span>
      <span className="truncate tabular-nums">In bag{qty > 1 ? ` · ${qty}` : ""}</span>
    </div>
  );
}

/** Primary CTA: clearer destination when the line is already in the cart. */
export function ProductCardCartCta({
  productId,
  slug,
  stockQty,
}: {
  productId: string;
  slug: string;
  stockQty: number;
}) {
  const inBag = useProductCartQty(productId) > 0;

  return (
    <Button className="mt-4 w-full" disabled={stockQty === 0} asChild={stockQty > 0}>
      {stockQty > 0 ? (
        <Link href={`/shop/${slug}`}>{inBag ? "View product" : "Add to Cart"}</Link>
      ) : (
        <span>Notify Me</span>
      )}
    </Button>
  );
}

/** Tiny confirmation on typeahead thumbnails. */
export function InCartSearchThumbDot({ productId }: { productId: string }) {
  const qty = useProductCartQty(productId);
  if (qty <= 0) return null;

  return (
    <span
      className="absolute bottom-0.5 right-0.5 z-[2] flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-[1.5px] ring-white"
      aria-hidden
    >
      <Check className="h-2 w-2" strokeWidth={3} />
    </span>
  );
}

/** Compact hint for typeahead rows (price column). */
export function InCartSearchHint({ productId }: { productId: string }) {
  const qty = useProductCartQty(productId);
  if (qty <= 0) return null;

  return (
    <span
      className="inline-flex items-center gap-0.5 text-[11px] font-medium leading-none text-primary"
      title={qty === 1 ? "This item is in your bag" : `${qty} in your bag`}
    >
      <ShoppingBag className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
      <span className="tabular-nums">In bag{qty > 1 ? ` · ${qty}` : ""}</span>
    </span>
  );
}
