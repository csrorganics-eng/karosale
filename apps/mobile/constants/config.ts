export const BRAND_NAME = "CSR Organics";
export const BRAND_COLOR = "#1e4d3a";

export function getApiOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_ORIGIN?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://karosale.com";
}

export function formatInr(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(n)) return `₹${amount}`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
