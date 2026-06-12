import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";
import { jsonOk, jsonError } from "@/lib/api-response";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Admin-only: optional reference image for event marketing campaigns (R2 HTTPS URL). */
export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError('Expected multipart field "file"', 400);
    }
    if (!ALLOWED.has(file.type)) {
      return jsonError("Only JPEG, PNG, or WebP images are allowed", 400);
    }
    if (file.size > MAX_BYTES) {
      return jsonError("Image must be 4MB or smaller", 400);
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const key = `marketing/events/${session.user.id}/${randomUUID()}.${ext}`;

    const url = await uploadToR2({
      key,
      body: buf,
      contentType: file.type,
    });

    return jsonOk({ url }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[POST /api/admin/marketing/event-image]", e);
    const msg = e instanceof Error ? e.message : "Upload failed";
    if (msg.includes("not configured")) {
      return jsonError("Image uploads are not configured on this server", 503);
    }
    return jsonError("Upload failed", 500);
  }
}
