import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({
  productId: z.string().uuid(),
  qtyPacked: z.number().int().min(0),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin", "packer"]);
    const { id: orderId } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const [item] = await db
      .select()
      .from(orderItems)
      .where(
        and(
          eq(orderItems.orderId, orderId),
          eq(orderItems.productId, parsed.data.productId),
        ),
      )
      .limit(1);

    if (!item) return jsonError("Item not found", 404);

    await db
      .update(orderItems)
      .set({ packedQty: parsed.data.qtyPacked, updatedAt: new Date() })
      .where(eq(orderItems.id, item.id));

    const allItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const allPacked = allItems.every((i) => i.packedQty >= i.qty);

    if (allPacked) {
      await db
        .update(orders)
        .set({ status: "packed", packedAt: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      await inngest.send({
        name: INNGEST_EVENTS.ORDER_STATUS_CHANGED,
        data: { orderId, status: "packed" },
      });
    }

    return jsonOk({ allPacked, items: allItems });
  } catch (error) {
    return jsonError("Failed to update pack status", 500);
  }
}
