import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { loyaltyTiers, loyaltyTransactions, orders, users } from "@/lib/db/schema";
import { KARMA_REDEMPTION_RATE } from "@/lib/orders";

export type TierBenefits = {
  tierId: string;
  name: string;
  discountPct: number;
  freeShippingOn: number | null;
  badgeLabel: string;
  /** From loyalty_tiers.perks JSON — Master Farmer always-on free shipping */
  alwaysFreeShipping?: boolean;
};

/** Resolve loyalty tier row from karma points balance (Phase 2 tiers). */
export async function getTierForPoints(karmaPoints: number): Promise<TierBenefits | null> {
  const rows = await db
    .select({
      id: loyaltyTiers.id,
      name: loyaltyTiers.name,
      discountPct: loyaltyTiers.discountPct,
      freeShippingOn: loyaltyTiers.freeShippingOn,
      badgeLabel: loyaltyTiers.badgeLabel,
      perks: loyaltyTiers.perks,
      minPoints: loyaltyTiers.minPoints,
      maxPoints: loyaltyTiers.maxPoints,
    })
    .from(loyaltyTiers)
    .where(
      and(
        lte(loyaltyTiers.minPoints, karmaPoints),
        or(isNull(loyaltyTiers.maxPoints), gte(loyaltyTiers.maxPoints, karmaPoints)),
      ),
    )
    .orderBy(desc(loyaltyTiers.minPoints))
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  const perks = r.perks as { alwaysFreeShipping?: boolean } | null;
  return {
    tierId: r.id,
    name: r.name,
    discountPct: parseFloat(String(r.discountPct)),
    freeShippingOn: r.freeShippingOn ? parseFloat(String(r.freeShippingOn)) : null,
    badgeLabel: r.badgeLabel,
    alwaysFreeShipping: perks?.alwaysFreeShipping === true,
  };
}

export async function getUserKarmaBalance(userId: string): Promise<number> {
  const [u] = await db
    .select({ karmaPoints: users.karmaPoints })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u?.karmaPoints ?? 0;
}

/**
 * Tier discount applies to merchandise subtotal (before coupon & karma).
 * Free shipping: if subtotal after tier discount meets tier.freeShippingOn (or always when threshold 0 for Master Farmer — encoded as null + discount rules in seed).
 */
export function computeTierDiscount(subtotal: number, tier: TierBenefits | null): number {
  if (!tier || tier.discountPct <= 0) return 0;
  return Math.round(subtotal * (tier.discountPct / 100) * 100) / 100;
}

export function computeKarmaDiscount(
  karmaPointsUsed: number,
  balanceAfterTierAndCoupon: number,
): number {
  if (karmaPointsUsed <= 0) return 0;
  const maxByPoints = karmaPointsUsed / KARMA_REDEMPTION_RATE;
  const maxByCap = balanceAfterTierAndCoupon * 0.5;
  return Math.min(maxByPoints, maxByCap);
}

export function tierGrantsFreeShipping(
  tier: TierBenefits | null,
  subtotalAfterTierDiscount: number,
): boolean {
  if (!tier) return false;
  if (tier.alwaysFreeShipping) return true;
  if (tier.freeShippingOn != null && tier.freeShippingOn > 0) {
    return subtotalAfterTierDiscount >= tier.freeShippingOn;
  }
  return false;
}

/** After online payment capture — deduct karma reserved on the order. Idempotent. */
export async function applyKarmaRedemptionForPaidOrder(orderId: string): Promise<void> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.karmaPointsUsed <= 0) return;

  const pts = order.karmaPointsUsed;

  await db.transaction(async (tx) => {
    const [u] = await tx
      .select()
      .from(users)
      .where(and(eq(users.id, order.userId), sql`${users.karmaPoints} >= ${pts}`))
      .limit(1);
    if (!u) return;

    const [existing] = await tx
      .select({ id: loyaltyTransactions.id })
      .from(loyaltyTransactions)
      .where(
        and(
          eq(loyaltyTransactions.userId, order.userId),
          eq(loyaltyTransactions.referenceId, orderId),
          eq(loyaltyTransactions.type, "redeemed"),
        ),
      )
      .limit(1);
    if (existing) return;

    const newBal = u.karmaPoints - pts;
    await tx
      .update(users)
      .set({ karmaPoints: newBal, updatedAt: new Date() })
      .where(eq(users.id, order.userId));

    await tx.insert(loyaltyTransactions).values({
      userId: order.userId,
      type: "redeemed",
      points: -pts,
      balanceAfter: newBal,
      referenceId: orderId,
      referenceType: "order",
      description: `Redeemed ${pts} karma points for order ${order.orderNumber}`,
    });
  });
}

const TIER_NAME_TO_ENUM: Record<string, "seedling" | "grower" | "harvester" | "master_farmer"> = {
  Seedling: "seedling",
  Grower: "grower",
  Harvester: "harvester",
  "Master Farmer": "master_farmer",
};

export async function syncUserKarmaTierFromPoints(userId: string): Promise<void> {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return;
  const tier = await getTierForPoints(u.karmaPoints);
  const name = tier?.name ?? "Seedling";
  const karmaTier = TIER_NAME_TO_ENUM[name] ?? "seedling";
  await db
    .update(users)
    .set({ karmaTier, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
