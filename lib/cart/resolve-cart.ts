import { cookies, headers } from "next/headers";
import { findOrCreateCart } from "@/lib/db/queries/cart";
import { getAppSession } from "@/lib/auth";
import {
  CART_SESSION_COOKIE_NAME,
  CART_SESSION_HEADER_NAME,
  cartSessionCookieOptions,
  newCartSessionId as createCartSessionId,
} from "@/lib/cart-cookie";

export type ResolvedCart = {
  cart: Awaited<ReturnType<typeof findOrCreateCart>>;
  /** Set on response when a new guest session was created (mobile stores this). */
  newCartSessionId?: string;
};

export async function resolveCartFromRequest(): Promise<ResolvedCart> {
  const session = await getAppSession();
  const cookieStore = await cookies();
  const headerStore = await headers();

  let sessionId =
    headerStore.get(CART_SESSION_HEADER_NAME) ??
    cookieStore.get(CART_SESSION_COOKIE_NAME)?.value;

  let newCartSessionId: string | undefined;

  if (!sessionId && !session?.user?.id) {
    const created = createCartSessionId();
    sessionId = created;
    newCartSessionId = created;
    cookieStore.set(CART_SESSION_COOKIE_NAME, sessionId, cartSessionCookieOptions());
  }

  const cart = await findOrCreateCart(session?.user?.id, sessionId);
  return { cart, newCartSessionId };
}
