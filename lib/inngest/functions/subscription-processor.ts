import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, products, users, productVariants } from "@/lib/db/schema";
import { sendWhatsAppMessage } from "@/lib/interakt";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { createSubscriptionRenewalOrder } from "@/lib/subscription-renewal";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
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
  return addDays(current, days);
}

export const subscriptionProcessorFunction = inngest.createFunction(
  { id: "subscription-processor" },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    const today = new Date().toISOString().split("T")[0]!;
    const reminderDate = addDays(today, 2);

    await step.run("remind-upcoming", async () => {
      const upcoming = await db
        .select()
        .from(subscriptions)
        .where(
          and(eq(subscriptions.status, "active"), eq(subscriptions.nextOrderDate, reminderDate)),
        );

      for (const sub of upcoming) {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, sub.productId))
          .limit(1);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, sub.userId))
          .limit(1);
        if (!user?.phone || !product) continue;
        try {
          await sendWhatsAppMessage({
            phoneNumber: user.phone,
            templateName: "subscription_reminder",
            bodyValues: [product.name, String(sub.nextOrderDate)],
          });
        } catch {
          await sendWhatsAppMessage({
            phoneNumber: user.phone,
            templateName: "subscription_renewal",
            bodyValues: [product.name, `ships in 2 days (${reminderDate})`],
          }).catch(console.error);
        }
      }
      return { reminders: upcoming.length };
    });

    const due = await step.run("find-due", async () => {
      return db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.status, "active"), eq(subscriptions.nextOrderDate, today)));
    });

    for (const sub of due) {
      await step.run(`process-${sub.id}`, async () => {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, sub.productId))
          .limit(1);

        if (!product) {
          return { skipped: "no_product" };
        }

        if (sub.variantId) {
          const [v] = await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.id, sub.variantId))
            .limit(1);
          if (!v || v.stockQty < sub.qty) {
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.id, sub.userId))
              .limit(1);
            if (user?.phone) {
              await sendWhatsAppMessage({
                phoneNumber: user.phone,
                templateName: "subscription_stock_issue",
                bodyValues: [product.name],
              }).catch(console.error);
            }
            return { skipped: "stock" };
          }
        } else if (product.stockQty < sub.qty) {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, sub.userId))
            .limit(1);
          if (user?.phone) {
            await sendWhatsAppMessage({
              phoneNumber: user.phone,
              templateName: "subscription_stock_issue",
              bodyValues: [product.name],
            }).catch(console.error);
          }
          return { skipped: "stock" };
        }

        const result = await db.transaction(async (tx) => {
          const [fresh] = await tx
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.id, sub.id))
            .limit(1);
          if (!fresh || fresh.status !== "active") {
            return { skipped: "state" as const };
          }
          const raw = fresh.nextOrderDate as unknown;
          const freshDate =
            raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw).slice(0, 10);
          if (freshDate !== today) {
            return { skipped: "state" as const };
          }

          const created = await createSubscriptionRenewalOrder(tx, fresh);
          if ("error" in created) {
            return { error: created.error };
          }

          const nextD = nextDateFromFrequency(today, fresh.frequency);
          await tx
            .update(subscriptions)
            .set({
              nextOrderDate: nextD,
              totalOrdersCreated: fresh.totalOrdersCreated + 1,
              lastOrderId: created.orderId,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, fresh.id));

          return { orderId: created.orderId };
        });

        if ("orderId" in result && result.orderId) {
          await inngest.send({
            name: INNGEST_EVENTS.ORDER_COD_PLACED,
            data: { orderId: result.orderId },
          });
          await inngest.send({
            name: INNGEST_EVENTS.ORDER_PLACED,
            data: { orderId: result.orderId },
          });
          return { orderId: result.orderId };
        }

        if ("error" in result && result.error === "no_address") {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, sub.userId))
            .limit(1);
          if (user?.phone) {
            await sendWhatsAppMessage({
              phoneNumber: user.phone,
              templateName: "subscription_renewal",
              bodyValues: [
                product.name,
                "Add a delivery address to auto-renew your subscription.",
              ],
            }).catch(console.error);
          }
        }

        return result;
      });
    }

    return { processed: due.length };
  },
);
