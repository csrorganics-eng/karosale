import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createAndSendOtp } from "@/lib/otp";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({
  phone: z.string().min(10).max(15),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`otp:${ip}`, 3, 60 * 60 * 1000);
    if (!rl.allowed) {
      return jsonError("Too many OTP requests. Try again in an hour.", 429);
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid phone number", 400);

    const result = await createAndSendOtp(parsed.data.phone);
    if (!result.success) return jsonError(result.error ?? "Failed to send OTP", 500);

    return jsonOk({ sent: true });
  } catch (error) {
    console.error("[send-otp]", error);
    return jsonError("Failed to send OTP", 500);
  }
}
