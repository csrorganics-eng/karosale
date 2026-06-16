import { NextResponse } from "next/server";
import { getSiteOrigin } from "@/lib/seo/site-config";

export async function POST(request: Request) {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET?.trim();
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!secret || auth !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const base = getSiteOrigin();
  const sitemap = `${base}/sitemap.xml`;
  const targets = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
  ];

  const results: { url: string; status: number }[] = [];
  for (const url of targets) {
    try {
      const r = await fetch(url, { method: "GET", cache: "no-store" });
      results.push({ url, status: r.status });
    } catch (e) {
      results.push({ url, status: 0 });
      console.error("[sitemap-ping]", url, e);
    }
  }

  return NextResponse.json({ ok: true, sitemap, results });
}
