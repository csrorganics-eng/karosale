import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { createProductSchema } from "@/lib/validations/product";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const [row] = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);
    if (!row) return jsonError("Product not found", 404);
    return jsonOk({ product: row.product, categoryName: row.categoryName });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return jsonError(error.message, error.message === "Unauthorized" ? 401 : 403);
    }
    return jsonError("Failed to fetch product", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = createProductSchema.partial().safeParse(body);
    if (!parsed.success) return jsonError("Invalid product", 400);

    const data = parsed.data;
    const [updated] = await db
      .update(products)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: String(data.price) }),
        ...(data.comparePrice !== undefined && {
          comparePrice: data.comparePrice != null ? String(data.comparePrice) : null,
        }),
        ...(data.promotionalDiscountPct !== undefined && {
          promotionalDiscountPct:
            data.promotionalDiscountPct != null && data.promotionalDiscountPct > 0
              ? String(data.promotionalDiscountPct)
              : null,
        }),
        ...(data.costPrice !== undefined && {
          costPrice: data.costPrice != null ? String(data.costPrice) : null,
        }),
        ...(data.stockQty !== undefined && { stockQty: data.stockQty }),
        ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.isOrganicCertified !== undefined && { isOrganicCertified: data.isOrganicCertified }),
        ...(data.isBestseller !== undefined && { isBestseller: data.isBestseller }),
        ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (!updated) return jsonError("Product not found", 404);
    return jsonOk({ product: updated });
  } catch (error) {
    return jsonError("Failed to update product", 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id } = await params;

    const [updated] = await db
      .update(products)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    if (!updated) return jsonError("Product not found", 404);
    return jsonOk({ success: true });
  } catch (error) {
    return jsonError("Failed to delete product", 500);
  }
}
