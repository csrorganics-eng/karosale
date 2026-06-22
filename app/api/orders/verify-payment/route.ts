import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { verifyPaymentSchema } from "@/lib/validations/order";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { jsonOk, jsonError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { applyKarmaRedemptionForPaidOrder } from "@/lib/loyalty";
import { finalizeDeferredCheckoutAfterCapture } from "@/lib/orders/finalize-captured-payment";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();
    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      parsed.data;

    const valid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
    if (!valid) return jsonError("Invalid payment signature", 400);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) return jsonError("Order not found", 404);

    if (
      order.razorpayOrderId &&
      order.razorpayOrderId !== razorpayOrderId
    ) {
      return jsonError("Payment does not match this order", 400);
    }

    if (order.paymentStatus === "captured") {
      await finalizeDeferredCheckoutAfterCapture(orderId);
      return jsonOk({ success: true, orderId, duplicate: true });
    }

    await db
      .update(orders)
      .set({
        status: "confirmed",
        paymentStatus: "captured",
        razorpayPaymentId,
        razorpaySignature,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await applyKarmaRedemptionForPaidOrder(orderId);

    await finalizeDeferredCheckoutAfterCapture(orderId);

    await inngest.send({
      name: INNGEST_EVENTS.ORDER_PLACED,
      data: { orderId },
    });

    await inngest.send({
      name: INNGEST_EVENTS.ORDER_PAYMENT_CAPTURED,
      data: { orderId },
    });

    return jsonOk({ success: true, orderId });
  } catch (error) {
    console.error("[POST /api/orders/verify-payment]", error);
    return jsonError("Payment verification failed", 500);
  }
}
