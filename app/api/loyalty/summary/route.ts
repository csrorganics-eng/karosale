import { asc, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { loyaltyTiers, loyaltyTransactions, users } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import { getTierForPoints, getUserKarmaBalance } from "@/lib/loyalty";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);

    const userId = session.user.id;
    const [user] = await db
      .select({ referralCode: users.referralCode })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const balance = await getUserKarmaBalance(userId);
    const tier = await getTierForPoints(balance);

    const tiers = await db
      .select({
        id: loyaltyTiers.id,
        name: loyaltyTiers.name,
        minPoints: loyaltyTiers.minPoints,
        maxPoints: loyaltyTiers.maxPoints,
        discountPct: loyaltyTiers.discountPct,
        badgeLabel: loyaltyTiers.badgeLabel,
        badgeColor: loyaltyTiers.badgeColor,
        freeShippingOn: loyaltyTiers.freeShippingOn,
      })
      .from(loyaltyTiers)
      .orderBy(asc(loyaltyTiers.minPoints));

    const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
    let nextTier: (typeof sorted)[0] | null = null;
    let pointsToNext: number | null = null;
    if (tier) {
      const higher = sorted.filter((t) => t.minPoints > balance);
      if (higher[0]) {
        nextTier = higher[0];
        pointsToNext = Math.max(0, nextTier.minPoints - balance);
      }
    } else if (sorted[0]) {
      nextTier = sorted[0];
      pointsToNext = Math.max(0, sorted[0].minPoints - balance);
    }

    const history = await db
      .select({
        id: loyaltyTransactions.id,
        type: loyaltyTransactions.type,
        points: loyaltyTransactions.points,
        balanceAfter: loyaltyTransactions.balanceAfter,
        description: loyaltyTransactions.description,
        createdAt: loyaltyTransactions.createdAt,
      })
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.userId, userId))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(50);

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const referralCode = user?.referralCode ?? null;
    const referralLink = referralCode
      ? `${baseUrl}/account?ref=${encodeURIComponent(referralCode)}`
      : null;

    return jsonOk({
      karmaPoints: balance,
      tier: tier
        ? {
            name: tier.name,
            discountPct: tier.discountPct,
            badgeLabel: tier.badgeLabel,
            alwaysFreeShipping: tier.alwaysFreeShipping ?? false,
            freeShippingOn: tier.freeShippingOn,
          }
        : null,
      nextTier: nextTier
        ? {
            name: nextTier.name,
            minPoints: nextTier.minPoints,
            discountPct: String(nextTier.discountPct),
            badgeLabel: nextTier.badgeLabel,
          }
        : null,
      pointsToNext,
      tiers,
      history,
      referralCode,
      referralLink,
    });
  } catch (e) {
    console.error("[GET /api/loyalty/summary]", e);
    return jsonError("Failed to load loyalty summary", 500);
  }
}
