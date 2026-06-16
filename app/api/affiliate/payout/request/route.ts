import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliatePayouts, affiliates } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import { getAffiliateSettings } from "@/lib/affiliate/settings";
import { sendPayoutRequestEmail } from "@/lib/affiliate/notifications";

const bodySchema = z.object({
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid body", 400);

    const settings = await getAffiliateSettings();
    if (!settings?.isEnabled) return jsonError("Affiliate program disabled", 400);

    const [aff] = await db
      .select()
      .from(affiliates)
      .where(and(eq(affiliates.userId, session.user.id), eq(affiliates.status, "active")))
      .limit(1);
    if (!aff) return jsonError("Active affiliate required", 403);

    const min = parseFloat(settings.minPayoutAmount);
    const wallet = parseFloat(aff.walletBalance);
    if (parsed.data.amount < min) return jsonError(`Minimum payout is ₹${min}`, 400);
    if (parsed.data.amount > wallet) return jsonError("Insufficient wallet balance", 400);

    const [pending] = await db
      .select({ id: affiliatePayouts.id })
      .from(affiliatePayouts)
      .where(
        and(eq(affiliatePayouts.affiliateId, aff.id), inArray(affiliatePayouts.status, ["requested", "approved", "processing"])),
      )
      .limit(1);
    if (pending) return jsonError("You already have a payout in progress", 409);

    if (!aff.bankAccountNumber && !aff.upiId) {
      return jsonError("Add bank or UPI details on your affiliate profile first", 400);
    }

    const [payout] = await db
      .insert(affiliatePayouts)
      .values({
        affiliateId: aff.id,
        requestedAmount: String(parsed.data.amount),
        payoutMethod: settings.payoutMethod,
        bankAccountNumber: aff.bankAccountNumber,
        bankIfsc: aff.bankIfsc,
        upiId: aff.upiId,
        status: "requested",
      })
      .returning();

    const adminEmail = process.env.ADMIN_AFFILIATE_NOTIFICATION_EMAIL?.trim();
    if (adminEmail && payout) {
      await sendPayoutRequestEmail(adminEmail, aff, payout).catch(console.error);
    }

    return jsonOk({ payout });
  } catch (e) {
    console.error("[POST /api/affiliate/payout/request]", e);
    return jsonError("Payout request failed", 500);
  }
}
