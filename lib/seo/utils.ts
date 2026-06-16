import { transliterate } from "./transliterate-hindi";
import type { PageMeta, ProductRow } from "./types";
import { getSiteOrigin } from "./site-config";

/** URL-safe slug; best-effort transliteration for Hindi script. */
export function slugify(text: string): string {
  const t = transliterate(text.trim().toLowerCase());
  return t
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0900-\u097F-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function truncateDescription(text: string, maxLength = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLength) return t;
  const cut = t.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export function extractKeywords(product: ProductRow): string[] {
  const parts = [
    product.name,
    product.shortDescription,
    product.metaKeywords,
    product.isOrganicCertified ? "organic certified India NPOP" : "",
  ].filter(Boolean) as string[];
  const raw = parts.join(" ").toLowerCase();
  const tokens = raw.split(/[^a-z0-9\u0900-\u097F]+/).filter((w) => w.length > 2);
  return [...new Set(tokens)].slice(0, 24);
}

export function generateAltText(product: ProductRow, imageIndex: number): string {
  const base = product.name.trim();
  if (imageIndex === 0) return `${base} — primary packshot`;
  return `${base} — image ${imageIndex + 1}`;
}

export function buildProductTitle(product: ProductRow, brandHint?: string | null): string {
  const bits = [product.name, brandHint].filter(Boolean) as string[];
  let title = bits.join(" · ");
  if (title.length <= 60) return title;
  return `${title.slice(0, 57).trim()}…`;
}

export function isIndexable(page: PageMeta): boolean {
  return page.noindex !== true;
}

export function getAbsoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}
