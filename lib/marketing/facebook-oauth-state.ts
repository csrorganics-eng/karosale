import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE_MS = 15 * 60 * 1000;

function signingSecret(): string {
  const s =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (!s) throw new Error("AUTH_SECRET is required for OAuth state");
  return s;
}

export function createFacebookOAuthState(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, t: Date.now() }), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyFacebookOAuthState(state: string): string {
  const dot = state.lastIndexOf(".");
  if (dot <= 0) throw new Error("INVALID_STATE");
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac("sha256", signingSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("INVALID_STATE");
  }
  let parsed: { u?: string; t?: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: string;
      t?: number;
    };
  } catch {
    throw new Error("INVALID_STATE");
  }
  if (!parsed.u || typeof parsed.t !== "number") throw new Error("INVALID_STATE");
  if (Date.now() - parsed.t > MAX_AGE_MS) throw new Error("STATE_EXPIRED");
  return parsed.u;
}

export function getFacebookRedirectUri(): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL or AUTH_URL must be set for Facebook OAuth");
  return `${base}/api/admin/marketing/social/connect/facebook/callback`;
}
