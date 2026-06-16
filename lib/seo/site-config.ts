/**
 * Canonical site origin for metadata, JSON-LD, and sitemaps.
 * Prefer `NEXT_PUBLIC_SITE_URL` in production; falls back to `NEXT_PUBLIC_APP_URL`.
 */
export function getSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://csrorganics.com";
  return raw.replace(/\/$/, "");
}

export function getMetadataBaseUrl(): URL {
  return new URL(`${getSiteOrigin()}/`);
}
