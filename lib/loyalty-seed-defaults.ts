import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { loyaltyTiers } from "@/lib/db/schema";

/** Matches `scripts/seed-test-data.ts` — used when DB has no tiers (fresh deploy without seed). */
const DEFAULT_LOYALTY_TIERS = [
  {
    name: "Seedling",
    minPoints: 0,
    maxPoints: 499,
    discountPct: "0",
    badgeLabel: "Seedling",
    badgeColor: "#A8D5BA",
    freeShippingOn: null as string | null,
    perks: null as Record<string, unknown> | null,
  },
  {
    name: "Grower",
    minPoints: 500,
    maxPoints: 1999,
    discountPct: "3",
    badgeLabel: "Grower",
    badgeColor: "#6FAF8F",
    freeShippingOn: null,
    perks: null,
  },
  {
    name: "Harvester",
    minPoints: 2000,
    maxPoints: 4999,
    discountPct: "5",
    badgeLabel: "Harvester",
    badgeColor: "#1e4d3a",
    freeShippingOn: "299",
    perks: null,
  },
  {
    name: "Master Farmer",
    minPoints: 5000,
    maxPoints: null as number | null,
    discountPct: "8",
    badgeLabel: "Master Farmer",
    badgeColor: "#1e4d3a",
    freeShippingOn: null,
    perks: { alwaysFreeShipping: true } as Record<string, unknown>,
  },
] as const;

/**
 * Ensures at least one loyalty tier row exists. Safe to call from read handlers;
 * uses a transaction + count so concurrent first requests rarely duplicate.
 */
export async function ensureLoyaltyTiersPopulated(): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ c: sql<number>`count(*)::int` })
      .from(loyaltyTiers);
    const count = Number(row?.c ?? 0);
    if (count > 0) return;
    await tx.insert(loyaltyTiers).values([...DEFAULT_LOYALTY_TIERS]);
  });
}
