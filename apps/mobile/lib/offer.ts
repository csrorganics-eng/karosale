/** Port of web offer display logic for product cards. */
export function getProductOfferDisplay(
  price: number,
  comparePrice?: string | null,
  promotionalDiscountPct?: string | null,
) {
  const mrp = comparePrice ? parseFloat(comparePrice) : null;
  let salePct: number | null = null;
  const promo = promotionalDiscountPct ? parseFloat(promotionalDiscountPct) : 0;
  if (promo > 0) salePct = Math.round(promo);
  else if (mrp && mrp > price) salePct = Math.round(((mrp - price) / mrp) * 100);
  return { mrp, salePct };
}
