import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wishlists } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const schema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(100),
});

/** Merge guest wishlist product IDs into the signed-in user wishlist (idempotent). */
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    for (const productId of parsed.data.productIds) {
      await db
        .insert(wishlists)
        .values({ userId: session.user.id, productId })
        .onConflictDoNothing();
    }

    return jsonOk({ merged: parsed.data.productIds.length });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
