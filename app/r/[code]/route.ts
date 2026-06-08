import { NextResponse } from "next/server";

const COOKIE = "csrorganics_ref";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase().slice(0, 12);
  if (!normalized) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.set(COOKIE, normalized, {
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
