import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliateTrackingLinks, affiliates, products } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";

const site = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);
    const [aff] = await db.select().from(affiliates).where(eq(affiliates.userId, session.user.id)).limit(1);
    if (!aff) return jsonOk({ links: [], globalUrl: null });

    const links = await db
      .select()
      .from(affiliateTrackingLinks)
      .where(eq(affiliateTrackingLinks.affiliateId, aff.id))
      .orderBy(desc(affiliateTrackingLinks.createdAt));

    const globalUrl = `${site()}/af/${encodeURIComponent(aff.username)}`;
    return jsonOk({ links, globalUrl, username: aff.username });
  } catch (e) {
    console.error("[GET /api/affiliate/links]", e);
    return jsonError("Failed to load links", 500);
  }
}

const postSchema = z.object({
  productSlug: z.string().min(1).max(255).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Unauthorized", 401);
    const [aff] = await db
      .select()
      .from(affiliates)
      .where(and(eq(affiliates.userId, session.user.id), eq(affiliates.status, "active")))
      .limit(1);
    if (!aff) return jsonError("Active affiliate profile required", 403);

    const parsed = postSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid body", 400);

    let productId: string | null = null;
    let fullUrl = `${site()}/af/${encodeURIComponent(aff.username)}`;
    if (parsed.data.productSlug?.trim()) {
      const slug = parsed.data.productSlug.trim().toLowerCase();
      const [p] = await db
        .select({ id: products.id, slug: products.slug })
        .from(products)
        .where(and(eq(products.slug, slug), eq(products.isActive, true)))
        .limit(1);
      if (!p) return jsonError("Product not found", 404);
      productId = p.id;
      fullUrl = `${site()}/share/${encodeURIComponent(p.slug)}/${encodeURIComponent(aff.username)}`;
    }

    const [row] = await db
      .insert(affiliateTrackingLinks)
      .values({
        affiliateId: aff.id,
        productId,
        fullUrl,
        clickCount: 0,
      })
      .returning();

    return jsonOk({ link: row });
  } catch (e) {
    console.error("[POST /api/affiliate/links]", e);
    return jsonError("Failed to create link", 500);
  }
}
