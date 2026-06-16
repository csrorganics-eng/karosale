import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { productImages, products } from "@/lib/db/schema";
import { getSiteOrigin } from "@/lib/seo/site-config";

export const revalidate = 3600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const origin = getSiteOrigin();
  let rows: { page: string; image: string; title: string; caption: string }[] = [];
  try {
    const data = await db
      .select({
        slug: products.slug,
        name: products.name,
        shortDescription: products.shortDescription,
        url: productImages.url,
        altText: productImages.altText,
      })
      .from(products)
      .innerJoin(productImages, eq(productImages.productId, products.id))
      .where(and(eq(products.isActive, true), isNull(products.deletedAt)))
      .limit(5000);

    rows = data.map((r) => ({
      page: `${origin}/shop/${r.slug}`,
      image: r.url,
      title: escapeXml(r.name),
      caption: escapeXml((r.altText || r.shortDescription || r.name).slice(0, 200)),
    }));
  } catch {
    rows = [];
  }

  const urls = rows
    .map(
      (r) => `  <url>
    <loc>${escapeXml(r.page)}</loc>
    <image:image>
      <image:loc>${escapeXml(r.image)}</image:loc>
      <image:title>${r.title}</image:title>
      <image:caption>${r.caption}</image:caption>
    </image:image>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
