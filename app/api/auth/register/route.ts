import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { generateReferralCode } from "@/lib/utils";
import { jsonOk, jsonError } from "@/lib/api-response";

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  name: z.string().min(2).max(255).optional(),
});

async function allocateReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateReferralCode();
    const [hit] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);
    if (!hit) return code;
  }
  throw new Error("Could not allocate referral code");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, parsed.error.flatten());
    }

    const email = parsed.data.email.trim().toLowerCase();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existing) {
      return jsonError("An account with this email already exists. Sign in instead.", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const referralCode = await allocateReferralCode();

    await db.insert(users).values({
      email,
      name: parsed.data.name?.trim() || email.split("@")[0] || "Customer",
      passwordHash,
      referralCode,
      role: "customer",
    });

    return jsonOk({ message: "Account created. You can sign in now." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("users_email") || msg.includes("unique") || msg.includes("duplicate")) {
      return jsonError("An account with this email already exists. Sign in instead.", 409);
    }
    console.error("[POST /api/auth/register]", error);
    return jsonError("Registration failed", 500);
  }
}
