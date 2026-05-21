import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  loyaltyTransactions,
  users,
  orders,
} from "@/lib/db/schema";
import { sendWhatsAppMessage } from "@/lib/interakt";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

export const referralRewardFunction = inngest.createFunction(
  { id: "referral-reward" },
  { event: INNGEST_EVENTS.USER_FIRST_ORDER },
  async ({ event, step }) => {
    const { userId, orderId } = event.data as { userId: string; orderId: string };

    await step.run("reward-referrer", async () => {
      const [customer] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!customer?.referredBy) return;

      const [referrer] = await db
        .select()
        .from(users)
        .where(eq(users.id, customer.referredBy))
        .limit(1);
      if (!referrer) return;

      const points = 100;
      const newBalance = referrer.karmaPoints + points;

      await db
        .update(users)
        .set({ karmaPoints: newBalance, updatedAt: new Date() })
        .where(eq(users.id, referrer.id));

      await db.insert(loyaltyTransactions).values({
        userId: referrer.id,
        type: "referral",
        points,
        balanceAfter: newBalance,
        referenceId: orderId,
        referenceType: "order",
        description: "Referral reward — friend placed first order",
      });

      if (referrer.phone) {
        await sendWhatsAppMessage({
          phoneNumber: referrer.phone,
          templateName: "referral_reward",
          bodyValues: [String(points)],
        }).catch(console.error);
      }
    });
  },
);
