import { sql, and, isNull, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { sendEmail } from "@/lib/resend";
import { sendWhatsAppMessage } from "@/lib/interakt";
import { inngest } from "@/lib/inngest/client";

export const expiryAlertFunction = inngest.createFunction(
  { id: "expiry-alert" },
  { cron: "0 9 * * 1" },
  async ({ step }) => {
    await step.run("alert", async () => {
      const now = new Date();
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      const today = now.toISOString().split("T")[0]!;
      const limit = in30.toISOString().split("T")[0]!;

      const expiring = await db
        .select({
          name: products.name,
          expiryDate: products.expiryDate,
          stockQty: products.stockQty,
        })
        .from(products)
        .where(
          and(
            isNull(products.deletedAt),
            eq(products.isActive, true),
            sql`${products.expiryDate} IS NOT NULL`,
            gte(products.expiryDate, today),
            lte(products.expiryDate, limit),
          ),
        );

      if (expiring.length === 0) return;

      const list = expiring
        .map((p) => `${p.name} — ${p.stockQty} units, expires ${p.expiryDate}`)
        .join("\n");

      const adminPhone = process.env.INTERAKT_ADMIN_PHONE;
      if (adminPhone) {
        await sendWhatsAppMessage({
          phoneNumber: adminPhone,
          templateName: "expiry_alert",
          bodyValues: [String(expiring.length)],
        }).catch(console.error);
      }

      const adminEmail = process.env.RESEND_FROM_EMAIL;
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: "⚠️ Products expiring within 30 days",
          html: `<pre>${list}</pre>`,
        }).catch(console.error);
      }
    });
  },
);
