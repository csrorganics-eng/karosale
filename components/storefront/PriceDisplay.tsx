import { formatINR } from "@/lib/utils";

export function PriceDisplay({
  price,
  comparePrice,
}: {
  price: string | number;
  comparePrice?: string | number | null;
}) {
  const p = typeof price === "string" ? parseFloat(price) : price;
  const compare =
    comparePrice != null
      ? typeof comparePrice === "string"
        ? parseFloat(comparePrice)
        : comparePrice
      : null;

  const savings =
    compare && compare > p ? Math.round(((compare - p) / compare) * 100) : null;

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="font-mono text-lg font-bold text-primary">{formatINR(p)}</span>
      {compare && compare > p && (
        <>
          <span className="text-sm text-text-secondary line-through">
            {formatINR(compare)}
          </span>
          {savings != null && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
              Save {savings}%
            </span>
          )}
        </>
      )}
    </div>
  );
}
