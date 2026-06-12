import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { buildFacebookOAuthStart } from "@/lib/marketing/facebook-oauth-start";
import { ADMIN_SETTINGS_MARKETING_CHANNELS } from "@/lib/admin-marketing-routes";

function channelsWithError(request: Request, message: string) {
  const u = new URL(ADMIN_SETTINGS_MARKETING_CHANNELS, request.url);
  u.searchParams.set("error", message);
  return NextResponse.redirect(u);
}

/**
 * Facebook OAuth entry. Under `/admin/settings/...` so middleware enforces admin before this runs.
 */
export async function GET(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const out = buildFacebookOAuthStart(session.user.id);
    if (!out.ok) {
      return channelsWithError(request, out.message);
    }
    return NextResponse.redirect(out.url);
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (e instanceof Error && e.message === "Unauthorized") {
      const u = new URL("/account", request.url);
      u.searchParams.set("redirect", ADMIN_SETTINGS_MARKETING_CHANNELS);
      return NextResponse.redirect(u);
    }
    console.error("[GET /admin/settings/marketing-channels/facebook/start]", e);
    return channelsWithError(
      request,
      e instanceof Error ? e.message : "Could not start Facebook login.",
    );
  }
}
