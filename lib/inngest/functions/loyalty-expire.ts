import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { loyaltyTransactions, users } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { syncUserKarmaTierFromPoints } from "@/lib/loyalty";

/** Monthly — expire earned points past expiresAt (12 months from earn). Idempotent per earn row. */
export const loyaltyExpireFunction = inngest.createFunction(
  { id: "loyalty-expire" },
  { cron: "0 5 1 * *" },
  async ({ step }) => {
    await step.run("expire-earned-points", async () => {
      const now = new Date();
      const earned = await db
        .select()
        .from(loyaltyTransactions)
        .where(
          and(
            eq(loyaltyTransactions.type, "earned"),
            isNotNull(loyaltyTransactions.expiresAt),
            lte(loyaltyTransactions.expiresAt, now),
            gte(loyaltyTransactions.points, 1),
          ),
        )
        .limit(200);

      let processed = 0;
      for (const row of earned) {
        if (!row.expiresAt) continue;

        const [already] = await db
          .select({ id: loyaltyTransactions.id })
          .from(loyaltyTransactions)
          .where(
            and(
              eq(loyaltyTransactions.type, "expired"),
              eq(loyaltyTransactions.referenceId, row.id),
              eq(loyaltyTransactions.referenceType, "loyalty_earn"),
            ),
          )
          .limit(1);
        if (already) continue;

        await db.transaction(async (tx) => {
          const [u] = await tx.select().from(users).where(eq(users.id, row.userId)).limit(1);
          if (!u) return;
          const newBal = Math.max(0, u.karmaPoints - row.points);
          await tx
            .update(users)
            .set({ karmaPoints: newBal, updatedAt: new Date() })
            .where(eq(users.id, row.userId));

          await tx.insert(loyaltyTransactions).values({
            userId: row.userId,
            type: "expired",
            points: -row.points,
            balanceAfter: newBal,
            referenceId: row.id,
            referenceType: "loyalty_earn",
            description: `Expired ${row.points} karma points from earlier activity`,
          });
        });

        await syncUserKarmaTierFromPoints(row.userId);
        processed++;
      }

      return { processed };
    });
  },
);
