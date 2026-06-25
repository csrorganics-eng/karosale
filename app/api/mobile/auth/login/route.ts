import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createMobileTokens } from "@/lib/auth/mobile-tokens";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid credentials", 400);

    const email = parsed.data.email.trim().toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (!user?.passwordHash || !user.isActive) {
      return jsonError("Invalid email or password", 401);
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return jsonError("Invalid email or password", 401);

    const tokens = await createMobileTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return jsonOk(tokens);
  } catch (error) {
    console.error("[POST /api/auth/mobile/login]", error);
    return jsonError("Login failed", 500);
  }
}
