import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems, products } from "@/lib/db/schema";
import { findOrCreateCart, getCartWithItems } from "@/lib/db/queries/cart";
import { addToCartSchema } from "@/lib/validations/cart";
import { jsonOkPrivateNoStore, jsonError } from "@/lib/api-response";
import {
  CART_SESSION_COOKIE_NAME,
  cartSessionCookieOptions,
  newCartSessionId,
} from "@/lib/cart-cookie";

async function resolveCart() {
  const session = await auth();
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(CART_SESSION_COOKIE_NAME)?.value;

  if (!sessionId && !session?.user?.id) {
    sessionId = newCartSessionId();
    cookieStore.set(CART_SESSION_COOKIE_NAME, sessionId, cartSessionCookieOptions());
  }

  return findOrCreateCart(session?.user?.id, sessionId);
}

export async function GET() {
  try {
    const cart = await resolveCart();
    const data = await getCartWithItems(cart.id);
    return jsonOkPrivateNoStore(data);
  } catch (error) {
    console.error("[GET /api/cart]", error);
    return jsonError("Failed to fetch cart", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = addToCartSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid request", 400, parsed.error.flatten());
    }

    const cart = await resolveCart();
    const { productId, variantId, qty, isSubscription } = parsed.data;

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product || !product.isActive) {
      return jsonError("Product not available", 400);
    }
    if (product.stockQty < qty) {
      return jsonError("Insufficient stock", 400);
    }

    const unitPrice = parseFloat(product.price);
    const total = unitPrice * qty;

    const cartItemsList = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id));
    const existing = cartItemsList.find(
      (i) =>
        i.productId === productId &&
        (variantId ? i.variantId === variantId : !i.variantId),
    );

    if (existing) {
      const newQty = existing.qty + qty;
      if (product.stockQty < newQty) return jsonError("Insufficient stock", 400);
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
        variantId: variantId ?? null,
        qty,
        unitPrice: product.price,
        total: String(total),
        isSubscription,
      });
    }

    const data = await getCartWithItems(cart.id);
    return jsonOkPrivateNoStore(data);
  } catch (error) {
    console.error("[POST /api/cart]", error);
    return jsonError("Failed to add to cart", 500);
  }
}
