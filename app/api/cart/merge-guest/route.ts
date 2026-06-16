import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems, carts, products } from "@/lib/db/schema";
import { findOrCreateCart } from "@/lib/db/queries/cart";
import { jsonOkPrivateNoStore, jsonError } from "@/lib/api-response";
import {
  CART_SESSION_COOKIE_NAME,
  cartSessionCookieOptions,
  newCartSessionId,
} from "@/lib/cart-cookie";

/**
 * After sign-in, move lines from the anonymous cart (cookie `sessionId`) into the
 * authenticated user's cart, then rotate the guest cookie so the browser never keeps
 * showing stale guest state alongside an account session.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);

    const cookieStore = await cookies();
    const guestSessionId = cookieStore.get(CART_SESSION_COOKIE_NAME)?.value;
    if (!guestSessionId) {
      return jsonOkPrivateNoStore({ mergedLines: 0 });
    }

    const userCart = await findOrCreateCart(session.user.id);
    let mergedLines = 0;

    await db.transaction(async (tx) => {
      const [guestCart] = await tx
        .select()
        .from(carts)
        .where(and(eq(carts.sessionId, guestSessionId), isNull(carts.userId)))
        .limit(1);

      if (!guestCart || guestCart.id === userCart.id) {
        return;
      }

      const guestLines = await tx
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, guestCart.id));

      if (guestLines.length === 0) {
        await tx.delete(carts).where(eq(carts.id, guestCart.id));
        return;
      }

      for (const line of guestLines) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, line.productId))
          .limit(1);
        if (!product?.isActive) continue;

        const match = line.variantId
          ? and(
              eq(cartItems.cartId, userCart.id),
              eq(cartItems.productId, line.productId),
              eq(cartItems.variantId, line.variantId),
            )
          : and(
              eq(cartItems.cartId, userCart.id),
              eq(cartItems.productId, line.productId),
              isNull(cartItems.variantId),
            );

        const [existing] = await tx.select().from(cartItems).where(match).limit(1);

        const unitPrice = parseFloat(String(line.unitPrice));
        const combinedQty = (existing?.qty ?? 0) + line.qty;
        const cappedQty = Math.min(combinedQty, product.stockQty);
        if (cappedQty <= 0) continue;

        if (existing) {
          await tx
            .update(cartItems)
            .set({
              qty: cappedQty,
              total: String(unitPrice * cappedQty),
              updatedAt: new Date(),
            })
            .where(eq(cartItems.id, existing.id));
        } else {
          await tx.insert(cartItems).values({
            cartId: userCart.id,
            productId: line.productId,
            variantId: line.variantId,
            qty: cappedQty,
            unitPrice: line.unitPrice,
            total: String(unitPrice * cappedQty),
            isSubscription: line.isSubscription,
          });
        }
        mergedLines += 1;
      }

      await tx.delete(carts).where(eq(carts.id, guestCart.id));
    });

    cookieStore.set(CART_SESSION_COOKIE_NAME, newCartSessionId(), cartSessionCookieOptions());

    return jsonOkPrivateNoStore({ mergedLines });
  } catch (e) {
    console.error("[POST /api/cart/merge-guest]", e);
    return jsonError("Could not merge guest cart", 500);
  }
}
