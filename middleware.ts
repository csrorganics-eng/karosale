import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizeCanonicalPath, stripTrackingParams } from "@/lib/seo/url-normalize";
import { handleAffiliateTracking } from "@/lib/affiliate/middleware-track";

function getSessionToken(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  return getToken({
    req: request,
    secret,
    secureCookie: isProduction,
    cookieName: isProduction
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
  });
}

function normalizeSearchString(sp: URLSearchParams): string {
  const entries = [...sp.entries()].sort(([a], [b]) => a.localeCompare(b));
  const n = new URLSearchParams();
  for (const [k, v] of entries) n.append(k, v);
  return n.toString();
}

function maybeSeoRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/razorpay/")) return null;
    return null;
  }

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") return null;

  const cleaned = stripTrackingParams(searchParams);
  const pathNorm = normalizeCanonicalPath(pathname);
  const searchNorm = normalizeSearchString(cleaned);
  const origSearchNorm = normalizeSearchString(searchParams);

  if (pathNorm === pathname && searchNorm === origSearchNorm) return null;

  const url = request.nextUrl.clone();
  url.pathname = pathNorm;
  url.search = searchNorm ? `?${searchNorm}` : "";
  return NextResponse.redirect(url, 301);
}

export async function middleware(request: NextRequest) {
  const affiliate = await handleAffiliateTracking(request);
  if (affiliate) return affiliate;

  const seo = maybeSeoRedirect(request);
  if (seo) return seo;

  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/packer")) {
    return NextResponse.next();
  }

  let token = await getSessionToken(request);

  if (!token) {
    token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
      cookieName:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
    });
  }

  const isLoggedIn = !!token;
  const role = (token?.role as string) ?? "customer";

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL("/account?redirect=/admin/dashboard", request.url),
      );
    }
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (pathname.startsWith("/packer")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(
        new URL("/account?redirect=/packer/picklist", request.url),
      );
    }
    if (role !== "packer" && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
