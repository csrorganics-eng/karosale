import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateClicks, affiliateCommissions, affiliates } from "@/lib/db/schema";

const CLICK_BURST_WINDOW_MS = 60 * 60 * 1000;
const CLICK_BURST_MAX = 50;

export async function isSelfReferral(userId: string, affiliateId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: affiliates.id })
    .from(affiliates)
    .where(and(eq(affiliates.id, affiliateId), eq(affiliates.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function isClickRateLimited(ip: string | null | undefined): Promise<boolean> {
  if (!ip) return false;
  const since = new Date(Date.now() - CLICK_BURST_WINDOW_MS);
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(affiliateClicks)
    .where(and(eq(affiliateClicks.ipAddress, ip), gte(affiliateClicks.createdAt, since)));
  const count = row?.c ?? 0;
  return count >= CLICK_BURST_MAX;
}

/** Cancel pending/approved commissions and claw back wallet for an order (e.g. full refund). */
export async function reverseCommissionsForRefund(orderId: string): Promise<void> {
  const rows = await db
    .select()
    .from(affiliateCommissions)
    .where(and(eq(affiliateCommissions.orderId, orderId), inArray(affiliateCommissions.status, ["pending", "approved"])));

  for (const c of rows) {
    const amount = parseFloat(c.commissionAmount);
    if (c.status === "approved" && amount > 0) {
      const [aff] = await db.select().from(affiliates).where(eq(affiliates.id, c.affiliateId)).limit(1);
      if (aff) {
        const wb = Math.max(0, parseFloat(aff.walletBalance) - amount);
        const te = Math.max(0, parseFloat(aff.totalEarned) - amount);
        await db
          .update(affiliates)
          .set({
            walletBalance: String(wb),
            totalEarned: String(te),
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, c.affiliateId));
      }
    }
    await db
      .update(affiliateCommissions)
      .set({
        status: "cancelled",
        cancelledReason: "Order refunded",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(affiliateCommissions.id, c.id));
  }
}
