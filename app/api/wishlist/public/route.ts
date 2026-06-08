import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { wishlists, products, productImages } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import { parseWishlistShareToken } from "@/lib/wishlist-share-token";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("t");
    if (!token) return jsonError("Missing token", 400);

    const parsed = parseWishlistShareToken(token);
    if (!parsed) return jsonError("Invalid or expired link", 400);

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
      .where(eq(wishlists.userId, parsed.userId));

    return jsonOk({ items });
  } catch (e) {
    console.error("[GET /api/wishlist/public]", e);
    return jsonError("Failed to load wishlist", 500);
  }
}
