import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cartItems,
  carts,
  productImages,
  products,
} from "@/lib/db/schema";

export async function getCartWithItems(cartId: string) {
  const items = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      variantId: cartItems.variantId,
      qty: cartItems.qty,
      unitPrice: cartItems.unitPrice,
      total: cartItems.total,
      isSubscription: cartItems.isSubscription,
      productName: products.name,
      productSlug: products.slug,
      stockQty: products.stockQty,
      imageUrl: productImages.url,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(
      productImages,
      and(
        eq(productImages.productId, products.id),
        eq(productImages.isPrimary, true),
      ),
    )
    .where(eq(cartItems.cartId, cartId));

  const [cart] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);

  return { cart, items };
}

export async function findOrCreateCart(userId?: string, sessionId?: string) {
  if (userId) {
    const [existing] = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(carts)
      .values({ userId })
      .returning();
    return created!;
  }

  if (sessionId) {
    const [existing] = await db
      .select()
      .from(carts)
      .where(eq(carts.sessionId, sessionId))
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(carts)
      .values({ sessionId })
      .returning();
    return created!;
  }

  const [created] = await db.insert(carts).values({}).returning();
  return created!;
}
