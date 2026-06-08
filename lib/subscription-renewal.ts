import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  addresses,
  orderItems,
  orders,
  productImages,
  productVariants,
  products,
  subscriptions,
  users,
} from "@/lib/db/schema";
import {
  computeTierDiscount,
  getTierForPoints,
  tierGrantsFreeShipping,
} from "@/lib/loyalty";
import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_CHARGE,
  generateOrderNumber,
} from "@/lib/orders";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type SubscriptionRow = typeof subscriptions.$inferSelect;

async function resolveShippingAddressId(
  tx: DbTx,
  userId: string,
): Promise<string | null> {
  const [addr] = await tx
    .select({ id: addresses.id })
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.updatedAt))
    .limit(1);
  if (addr) return addr.id;

  const [last] = await tx
    .select({ addressId: orders.addressId })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  return last?.addressId ?? null;
}

/**
 * Creates a COD renewal order for an active subscription (single line item).
 * Caller updates subscription row (next date, lastOrderId, counts) in the same transaction.
 */
export async function createSubscriptionRenewalOrder(
  tx: DbTx,
  sub: SubscriptionRow,
): Promise<{ orderId: string; orderNumber: string } | { error: string }> {
  const addressId = await resolveShippingAddressId(tx, sub.userId);
  if (!addressId) {
    return { error: "no_address" };
  }

  const [product] = await tx.select().from(products).where(eq(products.id, sub.productId)).limit(1);
  if (!product || !product.isActive) {
    return { error: "product_unavailable" };
  }

  let unitBase = parseFloat(product.price);
  let sku = product.sku;
  let variantId: string | null = null;
  if (sub.variantId) {
    const [v] = await tx
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, sub.variantId))
      .limit(1);
    if (v) {
      unitBase = parseFloat(String(v.price));
      sku = v.sku;
      variantId = v.id;
      if (v.stockQty < sub.qty) {
        return { error: "variant_oos" };
      }
    }
  } else if (product.stockQty < sub.qty) {
    return { error: "oos" };
  }

  const discPct = parseFloat(String(sub.discountPct));
  const unitAfterDisc = Math.round(unitBase * (1 - discPct / 100) * 100) / 100;
  const lineMerch = Math.round(unitAfterDisc * sub.qty * 100) / 100;

  const [user] = await tx.select().from(users).where(eq(users.id, sub.userId)).limit(1);
  if (!user) return { error: "no_user" };

  const tier = await getTierForPoints(user.karmaPoints);
  const tierDiscount = computeTierDiscount(lineMerch, tier);
  const merchandiseAfterTier = Math.max(0, lineMerch - tierDiscount);

  let shippingCharge = STANDARD_SHIPPING_CHARGE;
  const tierFree = tierGrantsFreeShipping(tier, merchandiseAfterTier);
  if (merchandiseAfterTier >= FREE_SHIPPING_THRESHOLD || tierFree) {
    shippingCharge = 0;
  }

  const total = Math.round((merchandiseAfterTier + shippingCharge) * 100) / 100;
  const orderNumber = await generateOrderNumber();

  const [img] = await tx
    .select({ url: productImages.url })
    .from(productImages)
    .where(and(eq(productImages.productId, product.id), eq(productImages.isPrimary, true)))
    .limit(1);

  const [created] = await tx
    .insert(orders)
    .values({
      orderNumber,
      userId: sub.userId,
      addressId,
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "pending",
      subtotal: String(lineMerch),
      discountAmount: String(tierDiscount),
      couponDiscount: "0",
      karmaPointsUsed: 0,
      karmaDiscount: "0",
      shippingCharge: String(shippingCharge),
      taxAmount: "0",
      total: String(total),
      notes: `Subscription renewal · subscriptionId=${sub.id}`,
    })
    .returning();

  if (!created) return { error: "insert_failed" };

  await tx.insert(orderItems).values({
    orderId: created.id,
    productId: product.id,
    variantId,
    productName: product.name,
    productSku: sku,
    productImage: img?.url ?? null,
    qty: sub.qty,
    unitPrice: String(unitAfterDisc),
    total: String(lineMerch),
  });

  return { orderId: created.id, orderNumber: created.orderNumber };
}
