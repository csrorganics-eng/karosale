import { db } from "@/lib/db";
import { notificationsLog } from "@/lib/db/schema";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "@/lib/interakt";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

export const lowStockAlertFunction = inngest.createFunction(
  { id: "low-stock-alert", retries: 1 },
  { event: INNGEST_EVENTS.INVENTORY_LOW_STOCK },
  async ({ event, step }) => {
    const { productName, stockQty } = event.data as {
      productId: string;
      productName: string;
      stockQty: number;
    };

    await step.run("notify-admin", async () => {
      const adminPhone = process.env.INTERAKT_ADMIN_PHONE;
      if (!adminPhone) return;

      try {
        await sendWhatsAppMessage({
          phoneNumber: adminPhone,
          templateName: WHATSAPP_TEMPLATES.LOW_STOCK,
          bodyValues: [productName, String(stockQty)],
        });
        await db.insert(notificationsLog).values({
          channel: "whatsapp",
          templateName: WHATSAPP_TEMPLATES.LOW_STOCK,
          status: "sent",
          payload: { productName, stockQty },
          sentAt: new Date(),
        });
      } catch (err) {
        console.error("[low-stock-alert]", err);
      }
    });
  },
);
