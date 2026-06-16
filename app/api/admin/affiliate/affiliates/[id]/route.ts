import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliates, users } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import type { AffiliateRow } from "@/lib/affiliate/types";
import { sendAffiliateApprovedEmail, sendAffiliateRejectedEmail } from "@/lib/affiliate/notifications";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    reason: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("suspend"),
    notes: z.string().max(2000).optional(),
  }),
  z.object({ action: z.literal("reactivate") }),
]);

function toAffiliateRow(row: typeof affiliates.$inferSelect): AffiliateRow {
  return {
    id: row.id,
    userId: row.userId,
    username: row.username,
    status: row.status,
    referredByAffiliateId: row.referredByAffiliateId,
    tierLevel: row.tierLevel,
    totalEarned: row.totalEarned,
    totalPaid: row.totalPaid,
    walletBalance: row.walletBalance,
    razorpayContactId: row.razorpayContactId,
    razorpayFundAccountId: row.razorpayFundAccountId,
    bankAccountNumber: row.bankAccountNumber,
    bankIfsc: row.bankIfsc,
    bankAccountName: row.bankAccountName,
    upiId: row.upiId,
    emailNotificationsEnabled: row.emailNotificationsEnabled,
    approvedAt: row.approvedAt,
    approvedByAdminId: row.approvedByAdminId,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const { id: rawId } = await params;
    const id = Number.parseInt(rawId, 10);
    if (!Number.isFinite(id) || id < 1) return jsonError("Invalid affiliate id", 400);

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const [existing] = await db.select().from(affiliates).where(eq(affiliates.id, id)).limit(1);
    if (!existing) return jsonError("Affiliate not found", 404);

    const adminId = session.user.id;
    const now = new Date();
    const action = parsed.data.action;

    if (action === "approve") {
      if (existing.status !== "pending") {
        return jsonError("Only pending applications can be approved", 400);
      }
      await db
        .update(affiliates)
        .set({
          status: "active",
          approvedAt: now,
          approvedByAdminId: adminId,
          updatedAt: now,
        })
        .where(eq(affiliates.id, id));
    } else if (action === "reject") {
      if (existing.status !== "pending") {
        return jsonError("Only pending applications can be rejected", 400);
      }
      const reason = (parsed.data.reason?.trim() || "No reason provided") as string;
      await db
        .update(affiliates)
        .set({
          status: "rejected",
          notes: reason,
          approvedAt: null,
          approvedByAdminId: adminId,
          updatedAt: now,
        })
        .where(eq(affiliates.id, id));
    } else if (action === "suspend") {
      if (existing.status !== "active") {
        return jsonError("Only active affiliates can be suspended", 400);
      }
      await db
        .update(affiliates)
        .set({
          status: "suspended",
          notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : existing.notes,
          updatedAt: now,
        })
        .where(eq(affiliates.id, id));
    } else {
      if (existing.status !== "suspended") {
        return jsonError("Only suspended affiliates can be reactivated", 400);
      }
      await db
        .update(affiliates)
        .set({
          status: "active",
          updatedAt: now,
        })
        .where(eq(affiliates.id, id));
    }

    const [updated] = await db.select().from(affiliates).where(eq(affiliates.id, id)).limit(1);
    if (!updated) return jsonError("Update failed", 500);

    const [userRow] = await db.select({ email: users.email }).from(users).where(eq(users.id, updated.userId)).limit(1);
    const email = userRow?.email?.trim();
    const affiliateRow = toAffiliateRow(updated);

    if (email && updated.emailNotificationsEnabled) {
      if (action === "approve") {
        await sendAffiliateApprovedEmail(affiliateRow, email).catch((e) => console.error("[affiliate approve email]", e));
      } else if (action === "reject") {
        const reason = updated.notes?.trim() || "No reason provided";
        await sendAffiliateRejectedEmail(affiliateRow, email, reason).catch((e) =>
          console.error("[affiliate reject email]", e),
        );
      }
    }

    return jsonOk({ affiliate: updated });
  } catch (e) {
    if (e instanceof Error && (e.message === "Unauthorized" || e.message === "Forbidden")) {
      return jsonError(e.message, e.message === "Unauthorized" ? 401 : 403);
    }
    console.error("[PATCH /api/admin/affiliate/affiliates/[id]]", e);
    return jsonError("Failed to update affiliate", 500);
  }
}
