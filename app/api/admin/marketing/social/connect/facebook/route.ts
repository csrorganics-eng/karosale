import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { jsonError } from "@/lib/api-response";
import { buildFacebookOAuthStart } from "@/lib/marketing/facebook-oauth-start";

export async function GET(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const out = buildFacebookOAuthStart(session.user.id);
    if (!out.ok) {
      return jsonError(out.message, out.status ?? 500);
    }
    return NextResponse.redirect(out.url);
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[GET /api/admin/marketing/social/connect/facebook]", e);
    return jsonError(e instanceof Error ? e.message : "OAuth start failed", 500);
  }
}
