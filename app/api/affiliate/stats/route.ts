import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliateClicks, affiliateCommissions, affiliates } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);

    const [aff] = await db.select().from(affiliates).where(eq(affiliates.userId, session.user.id)).limit(1);
    if (!aff) return jsonOk({ affiliate: null });

    const [clickRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.affiliateId, aff.id));

    const [convRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(affiliateClicks)
      .where(and(eq(affiliateClicks.affiliateId, aff.id), eq(affiliateClicks.converted, true)));

    const [earnRow] = await db
      .select({ s: sql<string>`coalesce(sum(${affiliateCommissions.commissionAmount})::text,'0')` })
      .from(affiliateCommissions)
      .where(and(eq(affiliateCommissions.affiliateId, aff.id), eq(affiliateCommissions.status, "approved")));

    const clicks = clickRow?.c ?? 0;
    const conv = convRow?.c ?? 0;
    const earned = parseFloat(earnRow?.s ?? "0") || 0;

    return jsonOk({
      affiliate: aff,
      stats: {
        totalClicks: clicks,
        conversions: conv,
        conversionRate: clicks > 0 ? Math.round((conv / clicks) * 10000) / 100 : 0,
        walletBalance: parseFloat(aff.walletBalance),
        totalEarned: parseFloat(aff.totalEarned),
        totalPaid: parseFloat(aff.totalPaid),
        pendingCommission: earned,
      },
    });
  } catch (e) {
    console.error("[GET /api/affiliate/stats]", e);
    return jsonError("Failed to load stats", 500);
  }
}
