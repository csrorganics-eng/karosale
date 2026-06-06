import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, reviews, users } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const statusParam = z.enum(["pending", "approved", "rejected", "flagged"]).catch("pending");

export async function GET(request: Request) {
  try {
    await requireRole(["admin"]);
    const raw = new URL(request.url).searchParams.get("status");
    const status = statusParam.parse(raw ?? "pending");

    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        status: reviews.status,
        createdAt: reviews.createdAt,
        productName: products.name,
        productSlug: products.slug,
        userName: users.name,
        userEmail: users.email,
      })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.status, status as "pending" | "approved" | "rejected" | "flagged"))
      .orderBy(desc(reviews.createdAt))
      .limit(100);

    return jsonOk({ reviews: rows });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
