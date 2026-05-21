import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { sendWhatsAppMessage } from "@/lib/interakt";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

export const codVerificationFunction = inngest.createFunction(
  { id: "cod-verification" },
  { event: INNGEST_EVENTS.ORDER_COD_PLACED },
  async ({ event, step }) => {
    const { orderId } = event.data as { orderId: string };

    await step.sleep("wait-1h", "1h");

    const orderData = await step.run("check", async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order || order.status !== "pending") return null;
      const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
      return { order, user };
    });

    if (!orderData) return { skipped: true };

    await step.run("whatsapp-confirm", async () => {
      const { order, user } = orderData;
      if (!user?.phone) return;
      await sendWhatsAppMessage({
        phoneNumber: user.phone,
        templateName: "cod_confirm",
        bodyValues: [order.orderNumber, String(order.total)],
      }).catch(console.error);
    });

    await step.sleep("wait-2h", "2h");

    await step.run("flag-if-unverified", async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (order && !order.codVerified && order.status === "pending") {
        await db
          .update(orders)
          .set({
            adminNotes: "COD unverified — needs manual review",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));
      }
    });
  },
);
