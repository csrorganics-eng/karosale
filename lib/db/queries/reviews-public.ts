import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reviews, users } from "@/lib/db/schema";
import type { SeoReview } from "@/lib/seo/types";

export async function listApprovedReviewsForProduct(productId: string, limit = 24): Promise<SeoReview[]> {
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
      userName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    authorName: r.userName,
    datePublished: r.createdAt,
  }));
}
