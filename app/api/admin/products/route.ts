import { desc, eq, isNull, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { createProductSchema } from "@/lib/validations/product";
import { slugify } from "@/lib/utils";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    await requireRole(["admin"]);
    const list = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        sku: products.sku,
        price: products.price,
        stockQty: products.stockQty,
        lowStockThreshold: products.lowStockThreshold,
        isActive: products.isActive,
        categoryName: categories.name,
        totalSales: products.totalSales,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.createdAt));

    return jsonOk({
      products: list.map((p) => ({
        ...p,
        lowStock: p.stockQty <= p.lowStockThreshold,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return jsonError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return jsonError("Forbidden", 403);
    }
    return jsonError("Failed to list products", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid product", 400, parsed.error.flatten());
    }

    const data = parsed.data;
    const slug = data.slug || slugify(data.name);

    const [created] = await db
      .insert(products)
      .values({
        categoryId: data.categoryId,
        name: data.name,
        slug,
        shortDescription: data.shortDescription,
        description: data.description,
        price: String(data.price),
        comparePrice: data.comparePrice ? String(data.comparePrice) : null,
        costPrice: data.costPrice ? String(data.costPrice) : null,
        sku: data.sku,
        stockQty: data.stockQty,
        lowStockThreshold: data.lowStockThreshold,
        isOrganicCertified: data.isOrganicCertified,
        isFeatured: data.isFeatured,
        isBestseller: data.isBestseller,
        isActive: data.isActive,
      })
      .returning();

    return jsonOk({ product: created }, 201);
  } catch (error) {
    console.error("[POST /api/admin/products]", error);
    return jsonError("Failed to create product", 500);
  }
}
