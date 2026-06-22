import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartItems, carts, couponUsage, coupons, orders } from "@/lib/db/schema";

/**
 * For online checkout (Razorpay, etc.), coupon usage and cart clearing are deferred until
 * payment is captured. Call this from verify-payment and payment webhooks — it is idempotent.
 */
export async function finalizeDeferredCheckoutAfterCapture(orderId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return;
    if (order.paymentStatus !== "captured") return;
    if (order.paymentMethod === "cod") return;

    const code = order.couponCode?.trim();
    if (code) {
      const [existingUsage] = await tx
        .select({ id: couponUsage.id })
        .from(couponUsage)
        .where(eq(couponUsage.orderId, orderId))
        .limit(1);
      if (!existingUsage) {
        const [coupon] = await tx
          .select()
          .from(coupons)
          .where(and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)))
          .limit(1);
        if (coupon) {
          await tx.insert(couponUsage).values({
            couponId: coupon.id,
            userId: order.userId,
            orderId,
            discountApplied: order.couponDiscount,
          });
          await tx
            .update(coupons)
            .set({
              usedCount: sql`${coupons.usedCount} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(coupons.id, coupon.id));
        }
      }
    }

    const [cart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, order.userId))
      .limit(1);
    if (!cart) return;

    await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    await tx
      .update(carts)
      .set({
        couponCode: null,
        couponDiscount: "0",
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cart.id));
  });
}
