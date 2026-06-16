import { neon } from "@neondatabase/serverless";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sealAffiliateId, getAffiliateCookieName } from "@/lib/affiliate/cookie-token";

type NeonSql = ReturnType<typeof neon>;

async function isClickBurst(sql: NeonSql, ip: string | null | undefined): Promise<boolean> {
  if (!ip) return false;
  const rows = (await sql`
    SELECT count(*)::int AS c FROM affiliate_clicks
    WHERE ip_address = ${ip} AND created_at > now() - interval '1 hour'
  `) as unknown as { c: number }[];
  return (rows[0]?.c ?? 0) >= 50;
}

function getSql(): NeonSql | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  return neon(url);
}

async function loadCookieDays(sql: NeonSql): Promise<number> {
  const rows = (await sql`
    SELECT cookie_duration_days FROM affiliate_settings ORDER BY id ASC LIMIT 1
  `) as unknown as { cookie_duration_days: number }[];
  const d = rows[0]?.cookie_duration_days;
  return typeof d === "number" && d > 0 ? d : 7;
}

async function resolveActiveAffiliateId(sql: NeonSql, username: string): Promise<number | null> {
  const u = username.trim().toLowerCase();
  if (!u) return null;
  const rows = (await sql`
    SELECT id FROM affiliates WHERE lower(username) = ${u} AND status = 'active' LIMIT 1
  `) as unknown as { id: number }[];
  return rows[0]?.id ?? null;
}

async function resolveProductIdBySlug(sql: NeonSql, slug: string): Promise<string | null> {
  const s = slug.trim().toLowerCase();
  if (!s) return null;
  const rows = (await sql`
    SELECT id FROM products WHERE lower(slug) = ${s} AND is_active = true LIMIT 1
  `) as unknown as { id: string }[];
  return rows[0]?.id ?? null;
}

/**
 * Affiliate entry routes + ?ref= (runs on Edge; uses Neon HTTP only).
 * Call from root middleware before SEO param stripping so ref is still visible.
 */
export async function handleAffiliateTracking(request: NextRequest): Promise<NextResponse | null> {
  const sql = getSql();
  if (!sql) return null;

  let programEnabled = true;
  try {
    const en = (await sql`
      SELECT is_enabled FROM affiliate_settings ORDER BY id ASC LIMIT 1
    `) as unknown as { is_enabled: boolean }[];
    programEnabled = en[0]?.is_enabled !== false;
  } catch {
    return null;
  }
  if (!programEnabled) return null;

  const { pathname, searchParams } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  let affiliateUsername: string | null = null;
  let productId: string | null = null;
  let redirectTo: URL | null = null;

  if (segments[0] === "af" && segments[1]) {
    affiliateUsername = decodeURIComponent(segments[1]);
    redirectTo = new URL("/", request.url);
  } else if (segments[0] === "share" && segments[1] && segments[2]) {
    affiliateUsername = decodeURIComponent(segments[2]);
    const slug = decodeURIComponent(segments[1]);
    productId = await resolveProductIdBySlug(sql, slug);
    redirectTo = new URL(`/shop/${encodeURIComponent(slug)}`, request.url);
  }

  const refParam = searchParams.get("ref")?.trim();
  if (refParam && !affiliateUsername) {
    affiliateUsername = refParam;
    const cleaned = request.nextUrl.clone();
    cleaned.searchParams.delete("ref");
    redirectTo = cleaned;
  }

  if (!affiliateUsername) return null;

  const affiliateId = await resolveActiveAffiliateId(sql, affiliateUsername);
  if (!affiliateId) {
    if (redirectTo) return NextResponse.redirect(redirectTo, 302);
    return null;
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (await isClickBurst(sql, ip)) {
    if (redirectTo) return NextResponse.redirect(redirectTo, 302);
    return null;
  }

  const cookieDays = await loadCookieDays(sql);
  const maxAge = cookieDays * 86400;
  try {
    const token = await sealAffiliateId(affiliateId, maxAge);
    await sql`
      INSERT INTO affiliate_clicks (affiliate_id, product_id, ip_address, user_agent, referrer, visitor_id, converted)
      VALUES (
        ${affiliateId},
        ${productId},
        ${ip ?? null},
        ${request.headers.get("user-agent")},
        ${request.headers.get("referer")},
        null,
        false
      )
    `;

    if (!redirectTo) return null;
    const res = NextResponse.redirect(redirectTo, 302);
    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set({
      name: getAffiliateCookieName(),
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return res;
  } catch (e) {
    console.warn("[affiliate-middleware]", e);
    if (redirectTo) return NextResponse.redirect(redirectTo, 302);
    return null;
  }
}
