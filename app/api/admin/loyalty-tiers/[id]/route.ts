import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { loyaltyTiers } from "@/lib/db/schema";
import { loyaltyTierSchema } from "@/lib/validations/loyalty";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = loyaltyTierSchema.partial().safeParse(body);
    if (!parsed.success) return jsonError("Invalid tier data", 400);

    const data = parsed.data;
    const [updated] = await db
      .update(loyaltyTiers)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.minPoints !== undefined && { minPoints: data.minPoints }),
        ...(data.maxPoints !== undefined && { maxPoints: data.maxPoints ?? null }),
        ...(data.discountPct !== undefined && { discountPct: String(data.discountPct) }),
        ...(data.freeShippingOn !== undefined && {
          freeShippingOn:
            data.freeShippingOn != null ? String(data.freeShippingOn) : null,
        }),
        ...(data.badgeLabel !== undefined && { badgeLabel: data.badgeLabel }),
        ...(data.badgeColor !== undefined && { badgeColor: data.badgeColor }),
        ...(data.perks !== undefined && { perks: data.perks ?? null }),
        updatedAt: new Date(),
      })
      .where(eq(loyaltyTiers.id, id))
      .returning();

    if (!updated) return jsonError("Tier not found", 404);
    return jsonOk({ tier: updated });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return jsonError(error.message, error.message === "Unauthorized" ? 401 : 403);
    }
    return jsonError("Failed to update tier", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const [deleted] = await db.delete(loyaltyTiers).where(eq(loyaltyTiers.id, id)).returning();
    if (!deleted) return jsonError("Tier not found", 404);
    return jsonOk({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return jsonError(error.message, error.message === "Unauthorized" ? 401 : 403);
    }
    return jsonError("Failed to delete tier", 500);
  }
}
