import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { jsonOk, jsonError } from "@/lib/api-response";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { applyKarmaRedemptionForPaidOrder } from "@/lib/loyalty";
import { finalizeDeferredCheckoutAfterCapture } from "@/lib/orders/finalize-captured-payment";

const schema = z.object({
  /** Our internal order UUID (returned by POST /api/orders). */
  orderId: z.string().uuid(),
  /** `rzp_order_id` returned by Razorpay after payment — format: `order_xxx`. */
  razorpayOrderId: z.string().min(8),
  /** `razorpay_payment_id` from the Razorpay success handler. */
  razorpayPaymentId: z.string().min(8),
  /** HMAC-SHA256 signature from the Razorpay success handler. */
  razorpaySignature: z.string().min(16),
});

/**
 * POST /api/orders/verify-payment
 *
 * Called by the mobile app immediately after Razorpay returns a success
 * response. Verifies the HMAC signature, marks the order as captured, runs
 * deferred cart/coupon logic, and fires Inngest events — same path as the
 * Razorpay webhook, but synchronous so the UI can confirm instantly.
 *
 * The webhook at /api/webhooks/razorpay is still required for
 * server-to-server reliability; this route just gives the app instant UX.
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid request", 400, parsed.error.flatten());
    }

    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

    // Verify HMAC signature — guards against spoofed payloads
    const signatureValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
    if (!signatureValid) {
      return jsonError("Payment signature verification failed", 400);
    }

    // Load the order — must belong to the authenticated user
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) return jsonError("Order not found", 404);
    if (order.userId !== session.user.id) return jsonError("Forbidden", 403);

    // Idempotency: if already processed (webhook arrived first), return success
    if (order.paymentStatus === "captured") {
      return jsonOk({ order, alreadyCaptured: true });
    }

    // Mark as captured
    await db
      .update(orders)
      .set({
        status: "confirmed",
        paymentStatus: "captured",
        razorpayPaymentId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Deferred post-payment finalization: clear cart, apply coupon usage, etc.
    await applyKarmaRedemptionForPaidOrder(orderId);
    await finalizeDeferredCheckoutAfterCapture(orderId);

    // Trigger async workflows (inventory, email, WhatsApp, push notification)
    await inngest
      .send([
        { name: INNGEST_EVENTS.ORDER_PLACED, data: { orderId } },
        { name: INNGEST_EVENTS.ORDER_PAYMENT_CAPTURED, data: { orderId } },
      ])
      .catch((e) => console.error("[verify-payment] inngest.send failed:", e));

    const [updated] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    return jsonOk({ order: updated });
  } catch (error) {
    console.error("[POST /api/orders/verify-payment]", error);
    return jsonError(
      error instanceof Error ? error.message : "Payment verification failed",
      500,
    );
  }
}
