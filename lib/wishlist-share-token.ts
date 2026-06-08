import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  return (
    process.env.WISHLIST_SHARE_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "dev-wishlist-share-secret-change-in-production"
  );
}

function signPayload(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Signed token: base64url({userId,exp}) . signature */
export function createWishlistShareToken(userId: string): string {
  const exp = Date.now() + TTL_MS;
  const body = Buffer.from(JSON.stringify({ userId, exp }), "utf8").toString("base64url");
  const sig = signPayload(body);
  return `${body}.${sig}`;
}

export function parseWishlistShareToken(token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = signPayload(body);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      userId: string;
      exp: number;
    };
    if (!json.userId || typeof json.exp !== "number") return null;
    if (Date.now() > json.exp) return null;
    return { userId: json.userId };
  } catch {
    return null;
  }
}
