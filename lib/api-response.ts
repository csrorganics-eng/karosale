import { NextResponse } from "next/server";
import { CART_SESSION_HEADER_NAME } from "@/lib/cart-cookie";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

/** Cart / account-sensitive payloads — never allow browser or intermediary caching. */
export function jsonOkPrivateNoStore<T>(data: T, status = 200, cartSessionId?: string) {
  const res = NextResponse.json({ success: true, data }, { status });
  res.headers.set("Cache-Control", "private, no-store, must-revalidate");
  if (cartSessionId) {
    res.headers.set(CART_SESSION_HEADER_NAME, cartSessionId);
  }
  return res;
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, details },
    { status },
  );
}
