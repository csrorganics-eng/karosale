import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  try {
    const items = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder));
    return jsonOk({ categories: items });
  } catch (error) {
    console.error("[GET /api/categories]", error);
    return jsonError("Failed to fetch categories", 500);
  }
}
