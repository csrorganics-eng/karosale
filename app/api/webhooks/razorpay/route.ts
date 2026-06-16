import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { applyKarmaRedemptionForPaidOrder } from "@/lib/loyalty";

/** Razorpay payment entity (subset used by webhooks). Amounts in paise. */
type RazorpayPaymentEntity = {
  id: string;
  order_id?: string | null;
  amount?: number;
  amount_refunded?: number;
};

function parseWebhookPayload(body: string): { event: string; payment?: RazorpayPaymentEntity } | null {
  try {
    const parsed = JSON.parse(body) as {
      event?: string;
      payload?: { payment?: { entity?: RazorpayPaymentEntity } };
    };
    const event = parsed.event;
    if (!event || typeof event !== "string") return null;
    const payment = parsed.payload?.payment?.entity;
    return { event, payment };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET?.trim()) {
      console.error("[razorpay webhook] RAZORPAY_WEBHOOK_SECRET is not set");
      return new Response("Webhook secret not configured", { status: 503 });
    }

    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    if (!verifyWebhookSignature(body, signature)) {
      return new Response("Invalid signature", { status: 400 });
    }

    const parsed = parseWebhookPayload(body);
    if (!parsed) {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { event, payment } = parsed;

    if (event === "payment.captured") {
      if (!payment?.order_id) return new Response("OK", { status: 200 });

      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.razorpayOrderId, payment.order_id))
        .limit(1);

      if (order) {
        if (order.paymentStatus === "captured") {
          return new Response("OK", { status: 200 });
        }

        await db
          .update(orders)
          .set({
            status: "confirmed",
            paymentStatus: "captured",
            razorpayPaymentId: payment.id,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        await applyKarmaRedemptionForPaidOrder(order.id);

        await inngest.send({
          name: INNGEST_EVENTS.ORDER_PLACED,
          data: { orderId: order.id },
        });

        await inngest.send({
          name: INNGEST_EVENTS.ORDER_PAYMENT_CAPTURED,
          data: { orderId: order.id },
        });
      }
    }

    if (event === "payment.failed") {
      if (!payment?.order_id) return new Response("OK", { status: 200 });
      await db
        .update(orders)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(orders.razorpayOrderId, payment.order_id));
    }

    if (event === "payment.refunded") {
      if (!payment?.id) return new Response("OK", { status: 200 });

      const orderIdExpr = payment.order_id
        ? or(eq(orders.razorpayPaymentId, payment.id), eq(orders.razorpayOrderId, payment.order_id))
        : eq(orders.razorpayPaymentId, payment.id);

      const [order] = await db.select().from(orders).where(orderIdExpr).limit(1);
      if (!order) return new Response("OK", { status: 200 });

      const amount = Number(payment.amount ?? 0);
      const refunded = Number(payment.amount_refunded ?? 0);
      if (amount > 0 && refunded < amount) {
        console.info("[razorpay webhook] partial refund — skipping full order refund", payment.id);
        return new Response("OK", { status: 200 });
      }

      if (order.paymentStatus === "refunded" && order.status === "refunded") {
        return new Response("OK", { status: 200 });
      }

      await db
        .update(orders)
        .set({
          status: "refunded",
          paymentStatus: "refunded",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      const { reverseCommissionsForRefund } = await import("@/lib/affiliate/fraud");
      await reverseCommissionsForRefund(order.id).catch((e) => console.error("[razorpay webhook] affiliate refund reverse", e));
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[razorpay webhook]", error);
    return new Response("Error", { status: 500 });
  }
}
