import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import { sendNewAffiliateApplicationEmail } from "@/lib/affiliate/notifications";
import { resolveAffiliateFromCode } from "@/lib/affiliate/engine";

const bodySchema = z.object({
  username: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_]+$/),
  termsAccepted: z.literal(true),
  uplineUsername: z.string().max(50).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Sign in required", 401);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid request", 400, parsed.error.flatten());

    const username = parsed.data.username.trim().toLowerCase();
    const [existing] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(sql`lower(${affiliates.username}) = ${username}`)
      .limit(1);
    if (existing) return jsonError("Username already taken", 409);

    const [already] = await db
      .select({ id: affiliates.id })
      .from(affiliates)
      .where(eq(affiliates.userId, session.user.id))
      .limit(1);
    if (already) return jsonError("You already have an affiliate profile", 409);

    let referredBy: number | null = null;
    if (parsed.data.uplineUsername?.trim()) {
      const up = await resolveAffiliateFromCode(parsed.data.uplineUsername.trim());
      if (up) referredBy = up.id;
    }

    const [created] = await db
      .insert(affiliates)
      .values({
        userId: session.user.id,
        username,
        status: "pending",
        referredByAffiliateId: referredBy,
        tierLevel: 1,
      })
      .returning();

    const adminEmail = process.env.ADMIN_AFFILIATE_NOTIFICATION_EMAIL?.trim();
    if (adminEmail && created) {
      await sendNewAffiliateApplicationEmail(adminEmail, created).catch(console.error);
    }

    return jsonOk({ affiliate: created });
  } catch (e) {
    console.error("[POST /api/affiliate/register]", e);
    return jsonError("Registration failed", 500);
  }
}
