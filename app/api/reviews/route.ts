import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews, orders } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const createSchema = z.object({
  productId: z.string().uuid(),
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  body: z.string().min(10).max(2000),
  pros: z.string().optional(),
  cons: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid review", 400);

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, parsed.data.orderId),
          eq(orders.userId, session.user.id),
          eq(orders.status, "delivered"),
        ),
      )
      .limit(1);

    if (!order) return jsonError("Only delivered orders can be reviewed", 400);

    const [created] = await db
      .insert(reviews)
      .values({
        productId: parsed.data.productId,
        orderId: parsed.data.orderId,
        userId: session.user.id,
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
        pros: parsed.data.pros,
        cons: parsed.data.cons,
        status: "pending",
      })
      .returning();

    return jsonOk({ review: created }, 201);
  } catch (error) {
    return jsonError("Failed to submit review", 500);
  }
}
