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

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  confirmed: {
    title: "✅ Order confirmed",
    body: "Your order is confirmed and being prepared.",
  },
  processing: {
    title: "📦 Order is being packed",
    body: "Our team is packing your organic products.",
  },
  packed: {
    title: "📦 Ready to ship",
    body: "Your order is packed and will be handed to the courier soon.",
  },
  shipped: {
    title: "🚚 Order shipped!",
    body: "Your order is on the way. Track it in the app.",
  },
  out_for_delivery: {
    title: "📍 Out for delivery today!",
    body: "Your CSR Organics order will arrive today. Be available to receive it.",
  },
  delivered: {
    title: "🎉 Delivered!",
    body: "Your order has been delivered. Enjoy your organic products! Tap to review.",
  },
  cancelled: {
    title: "❌ Order cancelled",
    body: "Your order has been cancelled. Any payment will be refunded in 5–7 days.",
  },
  returned: {
    title: "↩️ Return confirmed",
    body: "Your return has been processed. Refund will be initiated shortly.",
  },
  refunded: {
    title: "💳 Refund processed",
    body: "Your refund has been initiated and will reflect in 5–7 business days.",
  },
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
      if (!order || !user) return;

      const msg = STATUS_MESSAGES[status] ?? {
        title: `Order update`,
        body: `Your order ${order.orderNumber} status: ${status}`,
      };

      // --- Push notification (mobile) ---
      try {
        const { sendPushToUser } = await import("@/lib/push/expo");
        await sendPushToUser(user.id, {
          title: `${msg.title} · ${order.orderNumber}`,
          body: msg.body,
          data: { screen: "order", orderId, orderNumber: order.orderNumber, status },
          sound: "default",
          channelId: "orders",
          priority: status === "out_for_delivery" || status === "delivered" ? "high" : "default",
        });
        await db.insert(notificationsLog).values({
          userId: user.id,
          orderId,
          channel: "push",
          templateName: "order_status_push",
          status: "sent",
          payload: { status, title: msg.title },
          sentAt: new Date(),
        });
      } catch (err) {
        console.error("[order-status-changed] Push failed:", err);
      }

      // --- WhatsApp ---
      if (user.phone) {
        try {
          await sendWhatsAppMessage({
            phoneNumber: user.phone,
            templateName: WHATSAPP_TEMPLATES.ORDER_SHIPPED,
            bodyValues: [order.orderNumber, msg.body],
          });
          await db.insert(notificationsLog).values({
            userId: user.id,
            orderId,
            channel: "whatsapp",
            templateName: "order_status_update",
            status: "sent",
            payload: { status, message: msg.body },
            sentAt: new Date(),
          });
        } catch (err) {
          console.error("[order-status-changed] WhatsApp failed:", err);
        }
      }

      // --- Email ---
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: `${msg.title} — Order ${order.orderNumber}`,
          html: `<p>${msg.body}</p><p><a href="${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/orders/${orderId}">View order details</a></p>`,
        }).catch(console.error);
      }

      // ── Admin push alert ───────────────────────────────────────────────────
      // Admin messages are different from shopper messages — they focus on
      // action needed (cancellations/returns need refund processing; new
      // payments need fulfilment; all statuses help the ops team track flow).
      const ADMIN_ALERT: Record<string, { title: string; body: string; priority: "high" | "default" }> = {
        // Customer-initiated, need admin action
        cancelled: {
          title: "❌ Order cancelled by customer",
          body: `#${order.orderNumber} was cancelled. Refund/restocking may be needed.`,
          priority: "high",
        },
        returned: {
          title: "↩️ Return request confirmed",
          body: `#${order.orderNumber} — process pickup & refund.`,
          priority: "high",
        },
        refunded: {
          title: "💳 Refund initiated",
          body: `#${order.orderNumber} refund was triggered. Verify in payment gateway.`,
          priority: "high",
        },
        // Fulfilment milestones — informational for ops
        confirmed: {
          title: "✅ Payment confirmed — ready to pack",
          body: `#${order.orderNumber} · ₹${Number(order.total).toLocaleString("en-IN")} — start packing.`,
          priority: "high",
        },
        processing: {
          title: "📦 Order in processing",
          body: `#${order.orderNumber} is being packed by the team.`,
          priority: "default",
        },
        packed: {
          title: "📦 Packed — awaiting handover",
          body: `#${order.orderNumber} is packed and ready for courier pickup.`,
          priority: "default",
        },
        shipped: {
          title: "🚚 Handed to courier",
          body: `#${order.orderNumber} has been shipped.`,
          priority: "default",
        },
        out_for_delivery: {
          title: "📍 Out for delivery",
          body: `#${order.orderNumber} is out for delivery today.`,
          priority: "default",
        },
        delivered: {
          title: "🎉 Delivered successfully",
          body: `#${order.orderNumber} was delivered. Karma points will be awarded.`,
          priority: "default",
        },
      };

      const adminAlert = ADMIN_ALERT[status];
      if (adminAlert) {
        try {
          const { sendPushToAdmins } = await import("@/lib/push/expo");
          await sendPushToAdmins({
            title: adminAlert.title,
            body: adminAlert.body,
            data: { screen: "admin-order", orderId, orderNumber: order.orderNumber, status },
            sound: "default",
            channelId: "orders",
            priority: adminAlert.priority,
          });
        } catch (err) {
          console.error("[order-status-changed] Admin push failed:", err);
        }
      }
    });

    if (status === "delivered") {
      await step.run("affiliate-order-complete", async () => {
        const { triggerAffiliateCommissionFromOrderLifecycle } = await import("@/lib/affiliate/engine");
        await triggerAffiliateCommissionFromOrderLifecycle({ orderId, event: "order_delivered" });
      });

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
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });

        const { syncUserKarmaTierFromPoints } = await import("@/lib/loyalty");
        await syncUserKarmaTierFromPoints(user.id);

        await db
          .update(orders)
          .set({ deliveredAt: new Date(), updatedAt: new Date() })
          .where(eq(orders.id, orderId));

        // Push: karma points earned
        try {
          const { sendPushToUser } = await import("@/lib/push/expo");
          await sendPushToUser(user.id, {
            title: `✨ You earned ${points} Karma points!`,
            body: `Points from order ${order.orderNumber} are now in your account. Use them for discounts at checkout.`,
            data: { screen: "loyalty" },
            sound: "default",
            channelId: "orders",
            priority: "normal",
          });
        } catch (err) {
          console.error("[order-status-changed] karma push:", err);
        }
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
