import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { deleteCampaign, getCampaignApiBundle, getCampaignById, updateCampaign } from "@/lib/marketing/campaign-queries";

const patchDestUrl = z.preprocess(
  (v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    return typeof v === "string" ? v.trim() : v;
  },
  z.union([z.string().url().max(2000), z.null()]).optional(),
);

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  postText: z.string().min(1).max(8000).optional(),
  whatsappText: z.preprocess(
    (v) => {
      if (v === undefined) return undefined;
      if (v === null || v === "") return null;
      return typeof v === "string" ? v.trim() : v;
    },
    z.union([z.string().max(8000), z.null()]).optional(),
  ),
  campaignKind: z.enum(["product", "event"]).optional(),
  productId: z.string().uuid().optional().nullable(),
  eventTitle: z.string().max(200).optional().nullable(),
  eventDescription: z.string().max(8000).optional().nullable(),
  eventReferenceImageUrl: z.string().max(900).optional().nullable(),
  bannerAspect: z.enum(["16:9", "9:16", "1:1"]).optional(),
  imagePrompt: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().max(16000).optional().nullable(),
  bannerImagePrompt: z.string().max(2000).optional().nullable(),
  bannerImageUrl: z.string().max(16000).optional().nullable(),
  imageRefinementPrompt: z.string().max(1200).optional().nullable(),
  productPageUrl: patchDestUrl,
  redirectUrl: patchDestUrl,
  platforms: z.array(z.enum(["facebook", "instagram", "whatsapp"])).optional(),
  status: z.enum(["draft", "published", "partial", "failed"]).optional(),
  publishedAt: z.coerce.date().optional(),
  facebookPostId: z.string().max(200).optional().nullable(),
  instagramPostId: z.string().max(200).optional().nullable(),
  whatsappRecipients: z.number().int().min(0).optional(),
  errorLog: z.string().max(16000).optional().nullable(),
});

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id: raw } = await context.params;
    const id = parseId(raw);
    if (id == null) return jsonError("Invalid id", 400);
    const bundle = await getCampaignApiBundle(id);
    if (!bundle) return jsonError("Not found", 404);
    return jsonOk(bundle);
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[GET /api/admin/marketing/campaigns/[id]]", e);
    return jsonError("Failed to load campaign", 500);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id: raw } = await context.params;
    const id = parseId(raw);
    if (id == null) return jsonError("Invalid id", 400);
    const existing = await getCampaignById(id);
    if (!existing) return jsonError("Not found", 404);

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const p = parsed.data;
    const imageUrl =
      p.imageUrl === "" ? null : p.imageUrl === undefined ? undefined : p.imageUrl ?? undefined;
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
      return jsonError("Image URL must be an https URL", 400);
    }
    const bannerImageUrl =
      p.bannerImageUrl === "" ? null : p.bannerImageUrl === undefined ? undefined : p.bannerImageUrl ?? undefined;
    if (bannerImageUrl && !/^https:\/\//i.test(bannerImageUrl)) {
      return jsonError("Banner image URL must be an https URL", 400);
    }
    const eventRef =
      p.eventReferenceImageUrl === ""
        ? null
        : p.eventReferenceImageUrl === undefined
          ? undefined
          : p.eventReferenceImageUrl ?? undefined;
    if (eventRef && !/^https:\/\//i.test(eventRef)) {
      return jsonError("Event reference image URL must be an https URL", 400);
    }

    const mergedKind = (p.campaignKind ?? existing.campaignKind ?? "product") as "product" | "event";
    const incomingProductId =
      p.productId === "" ? null : p.productId === undefined ? undefined : p.productId;
    if (mergedKind === "event" && incomingProductId) {
      return jsonError("Event campaigns cannot be linked to a catalog product.", 400);
    }
    const productIdForUpdate =
      mergedKind === "event"
        ? null
        : p.productId === undefined
          ? undefined
          : p.productId === ""
            ? null
            : p.productId;

    const productPageUrlForUpdate =
      mergedKind === "event"
        ? null
        : p.productPageUrl === undefined
          ? undefined
          : p.productPageUrl;

    await updateCampaign(id, {
      title: p.title,
      postText: p.postText,
      whatsappText: p.whatsappText === undefined ? undefined : p.whatsappText,
      campaignKind: p.campaignKind,
      productId: productIdForUpdate,
      eventTitle: p.eventTitle === undefined ? undefined : p.eventTitle === "" ? null : p.eventTitle,
      eventDescription:
        p.eventDescription === undefined ? undefined : p.eventDescription === "" ? null : p.eventDescription,
      eventReferenceImageUrl: eventRef === undefined ? undefined : eventRef ?? undefined,
      bannerAspect: p.bannerAspect,
      imageRefinementPrompt:
        p.imageRefinementPrompt === undefined
          ? undefined
          : p.imageRefinementPrompt === ""
            ? null
            : p.imageRefinementPrompt,
      productPageUrl: productPageUrlForUpdate,
      redirectUrl: p.redirectUrl === undefined ? undefined : p.redirectUrl,
      imagePrompt: p.imagePrompt === undefined ? undefined : p.imagePrompt ?? undefined,
      imageUrl: imageUrl === undefined ? undefined : imageUrl ?? undefined,
      bannerImagePrompt:
        p.bannerImagePrompt === undefined ? undefined : p.bannerImagePrompt === "" ? null : p.bannerImagePrompt,
      bannerImageUrl: bannerImageUrl === undefined ? undefined : bannerImageUrl ?? undefined,
      platforms: p.platforms,
      status: p.status,
      publishedAt: p.publishedAt ? new Date(p.publishedAt) : undefined,
      facebookPostId: p.facebookPostId === undefined ? undefined : p.facebookPostId ?? undefined,
      instagramPostId:
        p.instagramPostId === undefined ? undefined : p.instagramPostId ?? undefined,
      whatsappRecipients: p.whatsappRecipients,
      errorLog: p.errorLog === undefined ? undefined : p.errorLog ?? undefined,
    });

    const bundle = await getCampaignApiBundle(id);
    if (!bundle) return jsonError("Not found", 404);
    return jsonOk(bundle);
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[PATCH /api/admin/marketing/campaigns/[id]]", e);
    return jsonError("Failed to update campaign", 500);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["admin"]);
    const { id: raw } = await context.params;
    const id = parseId(raw);
    if (id == null) return jsonError("Invalid id", 400);
    const existing = await getCampaignById(id);
    if (!existing) return jsonError("Not found", 404);
    await deleteCampaign(id);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[DELETE /api/admin/marketing/campaigns/[id]]", e);
    return jsonError("Failed to delete campaign", 500);
  }
}
