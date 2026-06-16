import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";

export async function getVendorBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.slug, slug), eq(vendors.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function listActiveVendorsForDirectory() {
  return db
    .select({
      slug: vendors.slug,
      businessName: vendors.businessName,
      updatedAt: vendors.updatedAt,
    })
    .from(vendors)
    .where(eq(vendors.isActive, true));
}
