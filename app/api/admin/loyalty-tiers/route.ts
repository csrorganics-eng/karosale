import { asc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { loyaltyTiers } from "@/lib/db/schema";
import { loyaltyTierSchema } from "@/lib/validations/loyalty";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireRole(["admin"]);
    const tiers = await db.select().from(loyaltyTiers).orderBy(asc(loyaltyTiers.minPoints));
    return jsonOk({ tiers });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return jsonError(error.message, error.message === "Unauthorized" ? 401 : 403);
    }
    return jsonError("Failed to load loyalty tiers", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    const body = await request.json();
    const parsed = loyaltyTierSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid tier data", 400, parsed.error.flatten());

    const data = parsed.data;
    const [created] = await db
      .insert(loyaltyTiers)
      .values({
        name: data.name,
        minPoints: data.minPoints,
        maxPoints: data.maxPoints ?? null,
        discountPct: String(data.discountPct),
        freeShippingOn:
          data.freeShippingOn != null ? String(data.freeShippingOn) : null,
        badgeLabel: data.badgeLabel,
        badgeColor: data.badgeColor,
        perks: data.perks ?? null,
      })
      .returning();

    return jsonOk({ tier: created }, 201);
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return jsonError(error.message, error.message === "Unauthorized" ? 401 : 403);
    }
    return jsonError("Failed to create tier", 500);
  }
}
