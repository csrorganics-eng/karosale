/**
 * Opaque, tamper-evident affiliate tracking cookie (Edge + Node compatible via Web Crypto).
 * Payload: affiliate id + expiry unix seconds, sealed with HMAC-SHA256.
 */
import type { NextRequest, NextResponse } from "next/server";

const encoder = new TextEncoder();

function getSecret(): string {
  const s =
    process.env.AFFILIATE_COOKIE_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (!s) {
    throw new Error("AFFILIATE_COOKIE_SECRET (or AUTH_SECRET) must be set for affiliate cookies");
  }
  return s;
}

function cookieName(): string {
  return process.env.AFFILIATE_COOKIE_NAME?.trim() || "csro_affiliate_ref";
}

function toB64url(data: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function sealAffiliateId(affiliateId: number, maxAgeSeconds: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = `${affiliateId}:${exp}`;
  const key = await hmacKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `v1.${toB64url(new Uint8Array(encoder.encode(payload)))}.${toB64url(new Uint8Array(sig))}`;
}

export async function unsealAffiliateId(token: string): Promise<number | null> {
  if (!token.startsWith("v1.")) return null;
  const rest = token.slice(3);
  const lastDot = rest.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payloadB64 = rest.slice(0, lastDot);
  const sigB64 = rest.slice(lastDot + 1);
  let payloadBytes: Uint8Array;
  let sigBytes: Uint8Array;
  try {
    payloadBytes = fromB64url(payloadB64);
    sigBytes = fromB64url(sigB64);
  } catch {
    return null;
  }
  const payload = new TextDecoder().decode(payloadBytes);
  const key = await hmacKey(getSecret());
  const expected = await crypto.subtle.sign("HMAC", key, payloadBytes as BufferSource);
  if (sigBytes.length !== new Uint8Array(expected).length) return null;
  let diff = 0;
  const expArr = new Uint8Array(expected);
  for (let i = 0; i < sigBytes.length; i++) diff |= sigBytes[i]! ^ expArr[i]!;
  if (diff !== 0) return null;

  const colon = payload.indexOf(":");
  if (colon <= 0) return null;
  const id = Number.parseInt(payload.slice(0, colon), 10);
  const exp = Number.parseInt(payload.slice(colon + 1), 10);
  if (!Number.isFinite(id) || !Number.isFinite(exp)) return null;
  if (Math.floor(Date.now() / 1000) > exp) return null;
  return id;
}

export function getAffiliateCookieName(): string {
  return cookieName();
}

export async function readAffiliateIdFromRequest(request: NextRequest): Promise<number | null> {
  const raw = request.cookies.get(cookieName())?.value;
  if (!raw) return null;
  try {
    return await unsealAffiliateId(raw);
  } catch {
    return null;
  }
}

export async function setAffiliateCookieOnResponse(
  response: NextResponse,
  affiliateId: number,
  maxAgeSeconds: number,
): Promise<void> {
  const token = await sealAffiliateId(affiliateId, maxAgeSeconds);
  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set({
    name: cookieName(),
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}
