import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let token = await getSessionToken(request);

  // Fallback for legacy NextAuth v4 cookie name on some deployments
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
  matcher: ["/admin/:path*", "/packer/:path*"],
};
