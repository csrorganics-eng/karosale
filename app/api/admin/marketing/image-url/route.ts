import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import {
  buildSignedMarketingImageUrl,
  marketingSignedImageOrigin,
  mergeMarketingImagePrompt,
} from "@/lib/marketing/image-generator";
import { isAllowedMarketingReferenceImageUrl } from "@/lib/marketing/reference-image-url";

const bodySchema = z.object({
  imagePrompt: z.string().min(1).max(5000),
  /** Merged into the Flux prompt on regenerate (Step 2 “improve image”). */
  refinementPrompt: z.string().max(1200).optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  seed: z.number().int().optional(),
  /** HTTPS catalog image URL (trusted host). */
  referenceImageUrl: z.string().url().max(900).optional().nullable(),
  /** Sanitized short lines for controlled on-image typography (optional). */
  exactOverlayPrimary: z.string().max(120).optional().nullable(),
  exactOverlaySecondary: z.string().max(160).optional().nullable(),
});

/**
 * Returns a signed same-origin image URL for admin UI (regenerate preview) without exposing `sk_`.
 */
export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const origin = marketingSignedImageOrigin(request);
    const w = parsed.data.width ?? 1080;
    const h = parsed.data.height ?? 1080;
    const ref = parsed.data.referenceImageUrl?.trim() || null;
    if (ref && !isAllowedMarketingReferenceImageUrl(ref)) {
      return jsonError("referenceImageUrl host is not allowed for marketing images", 400);
    }
    const merged = mergeMarketingImagePrompt(
      parsed.data.imagePrompt,
      parsed.data.refinementPrompt?.trim() || "",
    );
    const imageUrl = buildSignedMarketingImageUrl(origin, merged, w, h, {
      seed: parsed.data.seed,
      referenceImageUrl: ref,
      exactOverlayPrimary: parsed.data.exactOverlayPrimary?.trim() || null,
      exactOverlaySecondary: parsed.data.exactOverlaySecondary?.trim() || null,
    });
    return jsonOk({ imageUrl });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    if (e instanceof Error && e.message.includes("AUTH_SECRET")) {
      return jsonError("Server signing secret missing — set AUTH_SECRET or NEXTAUTH_SECRET.", 503);
    }
    console.error("[POST /api/admin/marketing/image-url]", e);
    return jsonError(e instanceof Error ? e.message : "Failed to build image URL", 500);
  }
}
