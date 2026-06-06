import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { applyKarmaRedemptionForPaidOrder } from "@/lib/loyalty";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    if (!verifyWebhookSignature(body, signature)) {
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(body) as {
      event: string;
      payload: {
        payment?: { entity: { order_id: string; id: string } };
        refund?: { entity: { payment_id: string } };
      };
    };

    if (event.event === "payment.captured") {
      const payment = event.payload.payment?.entity;
      if (!payment) return new Response("OK", { status: 200 });

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

    if (event.event === "payment.failed") {
      const payment = event.payload.payment?.entity;
      if (payment) {
        await db
          .update(orders)
          .set({ paymentStatus: "failed", updatedAt: new Date() })
          .where(eq(orders.razorpayOrderId, payment.order_id));
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[razorpay webhook]", error);
    return new Response("Error", { status: 500 });
  }
}
