import { createFacebookOAuthState, getFacebookRedirectUri } from "@/lib/marketing/facebook-oauth-state";

export type FacebookOAuthStartResult =
  | { ok: true; url: string }
  | { ok: false; message: string; status?: number };

/**
 * Build the Facebook Login dialog URL (Marketing OAuth).
 * Used by the admin start route (HTML redirect) and the legacy API route (JSON on failure).
 */
export function buildFacebookOAuthStart(userId: string): FacebookOAuthStartResult {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  if (!appId) {
    return {
      ok: false,
      message:
        "FACEBOOK_APP_ID is not configured. Add it to .env.local and restart the dev server.",
      status: 503,
    };
  }
  try {
    const redirectUri = encodeURIComponent(getFacebookRedirectUri());
    const state = encodeURIComponent(createFacebookOAuthState(userId));
    const scope = encodeURIComponent(
      "pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management",
    );
    const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&response_type=code`;
    return { ok: true, url };
  } catch (e) {
    const message = e instanceof Error ? e.message : "OAuth start failed";
    return { ok: false, message, status: 500 };
  }
}
