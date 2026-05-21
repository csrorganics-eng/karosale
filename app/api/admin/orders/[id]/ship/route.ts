import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses, orderItems, orders, users } from "@/lib/db/schema";
import { createShiprocketOrder } from "@/lib/shiprocket";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return jsonError("Order not found", 404);

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const [address] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, order.addressId))
      .limit(1);
    const [customer] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);

    if (!address) return jsonError("Address missing", 400);

    const payload = {
      order_id: order.orderNumber,
      order_date: new Date().toISOString().split("T")[0],
      pickup_location: "Primary",
      billing_customer_name: address.name,
      billing_address: address.line1,
      billing_city: address.city,
      billing_pincode: address.pincode,
      billing_state: address.state,
      billing_country: "India",
      billing_email: customer?.email ?? "orders@karosale.com",
      billing_phone: address.phone,
      shipping_is_billing: true,
      order_items: items.map((i) => ({
        name: i.productName,
        sku: i.productSku,
        units: i.qty,
        selling_price: parseFloat(i.unitPrice),
      })),
      payment_method: order.paymentMethod === "cod" ? "COD" : "Prepaid",
      sub_total: parseFloat(order.subtotal),
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
    };

    const sr = await createShiprocketOrder(payload);

    await db
      .update(orders)
      .set({
        shiprocketOrderId: String(sr.order_id),
        shiprocketShipmentId: String(sr.shipment_id),
        status: "shipped",
        shippedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    await inngest.send({
      name: INNGEST_EVENTS.ORDER_STATUS_CHANGED,
      data: { orderId: id, status: "shipped" },
    });

    return jsonOk({ shiprocket: sr });
  } catch (error) {
    console.error("[admin ship]", error);
    return jsonError(
      error instanceof Error ? error.message : "Shiprocket shipment failed",
      500,
    );
  }
}
