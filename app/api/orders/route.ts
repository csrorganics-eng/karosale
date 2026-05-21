import { desc, eq } from "drizzle-orm";
import { auth, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  cartItems,
  orderItems,
  orders,
} from "@/lib/db/schema";
import { findOrCreateCart, getCartWithItems } from "@/lib/db/queries/cart";
import { createOrderSchema } from "@/lib/validations/order";
import {
  EXPRESS_SHIPPING_CHARGE,
  FREE_SHIPPING_THRESHOLD,
  generateOrderNumber,
  KARMA_REDEMPTION_RATE,
  STANDARD_SHIPPING_CHARGE,
} from "@/lib/orders";
import { createRazorpayOrder } from "@/lib/razorpay";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { jsonOk, jsonError } from "@/lib/api-response";

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

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Please sign in to checkout", 401);

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, parsed.error.flatten());
    }

    const { addressId, paymentMethod, shippingType, karmaPointsUsed, notes, isGift, giftMessage } =
      parsed.data;

    const cart = await findOrCreateCart(session.user.id);
    const { items, cart: cartRecord } = await getCartWithItems(cart.id);

    if (items.length === 0) return jsonError("Cart is empty", 400);

    for (const item of items) {
      if (item.stockQty < item.qty) {
        return jsonError(`${item.productName} has insufficient stock`, 400);
      }
    }

    const subtotal = items.reduce((s, i) => s + parseFloat(i.total), 0);
    const couponDiscount = parseFloat(cartRecord?.couponDiscount ?? "0");
    const karmaDiscount = Math.min(
      karmaPointsUsed / KARMA_REDEMPTION_RATE,
      subtotal * 0.5,
    );

    let shippingCharge =
      shippingType === "express" ? EXPRESS_SHIPPING_CHARGE : STANDARD_SHIPPING_CHARGE;
    if (subtotal - couponDiscount >= FREE_SHIPPING_THRESHOLD) {
      shippingCharge = 0;
    }

    const total = Math.max(
      0,
      subtotal - couponDiscount - karmaDiscount + shippingCharge,
    );

    const orderNumber = await generateOrderNumber();

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        userId: session.user.id,
        addressId,
        status: "pending",
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
        subtotal: String(subtotal),
        couponCode: cartRecord?.couponCode,
        couponDiscount: String(couponDiscount),
        karmaPointsUsed,
        karmaDiscount: String(karmaDiscount),
        shippingCharge: String(shippingCharge),
        taxAmount: "0",
        total: String(total),
        notes: notes ?? null,
        isGift,
        giftMessage: giftMessage ?? null,
      })
      .returning();

    if (!order) return jsonError("Failed to create order", 500);

    for (const item of items) {
      await db.insert(orderItems).values({
        orderId: order.id,
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

    if (paymentMethod === "cod") {
      await inngest.send({
        name: INNGEST_EVENTS.ORDER_COD_PLACED,
        data: { orderId: order.id },
      });
      await inngest.send({
        name: INNGEST_EVENTS.ORDER_PLACED,
        data: { orderId: order.id },
      });
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
