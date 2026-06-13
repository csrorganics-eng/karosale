/** Short lines for Flux: reduces garbled text vs long paragraphs. */
export const OVERLAY_PRIMARY_MAX = 52;
export const OVERLAY_SECONDARY_MAX = 80;

/**
 * Keeps letters/numbers (any script), common punctuation, and ₹; strips emojis/control chars
 * that tend to break image models or create fake “coupon” gibberish.
 */
export function sanitizeMarketingOverlayLine(raw: string, maxLen: number): string | null {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return null;
  const cleaned = t.replace(/[^\p{L}\p{N}\s.,'+%\-–—!?&₹]/gu, "").trim();
  if (!cleaned) return null;
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen);
  const sp = cut.lastIndexOf(" ");
  return (sp > maxLen * 0.55 ? cut.slice(0, sp) : cut).trimEnd();
}
