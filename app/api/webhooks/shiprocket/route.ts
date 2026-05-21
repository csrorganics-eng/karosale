import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

const STATUS_MAP: Record<string, string> = {
  SHIPPED: "shipped",
  "IN TRANSIT": "shipped",
  "OUT FOR DELIVERY": "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RTO: "returned",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const awb = body.awb as string | undefined;
    const currentStatus = (body.current_status as string | undefined)?.toUpperCase();
    const orderId = body.order_id as string | undefined;

    if (!awb && !orderId) {
      return new Response("Missing identifiers", { status: 400 });
    }

    const [order] = awb
      ? await db.select().from(orders).where(eq(orders.awbCode, awb)).limit(1)
      : await db
          .select()
          .from(orders)
          .where(eq(orders.shiprocketOrderId, String(orderId)))
          .limit(1);

    if (!order) return new Response("Order not found", { status: 404 });

    const newStatus = currentStatus ? STATUS_MAP[currentStatus] : undefined;
    if (!newStatus) return new Response("OK", { status: 200 });

    await db
      .update(orders)
      .set({
        status: newStatus as typeof order.status,
        trackingUrl: (body.tracking_url as string) ?? order.trackingUrl,
        updatedAt: new Date(),
        ...(newStatus === "shipped" ? { shippedAt: new Date() } : {}),
        ...(newStatus === "delivered" ? { deliveredAt: new Date() } : {}),
      })
      .where(eq(orders.id, order.id));

    await inngest.send({
      name: INNGEST_EVENTS.ORDER_STATUS_CHANGED,
      data: { orderId: order.id, status: newStatus },
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[shiprocket webhook]", error);
    return new Response("Error", { status: 500 });
  }
}
