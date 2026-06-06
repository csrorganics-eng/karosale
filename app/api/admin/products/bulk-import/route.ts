import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, productImages, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { jsonOk, jsonError } from "@/lib/api-response";

const rowSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  categorySlug: z.string().min(1),
  price: z.number().positive(),
  sku: z.string().min(1),
  stockQty: z.number().int().min(0),
  shortDescription: z.string().min(1).optional(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(200),
});

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid CSV payload", 400, parsed.error.flatten());

    const created: string[] = [];
    const errors: string[] = [];

    for (const row of parsed.data.rows) {
      try {
        const [cat] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, row.categorySlug))
          .limit(1);
        if (!cat) {
          errors.push(`${row.slug}: unknown category ${row.categorySlug}`);
          continue;
        }

        const [existing] = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.slug, row.slug))
          .limit(1);
        if (existing) {
          errors.push(`${row.slug}: already exists`);
          continue;
        }

        const [p] = await db
          .insert(products)
          .values({
            categoryId: cat.id,
            name: row.name,
            slug: row.slug,
            shortDescription: row.shortDescription ?? row.name,
            description: `<p>${row.name}</p>`,
            price: String(row.price),
            sku: row.sku,
            stockQty: row.stockQty,
          })
          .returning({ id: products.id });

        if (p) {
          created.push(p.id);
          await db.insert(productImages).values({
            productId: p.id,
            url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop",
            altText: row.name,
            isPrimary: true,
            sortOrder: 0,
          });
        }
      } catch (e) {
        errors.push(`${row.slug}: ${e instanceof Error ? e.message : "error"}`);
      }
    }

    return jsonOk({ created: created.length, ids: created, errors });
  } catch {
    return jsonError("Bulk import failed", 500);
  }
}
