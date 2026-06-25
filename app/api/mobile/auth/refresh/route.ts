import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createMobileTokens, verifyMobileRefreshToken } from "@/lib/auth/mobile-tokens";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({ refreshToken: z.string().min(10) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const userId = await verifyMobileRefreshToken(parsed.data.refreshToken);
    if (!userId) return jsonError("Invalid or expired refresh token", 401);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.isActive) return jsonError("Account inactive", 401);

    const tokens = await createMobileTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return jsonOk(tokens);
  } catch (error) {
    console.error("[POST /api/auth/mobile/refresh]", error);
    return jsonError("Refresh failed", 500);
  }
}
