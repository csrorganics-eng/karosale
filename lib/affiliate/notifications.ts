import type { AffiliateCommissionRow, AffiliatePayoutRow, AffiliateRow } from "@/lib/affiliate/types";
import { BRAND_NAME } from "@/lib/brand";
import { sendEmail } from "@/lib/resend";

function bilingualBlock(en: string, hi: string) {
  return `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a">
    <p style="margin:0 0 12px">${en}</p>
    <p style="margin:0;color:#444;border-left:3px solid #2D6A4F;padding-left:12px">${hi}</p>
  </div>`;
}

async function safeSend(to: string | string[] | undefined, subject: string, html: string) {
  if (!to || (Array.isArray(to) && to.length === 0)) return;
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.info("[affiliate-notifications] RESEND_API_KEY not set — skip:", subject);
    return;
  }
  await sendEmail({ to, subject, html }).catch((e) => console.error("[affiliate-notifications]", e));
}

export async function sendAffiliateApprovedEmail(affiliate: AffiliateRow, email: string) {
  await safeSend(
    email,
    `${BRAND_NAME} — Affiliate account approved`,
    bilingualBlock(
      `Your affiliate account <strong>${affiliate.username}</strong> is now active. Share your links and start earning.`,
      `आपका एफ़िलिएट खाता <strong>${affiliate.username}</strong> अब सक्रिय है। अपने लिंक साझा करें और कमाई शुरू करें।`,
    ),
  );
}

export async function sendAffiliateRejectedEmail(affiliate: AffiliateRow, email: string, reason: string) {
  await safeSend(
    email,
    `${BRAND_NAME} — Affiliate application update`,
    bilingualBlock(
      `We could not approve the affiliate application for <strong>${affiliate.username}</strong>. Reason: ${reason}`,
      `हम <strong>${affiliate.username}</strong> के लिए एफ़िलिएट आवेदन स्वीकार नहीं कर सके। कारण: ${reason}`,
    ),
  );
}

export async function sendCommissionEarnedEmail(
  affiliate: AffiliateRow,
  email: string,
  commission: AffiliateCommissionRow,
  orderNumber: string,
) {
  await safeSend(
    email,
    `${BRAND_NAME} — Commission recorded`,
    bilingualBlock(
      `You have a commission of <strong>₹${commission.commissionAmount}</strong> for order <strong>${orderNumber}</strong> (status: ${commission.status}).`,
      `ऑर्डर <strong>${orderNumber}</strong> के लिए <strong>₹${commission.commissionAmount}</strong> कमीशन दर्ज किया गया है (स्थिति: ${commission.status})।`,
    ),
  );
}

export async function sendPayoutProcessingEmail(affiliate: AffiliateRow, email: string, payout: AffiliatePayoutRow) {
  await safeSend(
    email,
    `${BRAND_NAME} — Payout processing`,
    bilingualBlock(
      `Your payout request of <strong>₹${payout.requestedAmount}</strong> is being processed.`,
      `आपके <strong>₹${payout.requestedAmount}</strong> के भुगतान अनुरोध पर कार्रवाई हो रही है।`,
    ),
  );
}

export async function sendPayoutCompletedEmail(affiliate: AffiliateRow, email: string, payout: AffiliatePayoutRow) {
  await safeSend(
    email,
    `${BRAND_NAME} — Payout completed`,
    bilingualBlock(
      `Your payout of <strong>₹${payout.approvedAmount ?? payout.requestedAmount}</strong> has been completed.`,
      `आपका <strong>₹${payout.approvedAmount ?? payout.requestedAmount}</strong> भुगतान पूरा हो गया है।`,
    ),
  );
}

export async function sendNewAffiliateApplicationEmail(adminEmail: string, affiliate: AffiliateRow) {
  await safeSend(
    adminEmail,
    `${BRAND_NAME} — New affiliate application`,
    bilingualBlock(
      `New affiliate application: username <strong>${affiliate.username}</strong> (user id ${affiliate.userId}).`,
      `नया एफ़िलिएट आवेदन: उपयोगकर्ता नाम <strong>${affiliate.username}</strong>।`,
    ),
  );
}

export async function sendPayoutRequestEmail(adminEmail: string, affiliate: AffiliateRow, payout: AffiliatePayoutRow) {
  await safeSend(
    adminEmail,
    `${BRAND_NAME} — Affiliate payout requested`,
    bilingualBlock(
      `Affiliate <strong>${affiliate.username}</strong> requested payout of <strong>₹${payout.requestedAmount}</strong>.`,
      `एफ़िलिएट <strong>${affiliate.username}</strong> ने <strong>₹${payout.requestedAmount}</strong> का भुगतान अनुरोध किया है।`,
    ),
  );
}
