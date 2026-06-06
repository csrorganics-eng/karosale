import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyOtp } from "@/lib/otp";
import { generateReferralCode } from "@/lib/utils";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6),
  name: z.string().min(2).optional(),
  referralCode: z.string().min(4).max(12).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const clean = parsed.data.phone.replace(/\D/g, "").slice(-10);
    const valid = await verifyOtp(clean, parsed.data.code);
    if (!valid) return jsonError("Invalid or expired OTP", 400);

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, clean))
      .limit(1);

    if (!user) {
      let referredBy: string | undefined;
      if (parsed.data.referralCode) {
        const code = parsed.data.referralCode.trim().toUpperCase();
        const [ref] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.referralCode, code))
          .limit(1);
        referredBy = ref?.id;
      }

      const [created] = await db
        .insert(users)
        .values({
          phone: clean,
          name: parsed.data.name ?? "Customer",
          email: `${clean}@phone.karosale.com`,
          referralCode: generateReferralCode(),
          referredBy,
          emailVerified: new Date(),
        })
        .returning();
      user = created!;
    }

    return jsonOk({
      userId: user.id,
      phone: user.phone,
      message: "OTP verified. Sign in with phone credentials provider or link session client-side.",
    });
  } catch (error) {
    console.error("[verify-otp]", error);
    return jsonError("Verification failed", 500);
  }
}
