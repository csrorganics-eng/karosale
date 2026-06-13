/**
 * Marketing preview URLs are often same-origin signed links to `/api/marketing/public-image`.
 * Production uses https; local dev uses http://localhost — both must be accepted for publish.
 */
export function isPublishableMarketingImageUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol === "http:") {
      const h = parsed.hostname.toLowerCase();
      return h === "localhost" || h === "127.0.0.1";
    }
    return false;
  } catch {
    return false;
  }
}

/** Normalize for storage: returns trimmed URL or null if not publishable. */
export function normalizeMarketingStoredImageUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const t = typeof url === "string" ? url.trim() : "";
  if (!t) return null;
  return isPublishableMarketingImageUrl(t) ? t : null;
}
