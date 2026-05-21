import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartItems } from "@/lib/db/schema";
import { getCartWithItems } from "@/lib/db/queries/cart";
import { updateCartItemSchema } from "@/lib/validations/cart";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const parsed = updateCartItemSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const [item] = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.id, itemId))
      .limit(1);
    if (!item) return jsonError("Cart item not found", 404);

    const unitPrice = parseFloat(item.unitPrice);
    await db
      .update(cartItems)
      .set({
        qty: parsed.data.qty,
        total: String(unitPrice * parsed.data.qty),
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, itemId));

    const data = await getCartWithItems(item.cartId);
    return jsonOk(data);
  } catch (error) {
    console.error("[PATCH /api/cart/[itemId]]", error);
    return jsonError("Failed to update cart", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await params;
    const [item] = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.id, itemId))
      .limit(1);
    if (!item) return jsonError("Cart item not found", 404);

    await db.delete(cartItems).where(eq(cartItems.id, itemId));
    const data = await getCartWithItems(item.cartId);
    return jsonOk(data);
  } catch (error) {
    console.error("[DELETE /api/cart/[itemId]]", error);
    return jsonError("Failed to remove item", 500);
  }
}
