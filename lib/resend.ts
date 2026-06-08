import { Resend } from "resend";
import { BRAND_NAME } from "@/lib/brand";

let resendClient: Resend | null = null;

export function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL ?? "orders@csrorganics.com";
  return resend.emails.send({
    from: `${BRAND_NAME} <${from}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
