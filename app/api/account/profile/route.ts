import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const patchSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(20).optional(),
  whatsappOptIn: z.boolean().optional(),
  emailOptIn: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);

    const [row] = await db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
        whatsappOptIn: users.whatsappOptIn,
        emailOptIn: users.emailOptIn,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!row) return jsonError("User not found", 404);
    return jsonOk({ profile: row });
  } catch (error) {
    console.error("[GET /api/account/profile]", error);
    return jsonError("Failed to load profile", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, parsed.error.flatten());
    }

    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.phone !== undefined) {
      const raw = parsed.data.phone.trim();
      if (raw === "") {
        updates.phone = null;
      } else {
        const digits = raw.replace(/\D/g, "").slice(-10);
        if (digits.length < 10) {
          return jsonError("Enter a valid 10-digit mobile number", 400);
        }
        updates.phone = digits;
      }
    }
    if (parsed.data.whatsappOptIn !== undefined)
      updates.whatsappOptIn = parsed.data.whatsappOptIn;
    if (parsed.data.emailOptIn !== undefined) updates.emailOptIn = parsed.data.emailOptIn;

    if (updates.phone) {
      const [phoneTaken] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phone, updates.phone))
        .limit(1);
      if (phoneTaken && phoneTaken.id !== session.user.id) {
        return jsonError("This phone number is already used on another account", 409);
      }
    }

    await db.update(users).set(updates).where(eq(users.id, session.user.id));

    const [row] = await db
      .select({
        name: users.name,
        email: users.email,
        phone: users.phone,
        whatsappOptIn: users.whatsappOptIn,
        emailOptIn: users.emailOptIn,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return jsonOk({ profile: row });
  } catch (error) {
    console.error("[PATCH /api/account/profile]", error);
    return jsonError("Failed to update profile", 500);
  }
}
