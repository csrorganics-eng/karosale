/**
 * Base URL of the Next.js deployment (no trailing slash).
 * Create `apps/mobile/.env` with EXPO_PUBLIC_API_ORIGIN=http://192.168.x.x:3000 for device LAN testing.
 */
export function getApiOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_ORIGIN?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  /** Production storefront fallback — override for dev. */
  return "https://karosale.com";
}

export const BRAND_NAME = "CSR Organics";
