import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { deleteSocialConnection } from "@/lib/marketing/social-token-store";

const bodySchema = z.object({
  provider: z.enum(["facebook", "instagram", "whatsapp"]),
});

export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    await deleteSocialConnection(session.user.id, parsed.data.provider);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[POST /api/admin/marketing/social/disconnect]", e);
    return jsonError("Disconnect failed", 500);
  }
}
