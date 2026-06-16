import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jsonOk } from "@/lib/api-response";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return jsonOk({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
      env: {
        hasDatabase: !!process.env.DATABASE_URL,
        hasRazorpay: !!process.env.RAZORPAY_KEY_ID,
        hasRazorpayWebhookSecret: !!process.env.RAZORPAY_WEBHOOK_SECRET?.trim(),
        hasResend: !!process.env.RESEND_API_KEY,
        isPreview: process.env.NEXT_PUBLIC_IS_PREVIEW === "true",
      },
    });
  } catch (error) {
    return jsonOk(
      {
        status: "degraded",
        db: "disconnected",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503,
    );
  }
}
