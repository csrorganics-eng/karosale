import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CART_SESSION_COOKIE_NAME,
  cartSessionCookieOptions,
  newCartSessionId,
} from "@/lib/cart-cookie";

/**
 * Mint a fresh anonymous cart session cookie. Call after sign-out so the browser
 * does not keep resolving the previous guest cookie state alongside a cleared auth session.
 */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(CART_SESSION_COOKIE_NAME, newCartSessionId(), cartSessionCookieOptions());
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Cache-Control", "private, no-store, must-revalidate");
  return res;
}
