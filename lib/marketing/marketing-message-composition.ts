/**
 * How destination URLs appear in organic Meta posts: in the **caption** (tappable on mobile),
 * not as a custom hyperlink on the feed image.
 */

/** Append storefront URLs to caption when missing, for preview / optional server-side merge. */
export function appendDestinationUrlsToCaption(
  postText: string,
  opts: {
    redirectUrl?: string | null;
    productPageUrl?: string | null;
  },
): string {
  const base = postText.replace(/\s+$/, "");
  const r = opts.redirectUrl?.trim();
  const p = opts.productPageUrl?.trim();
  const lines: string[] = [];
  if (r && !base.includes(r)) lines.push(r);
  if (p && p !== r && !base.includes(p)) lines.push(p);
  if (lines.length === 0) return base;
  return base ? `${base}\n\n${lines.join("\n")}` : lines.join("\n");
}

/**
 * Final WhatsApp body: base message + image URL + destination link(s) when not already present.
 * Cloud API sends plain text (URLs become tappable); true media requires a separate image message.
 */
export function composeWhatsAppMarketingMessage(opts: {
  body: string;
  imageUrl?: string | null;
  redirectUrl?: string | null;
  productPageUrl?: string | null;
}): string {
  let t = opts.body.trim();
  const img = opts.imageUrl?.trim();
  const r = opts.redirectUrl?.trim();
  const p = opts.productPageUrl?.trim();
  const tail: string[] = [];
  if (img && !t.includes(img)) tail.push(`📷 ${img}`);
  if (r && !t.includes(r)) tail.push(`🔗 ${r}`);
  else if (p && !t.includes(p)) tail.push(`🔗 ${p}`);
  if (p && r && p !== r && !t.includes(p)) tail.push(`🛒 ${p}`);
  if (tail.length === 0) return t;
  return t ? `${t}\n\n${tail.join("\n")}` : tail.join("\n");
}
