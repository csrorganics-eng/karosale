import { BRAND_NAME, getBrandLogoAbsoluteUrl } from "@/lib/brand";

/** HTML for Auth.js email (magic link) — no React runtime required. */
export function buildMagicLinkEmailHtml(params: { url: string; host: string }) {
  const { url, host } = params;
  const safeHost = host.replace(/\./g, "&#8203;.");
  const logo = getBrandLogoAbsoluteUrl();
  const header = logo
    ? `<img src="${logo}" alt="${BRAND_NAME}" width="180" height="48" style="max-width:180px;height:auto;margin:0 auto 16px;display:block" />`
    : `<p style="margin:0;font-size:22px;font-weight:700;color:#1e4d3a">${BRAND_NAME}</p>`;

  return `<!DOCTYPE html><html><body style="margin:0;background:#fafbf9;font-family:DM Sans,Segoe UI,sans-serif;color:#141c17">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#fff;border-radius:16px;border:1px solid #dde8e2;overflow:hidden">
        <tr><td style="padding:28px 24px;text-align:center;background:linear-gradient(180deg,#1e4d3a 0%,#163529 100%);color:#fafbf9">
          ${header}
          <p style="margin:0;font-size:13px;opacity:0.9">Secure sign-in</p>
        </td></tr>
        <tr><td style="padding:28px 24px 32px">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5">Sign in to <strong>${safeHost}</strong> by clicking the button below. This link expires in 24 hours.</p>
          <p style="margin:0 0 24px;text-align:center">
            <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#d8562a,#b8321e);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:12px">Sign in to ${BRAND_NAME}</a>
          </p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#5a6b62">If you did not request this email, you can ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
