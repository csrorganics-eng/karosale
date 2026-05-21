import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wishlists, products, productImages } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await requireAuth();
    const items = await db
      .select({
        id: wishlists.id,
        productId: wishlists.productId,
        name: products.name,
        slug: products.slug,
        price: products.price,
        imageUrl: productImages.url,
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .leftJoin(
        productImages,
        and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)),
      )
      .where(eq(wishlists.userId, session.user.id));

    return jsonOk({ items });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

const addSchema = z.object({
  productId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    await db
      .insert(wishlists)
      .values({ userId: session.user.id, productId: parsed.data.productId })
      .onConflictDoNothing();

    return jsonOk({ success: true });
  } catch {
    return jsonError("Failed to add to wishlist", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth();
    const productId = new URL(request.url).searchParams.get("productId");
    if (!productId) return jsonError("productId required", 400);

    await db
      .delete(wishlists)
      .where(
        and(eq(wishlists.userId, session.user.id), eq(wishlists.productId, productId)),
      );

    return jsonOk({ success: true });
  } catch {
    return jsonError("Failed to remove", 500);
  }
}
