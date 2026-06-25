import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts, users } from "@/lib/db/schema";
import { validateCoupon } from "@/lib/db/queries/coupons";
import {
  EXPRESS_SHIPPING_CHARGE,
  FREE_SHIPPING_THRESHOLD,
  KARMA_REDEMPTION_RATE,
  STANDARD_SHIPPING_CHARGE,
} from "@/lib/orders";
import {
  computeKarmaDiscount,
  computeTierDiscount,
  getTierForPoints,
  tierGrantsFreeShipping,
} from "@/lib/loyalty";

export async function computeCheckoutTotals(
  userId: string,
  subtotal: number,
  cartRecord: typeof carts.$inferSelect | null | undefined,
  shippingType: "standard" | "express",
  karmaPointsRequested: number,
  options?: { couponCodeOverride?: string; affiliateDiscountRupees?: number },
) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const tier = await getTierForPoints(user.karmaPoints);
  const tierDiscount = computeTierDiscount(subtotal, tier);
  const merchandiseAfterTier = Math.max(0, subtotal - tierDiscount);

  const affiliateDiscountRupees = Math.max(
    0,
    Math.min(options?.affiliateDiscountRupees ?? 0, merchandiseAfterTier),
  );
  const merchandiseAfterAffiliate = Math.max(0, merchandiseAfterTier - affiliateDiscountRupees);

  const couponCode =
    options?.couponCodeOverride?.trim() ||
    cartRecord?.couponCode?.trim() ||
    null;

  let couponDiscount = 0;
  let freeShippingFromCoupon = false;
  let appliedCouponCode: string | null = null;

  if (couponCode) {
    const v = await validateCoupon(couponCode, userId, merchandiseAfterAffiliate);
    if (!v.valid) {
      throw new Error(v.error ?? "Coupon is no longer valid for this cart");
    }
    if (!v.coupon) {
      throw new Error("Coupon state invalid");
    }
    couponDiscount = v.discount ?? 0;
    freeShippingFromCoupon = v.freeShipping ?? false;
    appliedCouponCode = v.coupon.code;
  }

  const afterCoupon = Math.max(0, merchandiseAfterAffiliate - couponDiscount);

  const maxKarmaRupees = afterCoupon * 0.5;
  const maxPointsUsable = Math.floor(maxKarmaRupees * KARMA_REDEMPTION_RATE);
  const effectiveKarmaPoints = Math.min(
    karmaPointsRequested,
    user.karmaPoints,
    Math.max(0, maxPointsUsable),
  );

  const karmaDiscount = computeKarmaDiscount(effectiveKarmaPoints, afterCoupon);

  let shippingCharge =
    shippingType === "express" ? EXPRESS_SHIPPING_CHARGE : STANDARD_SHIPPING_CHARGE;

  const netMerch = merchandiseAfterAffiliate - couponDiscount;
  const qualifiesThreshold = netMerch >= FREE_SHIPPING_THRESHOLD;
  const tierFree = tierGrantsFreeShipping(tier, netMerch);

  if (freeShippingFromCoupon || qualifiesThreshold || tierFree) {
    shippingCharge = 0;
  }

  const total = Math.max(0, afterCoupon - karmaDiscount + shippingCharge);

  return {
    subtotal,
    tierDiscount,
    affiliateDiscount: affiliateDiscountRupees,
    couponDiscount,
    effectiveKarmaPoints,
    karmaDiscount,
    shippingCharge,
    total,
    appliedCouponCode,
    karmaBalance: user.karmaPoints,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  };
}
