import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliates } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import { grabReferrer } from "@/lib/affiliate/engine";

const bodySchema = z.object({
  customerId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid body", 400);

    const [aff] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.userId, session.user.id))
      .limit(1);
    if (!aff || aff.status !== "active") return jsonError("Active affiliate required", 403);

    const res = await grabReferrer(aff.id, parsed.data.customerId);
    if (!res.success) return jsonError(res.reason ?? "Failed", 400);
    return jsonOk({ success: true });
  } catch (e) {
    console.error("[POST /api/affiliate/grab-referrer]", e);
    return jsonError("Failed", 500);
  }
}
