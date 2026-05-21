import { eq, sql, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { inventoryLog, products, categories } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireRole(["admin"]);

    const list = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        stockQty: products.stockQty,
        lowStockThreshold: products.lowStockThreshold,
        expiryDate: products.expiryDate,
        categoryName: categories.name,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(and(isNull(products.deletedAt), eq(products.isActive, true)));

    return jsonOk({
      products: list.map((p) => ({
        ...p,
        status:
          p.stockQty === 0
            ? "out_of_stock"
            : p.stockQty <= p.lowStockThreshold
              ? "low_stock"
              : "in_stock",
      })),
    });
  } catch (error) {
    return jsonError("Failed to load inventory", 500);
  }
}

const adjustSchema = z.object({
  productId: z.string().uuid(),
  qtyChange: z.number().int(),
  note: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await request.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request", 400);

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, parsed.data.productId))
      .limit(1);

    if (!product) return jsonError("Product not found", 404);

    const qtyBefore = product.stockQty;
    const qtyAfter = Math.max(0, qtyBefore + parsed.data.qtyChange);

    await db
      .update(products)
      .set({ stockQty: qtyAfter, updatedAt: new Date() })
      .where(eq(products.id, product.id));

    await db.insert(inventoryLog).values({
      productId: product.id,
      type: "adjustment",
      qtyChange: parsed.data.qtyChange,
      qtyBefore,
      qtyAfter,
      note: parsed.data.note,
      performedBy: session.user.id,
    });

    return jsonOk({ stockQty: qtyAfter });
  } catch (error) {
    return jsonError("Adjustment failed", 500);
  }
}
