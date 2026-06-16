import Razorpay from "razorpay";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliatePayouts, affiliates, users } from "@/lib/db/schema";
import type { AffiliateRow } from "@/lib/affiliate/types";

function payoutClient(): Razorpay | null {
  const keyId = process.env.RAZORPAY_PAYOUT_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_PAYOUT_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/** RazorpayX contact — returns contact_id or throws when payouts API not configured. */
export async function createRazorpayContact(affiliate: AffiliateRow): Promise<string> {
  const rzp = payoutClient();
  if (!rzp) throw new Error("RAZORPAY_PAYOUT_KEY_ID / RAZORPAY_PAYOUT_KEY_SECRET not configured");
  const [user] = await db.select().from(users).where(eq(users.id, affiliate.userId)).limit(1);
  const name = user?.name || affiliate.username;
  const email = user?.email?.trim() || `${affiliate.username}@affiliate.invalid`;
  const contact = (await (rzp as unknown as { contacts: { create: (x: unknown) => Promise<{ id: string }> } }).contacts.create({
    name,
    email,
    type: "employee",
    reference_id: `aff_${affiliate.id}`,
  })) as { id: string };
  return contact.id;
}

export async function createFundAccount(affiliateId: number, method: "bank" | "upi"): Promise<string> {
  const rzp = payoutClient();
  if (!rzp) throw new Error("Razorpay payout keys not configured");
  const [aff] = await db.select().from(affiliates).where(eq(affiliates.id, affiliateId)).limit(1);
  if (!aff?.razorpayContactId) throw new Error("Create contact first");
  const rzpFa = rzp as unknown as {
    fundAccount: { create: (x: unknown) => Promise<{ id: string }> };
  };
  if (method === "upi") {
    if (!aff.upiId) throw new Error("UPI id required");
    const fa = await rzpFa.fundAccount.create({
      contact_id: aff.razorpayContactId,
      account_type: "vpa",
      vpa: { address: aff.upiId },
    });
    return fa.id;
  }
  if (!aff.bankAccountNumber || !aff.bankIfsc) throw new Error("Bank details required");
  const fa = await rzpFa.fundAccount.create({
    contact_id: aff.razorpayContactId,
    account_type: "bank_account",
    bank_account: {
      name: aff.bankAccountName ?? "Affiliate",
      ifsc: aff.bankIfsc,
      account_number: aff.bankAccountNumber,
    },
  });
  return fa.id;
}

export async function initiateRazorpayPayout(payoutId: number): Promise<{
  success: boolean;
  razorpayPayoutId?: string;
  failureReason?: string;
}> {
  try {
    const rzp = payoutClient();
    if (!rzp) return { success: false, failureReason: "Payout API not configured" };
    const [p] = await db.select().from(affiliatePayouts).where(eq(affiliatePayouts.id, payoutId)).limit(1);
    if (!p) return { success: false, failureReason: "Payout not found" };
    const [aff] = await db.select().from(affiliates).where(eq(affiliates.id, p.affiliateId)).limit(1);
    if (!aff?.razorpayFundAccountId) return { success: false, failureReason: "Fund account missing" };
    const amountInr = parseFloat(p.approvedAmount ?? p.requestedAmount);
    const paise = Math.round(amountInr * 100);
    const accountNumber = process.env.RAZORPAY_PAYOUT_ACCOUNT_NUMBER?.trim();
    if (!accountNumber) return { success: false, failureReason: "RAZORPAY_PAYOUT_ACCOUNT_NUMBER not set" };
    const rzpPay = rzp as unknown as {
      payouts: { create: (x: unknown) => Promise<{ id: string }> };
    };
    const payout = await rzpPay.payouts.create({
      account_number: accountNumber,
      fund_account_id: aff.razorpayFundAccountId,
      amount: paise,
      currency: "INR",
      mode: aff.upiId ? "UPI" : "IMPS",
      purpose: "payout",
      queue_if_low_balance: true,
      reference_id: `affpayout_${payoutId}`,
      narration: `Affiliate payout ${payoutId}`,
    });
    return { success: true, razorpayPayoutId: payout.id };
  } catch (e) {
    return {
      success: false,
      failureReason: e instanceof Error ? e.message : String(e),
    };
  }
}
