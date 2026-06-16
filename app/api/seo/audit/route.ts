import { NextResponse } from "next/server";
import { getSeoAuditReport } from "@/lib/seo/audit-report";
import { getSiteOrigin } from "@/lib/seo/site-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.AUDIT_SECRET?.trim();
  const url = new URL(request.url);
  if (!secret || url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const report = await getSeoAuditReport();
  const base = getSiteOrigin();

  return NextResponse.json({
    ok: true,
    report,
    generatedAt: report.generatedAt,
    site: base,
    productsMissingMetaDescription: report.productsMissingMetaDescription.total,
    sampleMissingMetaDescription: report.productsMissingMetaDescription.samples.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
    })),
    productsMissingImages: report.productsMissingImages.total,
    sampleMissingImages: report.productsMissingImages.samples,
    categoriesThinContent: report.thinCategories,
    duplicateMetaTitles: report.duplicateMetaTitles,
    sitemapUrlCountEstimate: report.sitemapEstimatedUrls,
    score: report.score,
  });
}
