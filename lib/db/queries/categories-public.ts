import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";

export async function getCategoryBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function countProductsInCategory(categoryId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(products)
    .where(and(eq(products.categoryId, categoryId), eq(products.isActive, true), isNull(products.deletedAt)));
  return Number(row?.n ?? 0);
}
