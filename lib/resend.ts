import { Resend } from "resend";
import { BRAND_NAME } from "@/lib/brand";

const defaultMailbox = "onboarding@resend.dev";

/**
 * Bare mailbox from `RESEND_FROM_EMAIL` (or default), lowercased.
 * If env is a full header like `Acme <noreply@x.com>`, returns the address inside brackets.
 */
export function getResendMailbox(): string {
  const raw = (process.env.RESEND_FROM_EMAIL ?? defaultMailbox).trim();
  const angle = raw.match(/<\s*([^>\s]+)\s*>/);
  if (angle?.[1]) return angle[1].trim().toLowerCase();
  return raw.toLowerCase();
}

/**
 * Full `from` value for Resend (matches their Node examples: `Acme <onboarding@resend.dev>` or plain mailbox).
 *
 * - If `RESEND_FROM_EMAIL` already contains `<…@…>`, it is used as-is (copy from Resend / another app).
 * - Else: if `RESEND_FROM_DISPLAY_NAME` is set to an empty string, send as plain mailbox only (common in tutorials).
 * - Else: if `RESEND_FROM_DISPLAY_NAME` is set to a non-empty string, use `Display <mailbox>`.
 * - Else: default `BRAND_NAME <mailbox>`.
 */
export function getResendFromHeader(): string {
  const raw = (process.env.RESEND_FROM_EMAIL ?? defaultMailbox).trim();
  if (/<[^>]+\@[^>]+>/.test(raw)) return raw;

  const mailbox = raw;
  if (process.env.RESEND_FROM_DISPLAY_NAME !== undefined) {
    const name = process.env.RESEND_FROM_DISPLAY_NAME.trim();
    if (name === "") return mailbox;
    return `${name} <${mailbox}>`;
  }
  return `${BRAND_NAME} <${mailbox}>`;
}

/** @deprecated Prefer {@link getResendMailbox} or {@link getResendFromHeader}. */
export function getResendFromEmail(): string {
  return getResendMailbox();
}

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
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const resend = getResend();
  const from = getResendFromHeader();
  const to = Array.isArray(params.to) ? params.to : [params.to];

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: params.subject,
    html: params.html,
    ...(params.text ? { text: params.text } : {}),
  });

  if (error) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : JSON.stringify(error);
    console.error("[resend] emails.send failed:", error);
    throw new Error(message || "Resend rejected the email send request");
  }

  return data;
}
