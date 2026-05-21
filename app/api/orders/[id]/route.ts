import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addresses,
  orderItems,
  orderStatusHistory,
  orders,
} from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return jsonError("Order not found", 404);

    const isOwner = session?.user?.id === order.userId;
    const isAdmin = session?.user?.role === "admin";
    if (!isOwner && !isAdmin) return jsonError("Forbidden", 403);

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const [address] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, order.addressId))
      .limit(1);
    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id));

    return jsonOk({ order, items, address, history });
  } catch (error) {
    console.error("[GET /api/orders/[id]]", error);
    return jsonError("Failed to fetch order", 500);
  }
}
