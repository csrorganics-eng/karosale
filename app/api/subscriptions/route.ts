import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, subscriptions } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0]!;
}

function intervalDays(frequency: "weekly" | "fortnightly" | "monthly" | "bimonthly"): number {
  switch (frequency) {
    case "weekly":
      return 7;
    case "fortnightly":
      return 14;
    case "monthly":
      return 30;
    case "bimonthly":
      return 60;
    default:
      return 30;
  }
}

const createSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  qty: z.number().int().min(1).max(99).default(1),
  frequency: z.enum(["weekly", "fortnightly", "monthly", "bimonthly"]),
  nextOrderDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function GET() {
  try {
    const session = await requireAuth();
    const rows = await db
      .select({
        subscription: subscriptions,
        productName: products.name,
        productSlug: products.slug,
      })
      .from(subscriptions)
      .innerJoin(products, eq(subscriptions.productId, products.id))
      .where(eq(subscriptions.userId, session.user.id))
      .orderBy(desc(subscriptions.createdAt));

    return jsonOk({ subscriptions: rows });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400, parsed.error.flatten());

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, parsed.data.productId), eq(products.isActive, true)))
      .limit(1);

    if (!product) return jsonError("Product not found", 404);
    if (!product.isSubscriptionEligible) {
      return jsonError("This product is not available on subscribe & save", 400);
    }

    const today = new Date().toISOString().split("T")[0]!;
    const next =
      parsed.data.nextOrderDate ??
      addDays(today, intervalDays(parsed.data.frequency));

    const disc = product.subscriptionDiscountPct
      ? String(product.subscriptionDiscountPct)
      : "10";

    const [created] = await db
      .insert(subscriptions)
      .values({
        userId: session.user.id,
        productId: parsed.data.productId,
        variantId: parsed.data.variantId ?? null,
        qty: parsed.data.qty,
        frequency: parsed.data.frequency,
        nextOrderDate: next,
        discountPct: disc,
        status: "active",
      })
      .returning();

    return jsonOk({ subscription: created }, 201);
  } catch (e) {
    console.error("[POST /api/subscriptions]", e);
    return jsonError("Failed to create subscription", 500);
  }
}
