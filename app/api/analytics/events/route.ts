import { z } from "zod";
import { db } from "@/lib/db";
import { pageViews } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({
  path: z.string(),
  sessionId: z.string(),
  productId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  referrer: z.string().optional(),
  durationSeconds: z.number().int().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid event", 400);

    await db.insert(pageViews).values({
      path: parsed.data.path,
      sessionId: parsed.data.sessionId,
      productId: parsed.data.productId ?? null,
      userId: parsed.data.userId ?? null,
      referrer: parsed.data.referrer ?? null,
      durationSeconds: parsed.data.durationSeconds ?? null,
    });

    return jsonOk({ tracked: true });
  } catch (error) {
    return jsonError("Failed to track event", 500);
  }
}
