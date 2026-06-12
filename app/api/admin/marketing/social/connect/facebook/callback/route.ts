import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  exchangeForLongLivedToken,
  getPagesList,
} from "@/lib/marketing/facebook-publisher";
import { getLinkedInstagramAccount } from "@/lib/marketing/instagram-publisher";
import { getFacebookRedirectUri, verifyFacebookOAuthState } from "@/lib/marketing/facebook-oauth-state";
import { upsertSocialConnection } from "@/lib/marketing/social-token-store";
import { ADMIN_SETTINGS_MARKETING_CHANNELS } from "@/lib/admin-marketing-routes";

async function exchangeCodeForShortToken(code: string): Promise<string> {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!appId || !appSecret) throw new Error("Facebook app credentials are not configured");
  const redirectUri = getFacebookRedirectUri();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    client_secret: appSecret,
    code,
  });
  const url = `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`;
  const res = await fetch(url);
  const json = (await res.json()) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message ?? "Token exchange failed");
  }
  return json.access_token;
}

function publicBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.AUTH_URL?.trim() || "").replace(
    /\/$/,
    "",
  );
}

export async function GET(request: Request) {
  const base = publicBaseUrl();
  const fail = (msg: string) =>
    NextResponse.redirect(`${base}${ADMIN_SETTINGS_MARKETING_CHANNELS}?error=${encodeURIComponent(msg)}`);

  try {
    const session = await requireRole(["admin"]);
    const url = new URL(request.url);
    const err = url.searchParams.get("error_description") ?? url.searchParams.get("error");
    if (err) return fail(err);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return fail("Missing OAuth code or state");

    let stateUserId: string;
    try {
      stateUserId = verifyFacebookOAuthState(state);
    } catch {
      return fail("Invalid or expired OAuth state — try connecting again.");
    }
    if (stateUserId !== session.user.id) {
      return fail("OAuth state does not match your session.");
    }

    const short = await exchangeCodeForShortToken(code);
    const { accessToken: longUser, expiresAt } = await exchangeForLongLivedToken(short);
    const pages = await getPagesList(longUser);
    if (pages.length === 0) {
      return fail("No Facebook Pages found for this account.");
    }
    const page = pages[0]!;

    await upsertSocialConnection(session.user.id, {
      provider: "facebook",
      providerAccountId: page.id,
      accessToken: page.access_token,
      tokenExpiresAt: expiresAt,
      pageId: page.id,
      pageName: page.name,
    });

    const ig = await getLinkedInstagramAccount(page.id, page.access_token);
    if (ig) {
      await upsertSocialConnection(session.user.id, {
        provider: "instagram",
        providerAccountId: ig.igUserId,
        accessToken: page.access_token,
        tokenExpiresAt: expiresAt,
        pageId: page.id,
        pageName: page.name,
        igUserId: ig.igUserId,
      });
    }

    return NextResponse.redirect(`${publicBaseUrl()}${ADMIN_SETTINGS_MARKETING_CHANNELS}?success=1`);
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return NextResponse.redirect(`${base}${ADMIN_SETTINGS_MARKETING_CHANNELS}?error=forbidden`);
    }
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.redirect(
        `${base}/account?callbackUrl=${encodeURIComponent(ADMIN_SETTINGS_MARKETING_CHANNELS)}`,
      );
    }
    console.error("[GET facebook/callback]", e);
    const msg = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.redirect(
      `${publicBaseUrl()}${ADMIN_SETTINGS_MARKETING_CHANNELS}?error=${encodeURIComponent(msg)}`,
    );
  }
}
