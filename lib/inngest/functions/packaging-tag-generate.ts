import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  addresses,
  orderItems,
  orders,
  packagingTags,
  users,
} from "@/lib/db/schema";
import { uploadToR2 } from "@/lib/r2";
import { generatePackagingPdfBuffer } from "@/lib/pdf/generate-packaging-pdf";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";

export const packagingTagGenerateFunction = inngest.createFunction(
  { id: "packaging-tag-generate", retries: 2 },
  { event: INNGEST_EVENTS.PACKAGING_TAG_GENERATE },
  async ({ event, step }) => {
    const { orderId } = event.data as { orderId: string };

    const data = await step.run("fetch-order", async () => {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) return null;

      const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
      const [address] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, order.addressId))
        .limit(1);
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      const [tag] = await db
        .select()
        .from(packagingTags)
        .where(eq(packagingTags.orderId, orderId))
        .limit(1);

      return { order, user, address, items, tag };
    });

    if (!data?.order) return { success: false, reason: "order_not_found" };

    const pdfUrl = await step.run("generate-and-upload", async () => {
      const { order, user, address, items, tag } = data;
      const barcodeLabel = tag?.barcodeString ?? order.orderNumber;

      let buffer: Buffer;
      let ext: "pdf" | "txt" = "pdf";
      try {
        buffer = await generatePackagingPdfBuffer({
          orderNumber: order.orderNumber,
          customerName: user?.name ?? "Customer",
          phone: address?.phone ?? user?.phone ?? "",
          addressLines: [
            address?.line1 ?? "",
            `${address?.city ?? ""}, ${address?.state ?? ""} - ${address?.pincode ?? ""}`,
          ].filter(Boolean),
          items: items.map((i) => ({
            name: i.productName,
            sku: i.productSku,
            qty: i.qty,
          })),
          barcodeLabel,
          packedDate: new Date().toLocaleDateString("en-IN"),
        });
      } catch (err) {
        console.error("[packaging-tag] PDF render failed, using text fallback:", err);
        ext = "txt";
        const lines = [
          "KAROSALE — PACKING SLIP",
          `ORDER #${order.orderNumber}`,
          `Barcode: ${barcodeLabel}`,
        ];
        buffer = Buffer.from(lines.join("\n"), "utf-8");
      }

      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, "0");
      const key = `packaging-tags/${year}/${month}/${order.orderNumber}.${ext}`;

      try {
        const url = await uploadToR2({
          key,
          body: buffer,
          contentType: ext === "pdf" ? "application/pdf" : "text/plain",
        });

        await db
          .update(packagingTags)
          .set({ pdfUrl: url, updatedAt: new Date() })
          .where(eq(packagingTags.orderId, orderId));

        await db
          .update(orders)
          .set({ packagingTagUrl: url, updatedAt: new Date() })
          .where(eq(orders.id, orderId));

        return url;
      } catch (err) {
        console.error("[packaging-tag] R2 upload failed:", err);
        return null;
      }
    });

    return { success: true, pdfUrl };
  },
);
