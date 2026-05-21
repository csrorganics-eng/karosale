import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, products, users } from "@/lib/db/schema";
import { sendWhatsAppMessage } from "@/lib/interakt";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

function nextDateFromFrequency(
  current: string,
  frequency: "weekly" | "fortnightly" | "monthly" | "bimonthly",
): string {
  const days =
    frequency === "weekly"
      ? 7
      : frequency === "fortnightly"
        ? 14
        : frequency === "monthly"
          ? 30
          : 60;
  return addDays(new Date(current), days);
}

export const subscriptionProcessorFunction = inngest.createFunction(
  { id: "subscription-processor" },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    const today = new Date().toISOString().split("T")[0]!;

    const due = await step.run("find-due", async () => {
      return db
        .select()
        .from(subscriptions)
        .where(
          and(eq(subscriptions.status, "active"), eq(subscriptions.nextOrderDate, today)),
        );
    });

    for (const sub of due) {
      await step.run(`process-${sub.id}`, async () => {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, sub.productId))
          .limit(1);

        if (!product || product.stockQty < sub.qty) {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, sub.userId))
            .limit(1);
          if (user?.phone) {
            await sendWhatsAppMessage({
              phoneNumber: user.phone,
              templateName: "subscription_stock_issue",
              bodyValues: [product?.name ?? "Product"],
            }).catch(console.error);
          }
          return;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, sub.userId))
          .limit(1);
        if (user?.phone) {
          await sendWhatsAppMessage({
            phoneNumber: user.phone,
            templateName: "subscription_renewal",
            bodyValues: [product.name, today],
          }).catch(console.error);
        }

        await db
          .update(subscriptions)
          .set({
            nextOrderDate: nextDateFromFrequency(today, sub.frequency),
            totalOrdersCreated: sub.totalOrdersCreated + 1,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, sub.id));
      });
    }

    return { processed: due.length };
  },
);
