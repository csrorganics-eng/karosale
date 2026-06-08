import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems, carts, products, wishlists } from "@/lib/db/schema";
import { findOrCreateCart, getCartWithItems } from "@/lib/db/queries/cart";
import { jsonOk, jsonError } from "@/lib/api-response";

const CART_COOKIE = "csrorganics_cart_session";

async function resolveCart() {
  const session = await auth();
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(CART_COOKIE)?.value;

  if (!sessionId && !session?.user?.id) {
    sessionId = crypto.randomUUID();
    cookieStore.set(CART_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return findOrCreateCart(session?.user?.id, sessionId);
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Please sign in", 401);

    const wishRows = await db
      .select({ productId: wishlists.productId })
      .from(wishlists)
      .where(eq(wishlists.userId, session.user.id));

    if (wishRows.length === 0) {
      return jsonOk({ added: 0, message: "Wishlist is empty" });
    }

    const cart = await resolveCart();
    const errors: string[] = [];
    let added = 0;

    for (const { productId } of wishRows) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product || !product.isActive) {
        errors.push(`Skipped unavailable product`);
        continue;
      }

      const qty = 1;
      if (product.stockQty < qty) {
        errors.push(`${product.name} is out of stock`);
        continue;
      }

      const unitPrice = parseFloat(product.price);
      const total = unitPrice * qty;

      const cartItemsList = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
      const existing = cartItemsList.find(
        (i) => i.productId === productId && !i.variantId,
      );

      if (existing) {
        const newQty = existing.qty + qty;
        if (product.stockQty < newQty) {
          errors.push(`${product.name}: not enough stock for quantity ${newQty}`);
          continue;
        }
        await db
          .update(cartItems)
          .set({
            qty: newQty,
            total: String(unitPrice * newQty),
            updatedAt: new Date(),
          })
          .where(eq(cartItems.id, existing.id));
      } else {
        await db.insert(cartItems).values({
          cartId: cart.id,
          productId,
          variantId: null,
          qty,
          unitPrice: product.price,
          total: String(total),
          isSubscription: false,
        });
      }
      added += 1;
    }

    const data = await getCartWithItems(cart.id);
    return jsonOk({ added, errors, ...data });
  } catch (e) {
    console.error("[POST /api/wishlist/add-all-to-cart]", e);
    return jsonError("Failed to add items to cart", 500);
  }
}
