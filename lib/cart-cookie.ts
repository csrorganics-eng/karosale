/** HttpOnly guest cart binding (separate from NextAuth session). */
export const CART_SESSION_COOKIE_NAME = "csrorganics_cart_session";

const CART_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function newCartSessionId(): string {
  return crypto.randomUUID();
}

export function cartSessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: CART_SESSION_MAX_AGE_SEC,
    path: "/" as const,
  };
}
