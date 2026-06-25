import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { findOrCreateCart, getCartWithItems } from "@/lib/db/queries/cart";
import { validateCoupon } from "@/lib/db/queries/coupons";
import { computeCheckoutTotals } from "@/lib/orders/compute-checkout-totals";
import { computeTierDiscount, getTierForPoints } from "@/lib/loyalty";
import { resolveCheckoutAffiliate } from "@/lib/affiliate/engine";
import { jsonOk, jsonError } from "@/lib/api-response";

const REFERRAL_WELCOME_COUPON = "WELCOME50";

const schema = z.object({
  shippingType: z.enum(["standard", "express"]).default("standard"),
  karmaPointsUsed: z.coerce.number().int().min(0).default(0),
  affiliateUsername: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400, parsed.error.flatten());

    const cart = await findOrCreateCart(session.user.id);
    const { items, cart: cartRecord } = await getCartWithItems(cart.id);
    if (items.length === 0) return jsonError("Cart is empty", 400);

    const subtotal = items.reduce((s, i) => s + parseFloat(i.total), 0);
    const [userRow] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    if (!userRow) return jsonError("User not found", 404);

    const tierPreview = await getTierForPoints(userRow.karmaPoints);
    const tierDiscountPreview = computeTierDiscount(subtotal, tierPreview);
    const merchandiseAfterTierPreview = Math.max(0, subtotal - tierDiscountPreview);

    const { affiliateDiscount: checkoutAffiliateDiscount } = await resolveCheckoutAffiliate({
      buyerUserId: session.user.id,
      totalOrders: userRow.totalOrders,
      cookieHeader: request.headers.get("cookie"),
      manualAffiliateUsername: parsed.data.affiliateUsername ?? null,
      merchandiseAfterTier: merchandiseAfterTierPreview,
    });

    let welcomeCouponOptions: { couponCodeOverride?: string } | undefined;
    if (!cartRecord?.couponCode?.trim() && userRow.referredBy && userRow.totalOrders === 0) {
      const w = await validateCoupon(REFERRAL_WELCOME_COUPON, session.user.id, merchandiseAfterTierPreview);
      if (w.valid) welcomeCouponOptions = { couponCodeOverride: REFERRAL_WELCOME_COUPON };
    }

    const totals = await computeCheckoutTotals(
      session.user.id,
      subtotal,
      cartRecord,
      parsed.data.shippingType,
      parsed.data.karmaPointsUsed,
      { ...welcomeCouponOptions, affiliateDiscountRupees: checkoutAffiliateDiscount },
    );

    return jsonOk({ items, cart: cartRecord, totals });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError(error instanceof Error ? error.message : "Preview failed", 400);
  }
}
