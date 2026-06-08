import { and, count, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);

    const me = session.user.id;

    const [invitedRow] = await db
      .select({ c: count() })
      .from(users)
      .where(eq(users.referredBy, me));

    const invited = Number(invitedRow?.c ?? 0);

    const referredUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.referredBy, me));

    const ids = referredUsers.map((u) => u.id);
    let ordered = 0;
    if (ids.length) {
      const [ordRow] = await db
        .select({
          c: sql<number>`count(distinct ${orders.userId})::int`,
        })
        .from(orders)
        .where(
          and(
            inArray(orders.userId, ids),
            inArray(orders.status, [
              "delivered",
              "shipped",
              "out_for_delivery",
              "packed",
              "processing",
              "confirmed",
            ]),
          ),
        );
      ordered = Number(ordRow?.c ?? 0);
    }

    const [self] = await db
      .select({ referralCode: users.referralCode })
      .from(users)
      .where(eq(users.id, me))
      .limit(1);

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const code = self?.referralCode ?? null;
    const shareUrl = code ? `${baseUrl}/account?ref=${encodeURIComponent(code)}` : null;
    const whatsappUrl =
      code && shareUrl
        ? `https://wa.me/?text=${encodeURIComponent(`Join me on CSR Organics — organic groceries & more: ${shareUrl}`)}`
        : null;

    return jsonOk({
      invited,
      signedUp: invited,
      ordered,
      referralCode: code,
      shareUrl,
      whatsappUrl,
    });
  } catch (e) {
    console.error("[GET /api/referral/stats]", e);
    return jsonError("Failed to load referral stats", 500);
  }
}
