import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bundleItems, cartItems, carts, productBundles, products } from "@/lib/db/schema";
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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Please sign in", 401);

    const { slug } = await params;
    const [bundle] = await db
      .select()
      .from(productBundles)
      .where(and(eq(productBundles.slug, slug), eq(productBundles.isActive, true)))
      .limit(1);
    if (!bundle) return jsonError("Bundle not found", 404);

    const lines = await db
      .select({
        productId: bundleItems.productId,
        qty: bundleItems.qty,
      })
      .from(bundleItems)
      .where(eq(bundleItems.bundleId, bundle.id));

    const cart = await resolveCart();
    const errors: string[] = [];

    for (const line of lines) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, line.productId))
        .limit(1);
      if (!product || !product.isActive) {
        errors.push("An item in this bundle is unavailable");
        continue;
      }
      const qty = line.qty;
      if (product.stockQty < qty) {
        errors.push(`${product.name} is out of stock`);
        continue;
      }
      const unitPrice = parseFloat(product.price);
      const total = unitPrice * qty;

      const cartItemsList = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
      const existing = cartItemsList.find((i) => i.productId === line.productId && !i.variantId);

      if (existing) {
        const newQty = existing.qty + qty;
        if (product.stockQty < newQty) {
          errors.push(`${product.name}: insufficient stock`);
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
          productId: line.productId,
          variantId: null,
          qty,
          unitPrice: product.price,
          total: String(total),
          isSubscription: false,
        });
      }
    }

    const data = await getCartWithItems(cart.id);
    return jsonOk({ errors, ...data });
  } catch (e) {
    console.error("[POST /api/bundles/[slug]/add-to-cart]", e);
    return jsonError("Failed to add bundle to cart", 500);
  }
}
