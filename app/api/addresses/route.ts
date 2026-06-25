import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const addressSchema = z.object({
  name: z.string().min(2).max(255),
  phone: z.string().min(10).max(20),
  line1: z.string().min(5).max(500),
  line2: z.string().max(500).nullish(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  addressType: z.enum(["home", "work", "other"]).default("home"),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  try {
    const session = await requireAuth();
    const list = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, session.user.id));
    return jsonOk({ addresses: list });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid address", 400, parsed.error.flatten());
    }

    if (parsed.data.isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(addresses.userId, session.user.id));
    }

    const [created] = await db
      .insert(addresses)
      .values({
        userId: session.user.id,
        ...parsed.data,
        line2: parsed.data.line2 ?? null,
      })
      .returning();

    return jsonOk({ address: created });
  } catch (error) {
    console.error("[POST /api/addresses]", error);
    return jsonError("Failed to save address", 500);
  }
}
