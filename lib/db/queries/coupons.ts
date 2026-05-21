import { and, eq, gte, lte, or, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { couponUsage, coupons } from "@/lib/db/schema";

export async function validateCoupon(
  code: string,
  userId: string | undefined,
  subtotal: number,
) {
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)))
    .limit(1);

  if (!coupon) return { valid: false, error: "Invalid coupon code" };

  const now = new Date();
  if (coupon.startsAt > now) return { valid: false, error: "Coupon not yet active" };
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { valid: false, error: "Coupon has expired" };
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, error: "Coupon usage limit reached" };
  }

  const minOrder = parseFloat(coupon.minOrderValue);
  if (subtotal < minOrder) {
    return { valid: false, error: `Minimum order value is ₹${minOrder}` };
  }

  if (userId && coupon.perUserLimit) {
    const [usage] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(couponUsage)
      .where(and(eq(couponUsage.couponId, coupon.id), eq(couponUsage.userId, userId)));
    if ((usage?.count ?? 0) >= coupon.perUserLimit) {
      return { valid: false, error: "You have already used this coupon" };
    }
  }

  let discount = 0;
  const value = parseFloat(coupon.value);

  switch (coupon.type) {
    case "percentage":
      discount = (subtotal * value) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, parseFloat(coupon.maxDiscount));
      }
      break;
    case "flat":
      discount = value;
      break;
    case "free_shipping":
      discount = 0;
      break;
    default:
      discount = value;
  }

  discount = Math.min(discount, subtotal);

  return {
    valid: true,
    coupon,
    discount,
    freeShipping: coupon.type === "free_shipping",
  };
}
