import { requireAuth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";
import { jsonOk, jsonError } from "@/lib/api-response";
import { randomUUID } from "crypto";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("Expected multipart field \"file\"", 400);
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
    const key = `reviews/${session.user.id}/${randomUUID()}.${ext}`;

    const url = await uploadToR2({
      key,
      body: buf,
      contentType: file.type,
    });

    return jsonOk({ url }, 201);
  } catch (e) {
    console.error("[POST /api/reviews/upload]", e);
    const msg = e instanceof Error ? e.message : "Upload failed";
    if (msg.includes("not configured")) {
      return jsonError("Image uploads are not configured on this server", 503);
    }
    return jsonError("Upload failed", 500);
  }
}
