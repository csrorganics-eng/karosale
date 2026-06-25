import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushTokens } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const registerSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["ios", "android", "unknown"]).default("unknown"),
  deviceId: z.string().optional(),
});

/**
 * POST /api/push/register
 * Upserts a push token for the authenticated user.
 * Called by the mobile app after obtaining an Expo push token.
 */
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid token data", 400, parsed.error.flatten());
    }

    const { token, platform, deviceId } = parsed.data;

    // Upsert: if the token already exists for this user keep it active,
    // if it was deactivated (old device) reactivate. If it belongs to a
    // different user, reassign it (device re-used after factory reset).
    const [existing] = await db
      .select()
      .from(pushTokens)
      .where(eq(pushTokens.token, token))
      .limit(1);

    if (existing) {
      await db
        .update(pushTokens)
        .set({
          userId: session.user.id,
          platform,
          deviceId: deviceId ?? existing.deviceId,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(pushTokens.token, token));
    } else {
      await db.insert(pushTokens).values({
        userId: session.user.id,
        token,
        platform,
        deviceId: deviceId ?? null,
        isActive: true,
      });
    }

    return jsonOk({ registered: true });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

/**
 * DELETE /api/push/register
 * Deactivates a push token (used on logout).
 */
export async function DELETE(request: Request) {
  try {
    const session = await requireAuth();
    const { token } = (await request.json()) as { token?: string };
    if (!token) return jsonError("Token required", 400);

    await db
      .update(pushTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(eq(pushTokens.token, token), eq(pushTokens.userId, session.user.id)),
      );

    return jsonOk({ deregistered: true });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
