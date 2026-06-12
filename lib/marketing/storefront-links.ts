/**
 * Base URL for customer-facing storefront links in admin marketing UI.
 * Prefer current browser origin when available (correct on preview deploys).
 */
export function marketingStorefrontBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (env ? env.replace(/\/+$/, "") : "") || "http://localhost:3000";
}

export function defaultStorefrontHomepageUrl(): string {
  return `${marketingStorefrontBaseUrl()}/`;
}

export function defaultProductShopUrl(productSlug: string): string {
  const slug = productSlug.trim();
  if (!slug) return "";
  return `${marketingStorefrontBaseUrl()}/shop/${encodeURIComponent(slug)}`;
}
