import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliatePayouts, affiliates, users } from "@/lib/db/schema";
import { sendPayoutCompletedEmail } from "@/lib/affiliate/notifications";

function verify(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_PAYOUT_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verify(body, signature)) {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const event = JSON.parse(body) as {
      event: string;
      payload?: {
        payout?: {
          entity: {
            id?: string;
            status?: string;
            utr?: string;
            reference_id?: string;
          };
        };
      };
    };
    const payoutEntity = event.payload?.payout?.entity;

    if (event.event === "payout.processed" && payoutEntity?.id) {
      const [row] = await db
        .select()
        .from(affiliatePayouts)
        .where(eq(affiliatePayouts.razorpayPayoutId, payoutEntity.id))
        .limit(1);
      if (row) {
        await db
          .update(affiliatePayouts)
          .set({
            status: "paid",
            razorpayPayoutStatus: payoutEntity.status ?? "processed",
            razorpayUtr: payoutEntity.utr ?? null,
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(affiliatePayouts.id, row.id));

        const [aff] = await db.select().from(affiliates).where(eq(affiliates.id, row.affiliateId)).limit(1);
        if (aff) {
          const [u] = await db.select().from(users).where(eq(users.id, aff.userId)).limit(1);
          const [p] = await db.select().from(affiliatePayouts).where(eq(affiliatePayouts.id, row.id)).limit(1);
          if (u?.email && p) await sendPayoutCompletedEmail(aff, u.email, p).catch(console.error);
        }
      }
    }

    if (event.event === "payout.failed" && payoutEntity?.id) {
      await db
        .update(affiliatePayouts)
        .set({
          status: "failed",
          razorpayPayoutStatus: payoutEntity.status ?? "failed",
          updatedAt: new Date(),
        })
        .where(eq(affiliatePayouts.razorpayPayoutId, payoutEntity.id));
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("[affiliate razorpay webhook]", e);
    return new Response("Error", { status: 500 });
  }
}
