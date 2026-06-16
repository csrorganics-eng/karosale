const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
]);

/** Normalises a path for canonical comparison (lowercase, strip trailing slash except root). */
export function normalizeCanonicalPath(pathname: string): string {
  const lower = pathname.toLowerCase();
  if (lower === "/") return "/";
  return lower.replace(/\/+$/, "") || "/";
}

export function stripTrackingParams(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) {
    const kl = k.toLowerCase();
    if (TRACKING_PARAMS.has(kl) || kl.startsWith("utm_")) continue;
    if (kl === "page" && v === "1") continue;
    next.append(k, v);
  }
  return next;
}
