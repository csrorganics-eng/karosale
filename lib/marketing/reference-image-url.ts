/**
 * Reference images for marketing / Pollinations must be https URLs on trusted hosts
 * (mitigates SSRF if signed URLs are ever mishandled).
 */
function parseExtraHosts(): string[] {
  const raw = process.env.MARKETING_REF_IMAGE_HOSTS?.trim();
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function tryHostname(urlStr: string): string | null {
  try {
    return new URL(urlStr).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostFromEnvUrl(envName: string): string | null {
  const raw = process.env[envName]?.trim();
  if (!raw) return null;
  return tryHostname(raw);
}

const TRUSTED_HOST_SUFFIXES = [".r2.dev", ".cloudflarestorage.com", ".amazonaws.com"];

export function isAllowedMarketingReferenceImageUrl(urlStr: string): boolean {
  const u = urlStr.trim();
  if (!u || u.length > 900) return false;
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (!host) return false;

  const exact = new Set<string>();
  for (const env of [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_MEDIA_URL",
    "AUTH_URL",
    "CLOUDFLARE_R2_PUBLIC_URL",
  ] as const) {
    const h = hostFromEnvUrl(env);
    if (h) exact.add(h);
  }
  for (const h of parseExtraHosts()) exact.add(h);

  if (exact.has(host)) return true;

  for (const suf of TRUSTED_HOST_SUFFIXES) {
    if (host === suf.slice(1)) return true;
    if (host.endsWith(suf)) return true;
  }

  return false;
}
