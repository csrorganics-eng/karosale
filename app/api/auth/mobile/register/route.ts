import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createMobileTokens } from "@/lib/auth/mobile-tokens";
import { generateReferralCode } from "@/lib/utils";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(255).optional(),
});

async function allocateReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateReferralCode();
    const [hit] = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, code)).limit(1);
    if (!hit) return code;
  }
  throw new Error("Could not allocate referral code");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400, parsed.error.flatten());

    const email = parsed.data.email.trim().toLowerCase();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existing) return jsonError("An account with this email already exists", 409);

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [created] = await db
      .insert(users)
      .values({
        email,
        name: parsed.data.name?.trim() || email.split("@")[0] || "Customer",
        passwordHash,
        referralCode: await allocateReferralCode(),
        role: "customer",
      })
      .returning();

    if (!created) return jsonError("Registration failed", 500);

    const tokens = await createMobileTokens({
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
    });

    return jsonOk(tokens, 201);
  } catch (error) {
    console.error("[POST /api/auth/mobile/register]", error);
    return jsonError("Registration failed", 500);
  }
}
