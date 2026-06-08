import { and, avg, count, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, reviews } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import { grantReviewApprovalKarmaIfNeeded } from "@/lib/loyalty";

const patchSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "flagged"]),
  adminReply: z.string().max(1000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const [existing] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!existing) return jsonError("Review not found", 404);

    const publishedAt =
      parsed.data.status === "approved" ? new Date() : existing.publishedAt;

    await db
      .update(reviews)
      .set({
        status: parsed.data.status,
        adminReply: parsed.data.adminReply ?? existing.adminReply,
        adminRepliedAt: parsed.data.adminReply ? new Date() : existing.adminRepliedAt,
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, id));

    if (
      parsed.data.status === "approved" &&
      existing.status !== "approved"
    ) {
      await grantReviewApprovalKarmaIfNeeded(existing.userId, id);
    }

    if (parsed.data.status === "approved") {
      const [st] = await db
        .select({
          ar: avg(reviews.rating),
          c: count(),
        })
        .from(reviews)
        .where(and(eq(reviews.productId, existing.productId), eq(reviews.status, "approved")));

      await db
        .update(products)
        .set({
          avgRating: st?.ar != null ? String(st.ar) : "0",
          reviewCount: Number(st?.c ?? 0),
          updatedAt: new Date(),
        })
        .where(eq(products.id, existing.productId));
    }

    const [updated] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    return jsonOk({ review: updated });
  } catch {
    return jsonError("Failed to update review", 500);
  }
}
