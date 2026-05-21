import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addresses,
  orderItems,
  orderStatusHistory,
  orders,
  users,
} from "@/lib/db/schema";
import { updateOrderStatusSchema } from "@/lib/validations/order";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return jsonError("Order not found", 404);

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const [customer] = await db
      .select()
      .from(users)
      .where(eq(users.id, order.userId))
      .limit(1);
    const [address] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, order.addressId))
      .limit(1);
    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id));

    return jsonOk({ order, items, customer, address, history });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return jsonError(error.message, error.message === "Unauthorized" ? 401 : 403);
    }
    return jsonError("Failed to fetch order", 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(["admin"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid status", 400);

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return jsonError("Order not found", 404);

    await db
      .update(orders)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(orders.id, id));

    await inngest.send({
      name: INNGEST_EVENTS.ORDER_STATUS_CHANGED,
      data: {
        orderId: id,
        status: parsed.data.status,
        changedBy: session.user.id,
      },
    });

    return jsonOk({ success: true, status: parsed.data.status });
  } catch (error) {
    console.error("[PATCH admin order]", error);
    return jsonError("Failed to update order", 500);
  }
}
