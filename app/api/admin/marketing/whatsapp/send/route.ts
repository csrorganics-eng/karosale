import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { sendBulkWhatsApp, isWhatsAppCloudConfigured } from "@/lib/marketing/whatsapp-publisher";
import { getRecipientGroup } from "@/lib/marketing/campaign-queries";

const bodySchema = z.object({
  groupId: z.number().int().positive(),
  message: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    if (!isWhatsAppCloudConfigured()) {
      return jsonError("WhatsApp Cloud API is not configured on this server.", 503);
    }
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const group = await getRecipientGroup(parsed.data.groupId);
    if (!group) return jsonError("Group not found", 404);

    const result = await sendBulkWhatsApp(group.phoneNumbers, parsed.data.message);
    return jsonOk(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[POST whatsapp/send]", e);
    return jsonError(e instanceof Error ? e.message : "Send failed", 500);
  }
}
