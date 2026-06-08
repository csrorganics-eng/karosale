import { sql, gte, and, isNull, eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { orders, products, users } from "@/lib/db/schema";
import { sendWhatsAppMessage } from "@/lib/interakt";
import { BRAND_NAME } from "@/lib/brand";

export const dailyAdminReportFunction = inngest.createFunction(
  { id: "daily-admin-report" },
  { cron: "0 20 * * *" },
  async ({ step }) => {
    await step.run("send-report", async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [todayAgg] = await db
        .select({
          gmv: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
          orderCount: sql<number>`COUNT(*)::int`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, todayStart),
            sql`${orders.status} NOT IN ('cancelled', 'refunded')`,
          ),
        );

      const [pendingAgg] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(
          sql`${orders.status} IN ('pending', 'confirmed', 'processing', 'packed')`,
        );

      const lowStock = await db
        .select({ name: products.name, stock: products.stockQty })
        .from(products)
        .where(
          and(
            isNull(products.deletedAt),
            eq(products.isActive, true),
            sql`${products.stockQty} <= ${products.lowStockThreshold}`,
          ),
        )
        .limit(5);

      const [newCustomers] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(gte(users.createdAt, todayStart));

      const adminPhone = process.env.INTERAKT_ADMIN_PHONE;
      if (!adminPhone) return;

      const lowStockText =
        lowStock.length > 0
          ? lowStock.map((p) => `${p.name}: ${p.stock}`).join(", ")
          : "None";

      const message = [
        `${BRAND_NAME} Daily Report`,
        `Orders: ${todayAgg?.orderCount ?? 0}`,
        `GMV: ₹${parseFloat(todayAgg?.gmv ?? "0").toFixed(0)}`,
        `Pending: ${pendingAgg?.count ?? 0}`,
        `New customers: ${newCustomers?.count ?? 0}`,
        `Low stock: ${lowStockText}`,
      ].join(" | ");

      await sendWhatsAppMessage({
        phoneNumber: adminPhone,
        templateName: "admin_daily_report",
        bodyValues: [message],
      }).catch(console.error);
    });
  },
);
