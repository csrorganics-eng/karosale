/**
 * Minimal Hindi Devanagari → Latin fallback for slugify when slug is user-entered in Hindi.
 * Full transliteration would need a dedicated library; this strips non-ASCII for URL safety.
 */
export function transliterate(text: string): string {
  if (!/[\u0900-\u097F]/.test(text)) return text;
  // Strip Devanagari for slug segments; keep Latin remainder
  return text.replace(/[\u0900-\u097F]+/g, "").trim();
}
