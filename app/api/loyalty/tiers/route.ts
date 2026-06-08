import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { loyaltyTiers } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import { ensureLoyaltyTiersPopulated } from "@/lib/loyalty-seed-defaults";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureLoyaltyTiersPopulated();
    const tiers = await db.select().from(loyaltyTiers).orderBy(asc(loyaltyTiers.minPoints));
    return jsonOk({ tiers });
  } catch (error) {
    console.error("[GET /api/loyalty/tiers]", error);
    return jsonError("Failed to load tiers", 500);
  }
}
