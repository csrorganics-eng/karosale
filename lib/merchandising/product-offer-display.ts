/**
 * Derive MRP strike-through and “% off” badge for storefront cards / PDP.
 * Selling price is always `price`; `comparePrice` is MRP when higher than price.
 * `promotionalDiscountPct` overrides the badge number when set (> 0).
 */
export function getProductOfferDisplay(
  sellingPrice: number,
  comparePrice?: string | number | null,
  promotionalDiscountPct?: string | number | null,
): { mrp: number | null; salePct: number | null } {
  const mrpRaw = comparePrice != null ? parseFloat(String(comparePrice)) : NaN;
  const hasMrp = Number.isFinite(mrpRaw) && mrpRaw > sellingPrice;
  const mrp = hasMrp ? mrpRaw : null;

  const derivedPct =
    mrp != null ? Math.round(((mrp - sellingPrice) / mrp) * 100) : null;

  const promoRaw =
    promotionalDiscountPct != null ? parseFloat(String(promotionalDiscountPct)) : NaN;
  const promoPct =
    Number.isFinite(promoRaw) && promoRaw > 0 ? Math.min(100, Math.round(promoRaw)) : null;

  const salePct =
    promoPct != null && promoPct > 0
      ? promoPct
      : derivedPct != null && derivedPct > 0
        ? derivedPct
        : null;

  return { mrp, salePct };
}
