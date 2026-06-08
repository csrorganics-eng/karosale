/**
 * Customer-facing marketplace branding (replaces legacy Karosale naming).
 * Override support/orders addresses via env in production.
 */
export const BRAND_NAME = "CSR Organics";
export const BRAND_SLUG = "csrorganics";
/** Path under `public/` */
export const BRAND_LOGO_PATH = "/brand/csrorganics-logo.webp";

export const BRAND_SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "hello@csrorganics.com";

export function getBrandLogoAbsoluteUrl(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!base) return "";
  return `${base}${BRAND_LOGO_PATH}`;
}
