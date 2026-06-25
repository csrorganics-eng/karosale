import { and, desc, eq, sql } from "drizzle-orm";
import { auth, requireAuth } from "@/lib/auth";
import { db, type Database } from "@/lib/db";
import { cartItems, carts, couponUsage, coupons, loyaltyTransactions, orderItems, orders, users, addresses, affiliateReferrals } from "@/lib/db/schema";
import { findOrCreateCart, getCartWithItems } from "@/lib/db/queries/cart";
import { validateCoupon } from "@/lib/db/queries/coupons";
import { createOrderSchema } from "@/lib/validations/order";
import {
  generateOrderNumber,
} from "@/lib/orders";
import {
  computeTierDiscount,
  getTierForPoints,
} from "@/lib/loyalty";
import { createRazorpayOrder, getRazorpay } from "@/lib/razorpay";
import { emitCodCheckoutEvents } from "@/lib/inngest/emit-order-events";
import { jsonOk, jsonError } from "@/lib/api-response";
import { markLatestClickConverted, resolveCheckoutAffiliate } from "@/lib/affiliate/engine";
import { computeCheckoutTotals } from "@/lib/orders/compute-checkout-totals";

type OrderPersistTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const page = parseInt(new URL(request.url).searchParams.get("page") ?? "1", 10);
    const limit = 10;
    const offset = (page - 1) * limit;

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, session.user.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    return jsonOk({ orders: userOrders, page, limit });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

const REFERRAL_WELCOME_COUPON = "WELCOME50";

/** Order + lines + coupon + cart + karma in one Postgres transaction (Neon Pool + WebSocket). */
async function persistOrder(
  tx: OrderPersistTx,
  params: {
    sessionUserId: string;
    orderNumber: string;
    addressId: string;
    paymentMethod: "razorpay" | "cod" | "wallet" | "upi";
    subtotal: number;
    tierDiscount: number;
    cartRecord: typeof carts.$inferSelect | null | undefined;
    couponDiscount: number;
    appliedCouponCode: string | null;
    effectiveKarmaPoints: number;
    karmaDiscount: number;
    shippingCharge: number;
    total: number;
    notes?: string | null;
    isGift: boolean;
    giftMessage?: string | null;
    items: Awaited<ReturnType<typeof getCartWithItems>>["items"];
    cartId: string;
    deductKarmaNow: boolean;
    /** When true, cart lines and coupon usage are applied only after online payment capture. */
    deferCartClearAndCouponUntilCapture: boolean;
    affiliateId?: number | null;
    affiliateDiscount?: number;
  },
) {
  const {
    sessionUserId,
    orderNumber,
    addressId,
    paymentMethod,
    subtotal,
    tierDiscount,
    cartRecord,
    couponDiscount,
    appliedCouponCode,
    effectiveKarmaPoints,
    karmaDiscount,
    shippingCharge,
    total,
    notes,
    isGift,
    giftMessage,
    items,
    cartId,
    deductKarmaNow,
    deferCartClearAndCouponUntilCapture,
    affiliateId,
    affiliateDiscount,
  } = params;

  let karmaBalanceAfter: number | null = null;

  if (deductKarmaNow && effectiveKarmaPoints > 0) {
    const [u2] = await tx
      .select({ karmaPoints: users.karmaPoints })
      .from(users)
      .where(
        and(eq(users.id, sessionUserId), sql`${users.karmaPoints} >= ${effectiveKarmaPoints}`),
      )
      .limit(1);
    if (!u2) {
      throw new Error("Insufficient karma points — please refresh and try again");
    }
    karmaBalanceAfter = u2.karmaPoints - effectiveKarmaPoints;
    await tx
      .update(users)
      .set({ karmaPoints: karmaBalanceAfter, updatedAt: new Date() })
      .where(eq(users.id, sessionUserId));
  }

  const [created] = await tx
    .insert(orders)
    .values({
      orderNumber,
      userId: sessionUserId,
      addressId,
      status: "pending",
      paymentMethod,
      paymentStatus: "pending",
      subtotal: String(subtotal),
      discountAmount: String(tierDiscount),
      couponCode: appliedCouponCode,
      couponDiscount: String(couponDiscount),
      karmaPointsUsed: effectiveKarmaPoints,
      karmaDiscount: String(karmaDiscount),
      shippingCharge: String(shippingCharge),
      taxAmount: "0",
      total: String(total),
      notes: notes ?? null,
      isGift,
      giftMessage: giftMessage ?? null,
      affiliateId: affiliateId ?? null,
      affiliateDiscountAmount: String(affiliateDiscount ?? 0),
    })
    .returning();

  if (!created) throw new Error("Failed to create order");

  if (affiliateId != null && affiliateId > 0) {
    await tx
      .insert(affiliateReferrals)
      .values({
        affiliateId,
        referredUserId: sessionUserId,
        referralType: "purchase",
        discountApplied: String(affiliateDiscount ?? 0),
        registrationCommissionPaid: false,
      })
      .onConflictDoNothing();
  }

  if (!deferCartClearAndCouponUntilCapture && appliedCouponCode) {
    const [coupon] = await tx
      .select()
      .from(coupons)
      .where(eq(coupons.code, appliedCouponCode))
      .limit(1);
    if (coupon) {
      await tx.insert(couponUsage).values({
        couponId: coupon.id,
        userId: sessionUserId,
        orderId: created.id,
        discountApplied: String(couponDiscount),
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

  if (deductKarmaNow && effectiveKarmaPoints > 0 && karmaBalanceAfter !== null) {
    await tx.insert(loyaltyTransactions).values({
      userId: sessionUserId,
      type: "redeemed",
      points: -effectiveKarmaPoints,
      balanceAfter: karmaBalanceAfter,
      referenceId: created.id,
      referenceType: "order",
      description: `Redeemed ${effectiveKarmaPoints} karma points for order ${orderNumber}`,
    });
  }

  for (const item of items) {
    await tx.insert(orderItems).values({
      orderId: created.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      productSku: item.productSlug,
      productImage: item.imageUrl,
      qty: item.qty,
      unitPrice: item.unitPrice,
      total: item.total,
    });
  }

  if (!deferCartClearAndCouponUntilCapture) {
    await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
    await tx
      .update(carts)
      .set({
        couponCode: null,
        couponDiscount: "0",
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cartId));
  }

  return created;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Please sign in to checkout", 401);

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, parsed.error.flatten());
    }

    const { addressId, paymentMethod, shippingType, karmaPointsUsed, notes, isGift, giftMessage, affiliateUsername } =
      parsed.data;

    const [shippingAddress] = await db
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, session.user.id)))
      .limit(1);
    if (!shippingAddress) {
      return jsonError(
        "Choose a delivery address saved to your account. Add one under Profile or on checkout.",
        400,
      );
    }

    const cart = await findOrCreateCart(session.user.id);
    const { items, cart: cartRecord } = await getCartWithItems(cart.id);

    if (items.length === 0) return jsonError("Cart is empty", 400);

    for (const item of items) {
      if (item.stockQty < item.qty) {
        return jsonError(`${item.productName} has insufficient stock`, 400);
      }
    }

    const subtotal = items.reduce((s, i) => s + parseFloat(i.total), 0);

    const [userRow] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    if (!userRow) return jsonError("User not found", 404);

    const tierPreview = await getTierForPoints(userRow.karmaPoints);
    const tierDiscountPreview = computeTierDiscount(subtotal, tierPreview);
    const merchandiseAfterTierPreview = Math.max(0, subtotal - tierDiscountPreview);

    const { affiliateId: checkoutAffiliateId, affiliateDiscount: checkoutAffiliateDiscount } =
      await resolveCheckoutAffiliate({
        buyerUserId: session.user.id,
        totalOrders: userRow.totalOrders,
        cookieHeader: request.headers.get("cookie"),
        manualAffiliateUsername: affiliateUsername ?? null,
        merchandiseAfterTier: merchandiseAfterTierPreview,
      });

    let welcomeCouponOptions: { couponCodeOverride?: string } | undefined;
    if (
      !cartRecord?.couponCode?.trim() &&
      userRow.referredBy &&
      userRow.totalOrders === 0
    ) {
      const w = await validateCoupon(
        REFERRAL_WELCOME_COUPON,
        session.user.id,
        merchandiseAfterTierPreview,
      );
      if (w.valid) {
        welcomeCouponOptions = { couponCodeOverride: REFERRAL_WELCOME_COUPON };
      }
    }

    let totals: Awaited<ReturnType<typeof computeCheckoutTotals>>;
    try {
      totals = await computeCheckoutTotals(
        session.user.id,
        subtotal,
        cartRecord,
        shippingType,
        karmaPointsUsed,
        {
          ...welcomeCouponOptions,
          affiliateDiscountRupees: checkoutAffiliateDiscount,
        },
      );
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Checkout validation failed", 400);
    }

    const {
      tierDiscount,
      affiliateDiscount,
      couponDiscount,
      appliedCouponCode,
      effectiveKarmaPoints,
      karmaDiscount,
      shippingCharge,
      total,
    } = totals;

    const orderNumber = await generateOrderNumber();

    const deferCartClearAndCouponUntilCapture = paymentMethod !== "cod";
    if (deferCartClearAndCouponUntilCapture) {
      try {
        getRazorpay();
      } catch {
        return jsonError(
          "Online payments are not configured (missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET on the server). Use Cash on Delivery or contact support.",
          503,
        );
      }
    }

    const order = await db.transaction(async (tx) =>
      persistOrder(tx, {
        sessionUserId: session.user.id,
        orderNumber,
        addressId,
        paymentMethod,
        subtotal,
        tierDiscount,
        cartRecord,
        couponDiscount,
        appliedCouponCode,
        effectiveKarmaPoints,
        karmaDiscount,
        shippingCharge,
        total,
        notes,
        isGift,
        giftMessage,
        items,
        cartId: cart.id,
        deductKarmaNow: paymentMethod === "cod",
        deferCartClearAndCouponUntilCapture,
        affiliateId: checkoutAffiliateId,
        affiliateDiscount: affiliateDiscount,
      }),
    );

    if (order.affiliateId) {
      await markLatestClickConverted(order.affiliateId, order.id).catch((e) =>
        console.warn("[orders] markLatestClickConverted", e),
      );
    }

    if (paymentMethod === "cod") {
      await emitCodCheckoutEvents(order.id);
      return jsonOk({ order, paymentMethod: "cod" });
    }

    const amountPaise = Math.round(total * 100);
    const razorpayOrder = await createRazorpayOrder(amountPaise, order.id, {
      order_number: orderNumber,
    });

    await db
      .update(orders)
      .set({ razorpayOrderId: razorpayOrder.id, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    return jsonOk({
      order,
      razorpayOrderId: razorpayOrder.id,
      amount: amountPaise,
      currency: "INR",
    });
  } catch (error) {
    console.error("[POST /api/orders]", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to create order",
      500,
    );
  }
}
