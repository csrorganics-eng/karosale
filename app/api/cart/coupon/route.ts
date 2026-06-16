import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { carts } from "@/lib/db/schema";
import { validateCoupon } from "@/lib/db/queries/coupons";
import { getCartWithItems } from "@/lib/db/queries/cart";
import { applyCouponSchema } from "@/lib/validations/cart";
import { jsonOkPrivateNoStore, jsonError } from "@/lib/api-response";

const couponBodySchema = applyCouponSchema.extend({
  cartId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const json = await request.json();
    const parsed = couponBodySchema.safeParse(json);
    if (!parsed.success) return jsonError("Invalid request", 400, parsed.error.flatten());

    const { cartId, code } = parsed.data;
    const { items, cart } = await getCartWithItems(cartId);
    if (!cart) return jsonError("Cart not found", 404);

    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.total), 0);
    const result = await validateCoupon(code, session?.user?.id, subtotal);
    if (!result.valid) return jsonError(result.error ?? "Invalid coupon", 400);

    await db
      .update(carts)
      .set({
        couponCode: result.coupon!.code,
        couponDiscount: String(result.discount),
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cartId));

    const data = await getCartWithItems(cartId);
    return jsonOkPrivateNoStore({ ...data, freeShipping: result.freeShipping });
  } catch (error) {
    console.error("[POST /api/cart/coupon]", error);
    return jsonError("Failed to apply coupon", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const cartId = new URL(request.url).searchParams.get("cartId");
    if (!cartId) return jsonError("cartId required", 400);

    await db
      .update(carts)
      .set({ couponCode: null, couponDiscount: "0", updatedAt: new Date() })
      .where(eq(carts.id, cartId));

    const data = await getCartWithItems(cartId);
    return jsonOkPrivateNoStore(data);
  } catch (error) {
    console.error("[DELETE /api/cart/coupon]", error);
    return jsonError("Failed to remove coupon", 500);
  }
}
