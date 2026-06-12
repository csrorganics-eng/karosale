import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { createRecipientGroup, listRecipientGroups } from "@/lib/marketing/campaign-queries";

const postSchema = z.object({
  name: z.string().min(1).max(120),
  phoneNumbers: z.array(z.string().min(8).max(20)).max(500),
  description: z.string().max(500).optional(),
});

export async function GET() {
  try {
    await requireRole(["admin"]);
    const groups = await listRecipientGroups();
    return jsonOk({ groups });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[GET whatsapp/groups]", e);
    return jsonError("Failed to list groups", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const group = await createRecipientGroup(
      parsed.data.name,
      parsed.data.phoneNumbers,
      parsed.data.description,
    );
    return jsonOk({ group });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[POST whatsapp/groups]", e);
    return jsonError("Failed to create group", 500);
  }
}
