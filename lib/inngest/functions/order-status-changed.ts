import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  loyaltyTransactions,
  notificationsLog,
  orderStatusHistory,
  orders,
  users,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/resend";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/interakt";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { KARMA_POINTS_PER_RUPEE } from "@/lib/orders";

const STATUS_MESSAGES: Record<string, string> = {
  confirmed: "Your order is confirmed!",
  packed: "Your order is packed and ready to ship.",
  shipped: "Your order is on the way!",
  out_for_delivery: "Your order is out for delivery today!",
  delivered: "Delivered! Enjoy your organic products.",
  cancelled: "Your order has been cancelled. Refund in 5-7 days if applicable.",
};

export const orderStatusChangedFunction = inngest.createFunction(
  { id: "order-status-changed", retries: 2 },
  { event: INNGEST_EVENTS.ORDER_STATUS_CHANGED },
  async ({ event, step }) => {
    const { orderId, status, changedBy } = event.data as {
      orderId: string;
      status: string;
      changedBy?: string;
    };

    await step.run("log-history", async () => {
      await db.insert(orderStatusHistory).values({
        orderId,
        status,
        changedBy: changedBy ?? null,
      });
    });

    const orderData = await step.run("load", async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      const [user] = order
        ? await db.select().from(users).where(eq(users.id, order.userId)).limit(1)
        : [null];
      return { order, user };
    });

    await step.run("notify", async () => {
      const { order, user } = orderData;
      if (!order || !user?.phone) return;

      const message = STATUS_MESSAGES[status] ?? `Order status: ${status}`;
      try {
        await sendWhatsAppMessage({
          phoneNumber: user.phone,
          templateName: WHATSAPP_TEMPLATES.ORDER_SHIPPED,
          bodyValues: [order.orderNumber, message],
        });
        await db.insert(notificationsLog).values({
          userId: user.id,
          orderId,
          channel: "whatsapp",
          templateName: "order_status_update",
          status: "sent",
          payload: { status, message },
          sentAt: new Date(),
        });
      } catch (err) {
        console.error("[order-status-changed]", err);
      }

      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: `Order ${order.orderNumber} — ${status}`,
          html: `<p>${message}</p>`,
        }).catch(console.error);
      }
    });

    if (status === "delivered") {
      await step.run("award-karma", async () => {
        const { order, user } = orderData;
        if (!order || !user) return;

        const total = parseFloat(order.total);
        const points = Math.floor(total / KARMA_POINTS_PER_RUPEE);
        if (points <= 0) return;

        const newBalance = user.karmaPoints + points;
        await db
          .update(users)
          .set({ karmaPoints: newBalance, updatedAt: new Date() })
          .where(eq(users.id, user.id));

        await db.insert(loyaltyTransactions).values({
          userId: user.id,
          type: "earned",
          points,
          balanceAfter: newBalance,
          referenceId: orderId,
          referenceType: "order",
          description: `Earned from order ${order.orderNumber}`,
        });

        await db
          .update(orders)
          .set({ deliveredAt: new Date(), updatedAt: new Date() })
          .where(eq(orders.id, orderId));
      });

      await step.sleep("review-delay", "24h");

      await step.run("schedule-review", async () => {
        await inngest.send({
          name: INNGEST_EVENTS.REVIEW_REQUEST_SEND,
          data: { orderId },
        });
      });
    }
  },
);
