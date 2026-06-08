import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const COOKIE = "csrorganics_ref";

/**
 * Call after sign-in (credentials or OAuth). Sets referred_by from referral cookie once.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Sign in required", 401);

    const jar = await cookies();
    const refCode = jar.get(COOKIE)?.value?.trim().toUpperCase();
    if (!refCode) {
      return jsonOk({ claimed: false, reason: "no_referral_cookie" });
    }

    const [self] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    if (!self || self.referredBy) {
      jar.delete(COOKIE);
      return jsonOk({ claimed: false, reason: "already_referred" });
    }

    const [referrer] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.referralCode, refCode), isNull(users.deletedAt)))
      .limit(1);

    if (!referrer || referrer.id === session.user.id) {
      jar.delete(COOKIE);
      return jsonOk({ claimed: false, reason: "invalid_referrer" });
    }

    await db
      .update(users)
      .set({ referredBy: referrer.id, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    jar.delete(COOKIE);
    return jsonOk({ claimed: true, referrerId: referrer.id });
  } catch (e) {
    console.error("[POST /api/referral/claim]", e);
    return jsonError("Referral claim failed", 500);
  }
}
