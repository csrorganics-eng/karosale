import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packagingTags } from "@/lib/db/schema";
import { inngest, INNGEST_EVENTS } from "@/lib/inngest/client";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return jsonError("Order not found", 404);

    if (order.packagingTagUrl) {
      return jsonOk({ pdfUrl: order.packagingTagUrl });
    }

    const [tag] = await db
      .select()
      .from(packagingTags)
      .where(eq(packagingTags.orderId, id))
      .limit(1);

    if (tag?.pdfUrl) {
      return jsonOk({ pdfUrl: tag.pdfUrl });
    }

    await inngest.send({
      name: INNGEST_EVENTS.PACKAGING_TAG_GENERATE,
      data: { orderId: id },
    });

    return jsonOk({ status: "generating", message: "Packaging tag is being generated" });
  } catch (error) {
    return jsonError("Failed to get packaging tag", 500);
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;

    await inngest.send({
      name: INNGEST_EVENTS.PACKAGING_TAG_GENERATE,
      data: { orderId: id },
    });

    const [tag] = await db
      .select()
      .from(packagingTags)
      .where(eq(packagingTags.orderId, id))
      .limit(1);

    if (tag) {
      await db
        .update(packagingTags)
        .set({
          printCount: tag.printCount + 1,
          printedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(packagingTags.orderId, id));
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

    return jsonOk({
      pdfUrl: order?.packagingTagUrl ?? tag?.pdfUrl,
      printCount: (tag?.printCount ?? 0) + 1,
    });
  } catch (error) {
    return jsonError("Failed to reprint tag", 500);
  }
}
