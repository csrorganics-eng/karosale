import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const addressPatchSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().min(10).max(20).optional(),
  line1: z.string().min(5).max(500).optional(),
  line2: z.string().max(500).optional().nullable(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits").optional(),
  addressType: z.enum(["home", "work", "other"]).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);

    const { id } = await params;
    const [existing] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, session.user.id)))
      .limit(1);

    if (!existing) return jsonError("Address not found", 404);

    const body = await request.json();
    const parsed = addressPatchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid address", 400, parsed.error.flatten());
    }

    const p = parsed.data;
    if (p.isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(addresses.userId, session.user.id));
    }

    await db
      .update(addresses)
      .set({
        name: p.name ?? existing.name,
        phone: p.phone ?? existing.phone,
        line1: p.line1 ?? existing.line1,
        line2: p.line2 !== undefined ? p.line2 : existing.line2,
        city: p.city ?? existing.city,
        state: p.state ?? existing.state,
        pincode: p.pincode ?? existing.pincode,
        addressType: p.addressType ?? existing.addressType,
        isDefault: p.isDefault ?? existing.isDefault,
        updatedAt: new Date(),
      })
      .where(eq(addresses.id, id));

    const [updated] = await db.select().from(addresses).where(eq(addresses.id, id)).limit(1);
    return jsonOk({ address: updated });
  } catch (error) {
    console.error("[PATCH /api/addresses/[id]]", error);
    return jsonError("Failed to update address", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);

    const { id } = await params;
    const [existing] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, session.user.id)))
      .limit(1);

    if (!existing) return jsonError("Address not found", 404);

    await db.delete(addresses).where(eq(addresses.id, id));

    if (existing.isDefault) {
      const [first] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.userId, session.user.id))
        .limit(1);
      if (first) {
        await db
          .update(addresses)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(addresses.id, first.id));
      }
    }

    return jsonOk({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/addresses/[id]]", error);
    return jsonError("Failed to delete address", 500);
  }
}
