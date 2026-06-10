import { formatINR, cn } from "@/lib/utils";
import { getProductOfferDisplay } from "@/lib/merchandising/product-offer-display";

export function PriceDisplay({
  price,
  comparePrice,
  promotionalDiscountPct,
  className,
}: {
  price: string | number;
  comparePrice?: string | number | null;
  promotionalDiscountPct?: string | number | null;
  className?: string;
}) {
  const p = typeof price === "string" ? parseFloat(price) : price;
  const { mrp, salePct } = getProductOfferDisplay(p, comparePrice, promotionalDiscountPct);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-2", className)}>
      <span className="font-mono text-lg font-bold tabular-nums text-primary">{formatINR(p)}</span>
      {mrp != null && (
        <span className="text-sm font-medium tabular-nums text-text-secondary line-through decoration-text-secondary/50">
          {formatINR(mrp)}
        </span>
      )}
      {salePct != null && salePct > 0 && (
        <span className="rounded-md bg-gradient-to-r from-[#c41e3a] to-[#9a0007] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
          {salePct}% off
        </span>
      )}
    </div>
  );
}
