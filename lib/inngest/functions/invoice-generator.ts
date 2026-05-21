import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  addresses,
  orderItems,
  orders,
  users,
} from "@/lib/db/schema";
import { uploadToR2 } from "@/lib/r2";
import { sendEmail } from "@/lib/resend";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

export const invoiceGeneratorFunction = inngest.createFunction(
  { id: "invoice-generator", retries: 2 },
  { event: INNGEST_EVENTS.ORDER_PAYMENT_CAPTURED },
  async ({ event, step }) => {
    const { orderId } = event.data as { orderId: string };

    const pdfUrl = await step.run("generate-invoice", async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) return null;

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
      const [address] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, order.addressId))
        .limit(1);

      const lines = [
        "KAROSALE — TAX INVOICE",
        `Invoice for Order: ${order.orderNumber}`,
        `Date: ${new Date().toLocaleDateString("en-IN")}`,
        `Customer: ${user?.name ?? ""}`,
        `GSTIN: [Configure in settings]`,
        `Bill to: ${address?.line1}, ${address?.city} ${address?.pincode}`,
        "---",
        ...items.map(
          (i) =>
            `${i.productName} | Qty ${i.qty} | ₹${i.unitPrice} | Total ₹${i.total}`,
        ),
        `Subtotal: ₹${order.subtotal}`,
        `Discount: ₹${order.discountAmount}`,
        `Shipping: ₹${order.shippingCharge}`,
        `Total: ₹${order.total}`,
      ];

      const buffer = Buffer.from(lines.join("\n"), "utf-8");
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const key = `invoices/${year}/${month}/${order.orderNumber}.txt`;

      try {
        const url = await uploadToR2({
          key,
          body: buffer,
          contentType: "text/plain",
        });
        await db
          .update(orders)
          .set({ invoiceUrl: url, updatedAt: new Date() })
          .where(eq(orders.id, orderId));
        return url;
      } catch (err) {
        console.error("[invoice-generator]", err);
        return null;
      }
    });

    await step.run("email-invoice", async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      const [user] = await db.select().from(users).where(eq(users.id, order?.userId ?? "")).limit(1);
      if (!user?.email || !pdfUrl || !order) return;
      await sendEmail({
        to: user.email,
        subject: `Invoice — ${order.orderNumber}`,
        html: `<p>Your invoice is ready. <a href="${pdfUrl}">Download invoice</a></p>`,
      }).catch(console.error);
    });

    return { pdfUrl };
  },
);
