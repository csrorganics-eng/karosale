import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartAbandonment, notificationsLog } from "@/lib/db/schema";
import { sendEmail } from "@/lib/resend";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/interakt";
import { sendOtpSms } from "@/lib/fast2sms";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

export const cartAbandonmentFunction = inngest.createFunction(
  { id: "cart-abandonment", cancelOn: [{ event: INNGEST_EVENTS.ORDER_PLACED }] },
  { event: INNGEST_EVENTS.CART_ABANDONED },
  async ({ event, step }) => {
    const { abandonmentId } = event.data as { abandonmentId: string };

    const record = await step.run("load", async () => {
      const [row] = await db
        .select()
        .from(cartAbandonment)
        .where(eq(cartAbandonment.id, abandonmentId))
        .limit(1);
      return row;
    });

    if (!record?.isActive) return { skipped: true };

    await step.sleep("step-1-wait", "1h");

    const stillActive = await step.run("check-step1", async () => {
      const [row] = await db
        .select()
        .from(cartAbandonment)
        .where(eq(cartAbandonment.id, abandonmentId))
        .limit(1);
      return row?.isActive && !row.recoveredAt;
    });

    if (!stillActive) return { cancelled: true };

    // --- Push notification: gentle cart reminder ---
    await step.run("step-1-push", async () => {
      if (!record.userId) return;
      try {
        const { sendPushToUser } = await import("@/lib/push/expo");
        await sendPushToUser(record.userId, {
          title: "🛒 Still thinking it over?",
          body: `Your bag with ₹${Number(record.cartValue).toLocaleString("en-IN")} of organic products is waiting for you.`,
          data: { screen: "cart" },
          sound: "default",
          channelId: "reminders",
          priority: "normal",
        });
        await db.insert(notificationsLog).values({
          channel: "push",
          templateName: "cart_abandonment_push_step1",
          status: "sent",
          payload: { abandonmentId, cartValue: record.cartValue },
          sentAt: new Date(),
        });
      } catch (err) {
        console.error("[cart-abandonment] step-1-push:", err);
      }
    });

    await step.run("step-1-whatsapp", async () => {
      if (!record.phone) return;
      try {
        await sendWhatsAppMessage({
          phoneNumber: record.phone,
          templateName: WHATSAPP_TEMPLATES.CART_ABANDONED,
          bodyValues: [String(record.cartValue)],
        });
        await db
          .update(cartAbandonment)
          .set({ step1SentAt: new Date(), updatedAt: new Date() })
          .where(eq(cartAbandonment.id, abandonmentId));
      } catch (err) {
        console.error("[cart-abandonment] step1", err);
      }
    });

    await step.sleep("step-2-wait", "23h");

    const stillActive2 = await step.run("check-step2", async () => {
      const [row] = await db
        .select()
        .from(cartAbandonment)
        .where(eq(cartAbandonment.id, abandonmentId))
        .limit(1);
      return row?.isActive && !row.recoveredAt;
    });

    if (!stillActive2) return { cancelled: true };

    await step.run("step-2-email", async () => {
      if (!record.email) return;
      try {
        await sendEmail({
          to: record.email,
          subject: "You left something behind 🌱",
          html: `<p>Your cart (₹${record.cartValue}) is waiting. <a href="${process.env.NEXT_PUBLIC_APP_URL}/cart">Complete your order</a></p>`,
        });
        await db
          .update(cartAbandonment)
          .set({ step2SentAt: new Date(), updatedAt: new Date() })
          .where(eq(cartAbandonment.id, abandonmentId));
      } catch (err) {
        console.error("[cart-abandonment] step2", err);
      }
    });

    await step.sleep("step-3-wait", "24h");

    await step.run("step-3-sms", async () => {
      const [row] = await db
        .select()
        .from(cartAbandonment)
        .where(eq(cartAbandonment.id, abandonmentId))
        .limit(1);
      if (!row?.isActive || row.recoveredAt || !row.phone) return;
      try {
        await sendOtpSms(row.phone, "CART1");
        await db
          .update(cartAbandonment)
          .set({ step3SentAt: new Date(), updatedAt: new Date() })
          .where(eq(cartAbandonment.id, abandonmentId));
        await db.insert(notificationsLog).values({
          channel: "sms",
          templateName: "cart_abandonment_step3",
          status: "sent",
          payload: { abandonmentId },
          sentAt: new Date(),
        });
      } catch (err) {
        console.error("[cart-abandonment] step3", err);
      }
    });
  },
);
