import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { loyaltyTiers } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    const tiers = await db.select().from(loyaltyTiers).orderBy(asc(loyaltyTiers.minPoints));
    return jsonOk({ tiers });
  } catch (error) {
    console.error("[GET /api/loyalty/tiers]", error);
    return jsonError("Failed to load tiers", 500);
  }
}
