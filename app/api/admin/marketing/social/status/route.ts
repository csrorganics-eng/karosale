import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { getSocialStatusSummary } from "@/lib/marketing/social-token-store";

export async function GET() {
  try {
    const session = await requireRole(["admin"]);
    const status = await getSocialStatusSummary(session.user.id);
    return jsonOk(status);
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[GET /api/admin/marketing/social/status]", e);
    return jsonError("Failed to load status", 500);
  }
}
