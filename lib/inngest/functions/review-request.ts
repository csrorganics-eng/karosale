import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, reviews, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/resend";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/interakt";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

export const reviewRequestFunction = inngest.createFunction(
  { id: "review-request-send", retries: 2 },
  { event: INNGEST_EVENTS.REVIEW_REQUEST_SEND },
  async ({ event, step }) => {
    const { orderId } = event.data as { orderId: string };

    const data = await step.run("load", async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) return null;
      const [existing] = await db
        .select()
        .from(reviews)
        .where(and(eq(reviews.orderId, orderId), eq(reviews.userId, order.userId)))
        .limit(1);
      if (existing) return null;
      const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
      return { order, user };
    });

    if (!data) return { skipped: true };

    await step.run("notify", async () => {
      const { order, user } = data;
      const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.id}?review=1`;

      if (user?.phone) {
        try {
          await sendWhatsAppMessage({
            phoneNumber: user.phone,
            templateName: WHATSAPP_TEMPLATES.REVIEW_REQUEST,
            bodyValues: [order.orderNumber],
          });
        } catch (err) {
          console.error("[review-request] whatsapp", err);
        }
      }

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `How was order ${order.orderNumber}?`,
          html: `<p>Share your experience and earn 5 karma points: <a href="${reviewUrl}">Leave a review</a></p>`,
        }).catch(console.error);
      }
    });
  },
);
