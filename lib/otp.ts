import { eq, and, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { otpCodes } from "@/lib/db/schema";
import { sendOtpSms } from "@/lib/fast2sms";

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createAndSendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
  const clean = phone.replace(/\D/g, "").slice(-10);
  if (clean.length !== 10) return { success: false, error: "Invalid phone number" };

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(otpCodes).values({
    phone: clean,
    code,
    expiresAt,
  });

  const sent = await sendOtpSms(clean, code);
  if (!sent && !process.env.FAST2SMS_API_KEY) {
    console.log(`[DEV OTP] Phone ${clean} code: ${code}`);
    return { success: true };
  }
  if (!sent) return { success: false, error: "Failed to send SMS" };
  return { success: true };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const clean = phone.replace(/\D/g, "").slice(-10);
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, clean),
        eq(otpCodes.code, code),
        eq(otpCodes.verified, false),
        gt(otpCodes.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return false;

  await db
    .update(otpCodes)
    .set({ verified: true })
    .where(eq(otpCodes.id, row.id));

  return true;
}
