import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { createCampaign, listCampaigns } from "@/lib/marketing/campaign-queries";

const optionalDestUrl = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? v.trim() : v),
  z.string().url().max(2000).optional(),
);

const postSchema = z
  .object({
    title: z.string().min(1).max(200),
    postText: z.string().min(1).max(8000),
    whatsappText: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? v.trim() : v),
      z.string().max(8000).optional(),
    ),
    campaignKind: z.enum(["product", "event"]).optional().default("product"),
    productId: z.string().uuid().optional().nullable(),
    eventTitle: z.string().max(200).optional().nullable(),
    eventDescription: z.string().max(8000).optional().nullable(),
    eventReferenceImageUrl: z.string().max(900).optional().nullable(),
    bannerAspect: z.enum(["16:9", "9:16", "1:1"]).optional(),
    imagePrompt: z.string().max(2000).optional(),
    imageUrl: z.string().max(16000).optional(),
    bannerImagePrompt: z.string().max(2000).optional().nullable(),
    bannerImageUrl: z.string().max(16000).optional().nullable(),
    imageRefinementPrompt: z.string().max(1200).optional().nullable(),
    /** Product campaigns: canonical storefront product URL. */
    productPageUrl: optionalDestUrl,
    /** Landing URL (event: homepage; product: product page or UTM / short link). */
    redirectUrl: optionalDestUrl,
    platforms: z.array(z.enum(["facebook", "instagram", "whatsapp"])).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.campaignKind === "event") {
      if (!data.eventTitle?.trim()) {
        ctx.addIssue({ code: "custom", message: "eventTitle is required for event campaigns", path: ["eventTitle"] });
      }
      if (!data.eventDescription?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "eventDescription is required for event campaigns",
          path: ["eventDescription"],
        });
      }
      if (data.productId) {
        ctx.addIssue({
          code: "custom",
          message: "productId must be empty for event campaigns",
          path: ["productId"],
        });
      }
      if (data.productPageUrl) {
        ctx.addIssue({
          code: "custom",
          message: "productPageUrl is only for product campaigns",
          path: ["productPageUrl"],
        });
      }
    }
  });

export async function GET() {
  try {
    await requireRole(["admin"]);
    const campaigns = await listCampaigns(50);
    return jsonOk({ campaigns });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[GET /api/admin/marketing/campaigns]", e);
    return jsonError("Failed to list campaigns", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const imageUrl =
      parsed.data.imageUrl === "" ? undefined : parsed.data.imageUrl ?? undefined;
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
      return jsonError("Image URL must be an https URL", 400);
    }

    const bannerImageUrl =
      parsed.data.bannerImageUrl === "" ? undefined : parsed.data.bannerImageUrl ?? undefined;
    if (bannerImageUrl && !/^https:\/\//i.test(bannerImageUrl)) {
      return jsonError("Banner image URL must be an https URL", 400);
    }

    const eventRef =
      parsed.data.eventReferenceImageUrl === ""
        ? undefined
        : parsed.data.eventReferenceImageUrl ?? undefined;
    if (eventRef && !/^https:\/\//i.test(eventRef)) {
      return jsonError("Event reference image URL must be https", 400);
    }

    const campaign = await createCampaign({
      title: parsed.data.title,
      postText: parsed.data.postText,
      whatsappText: parsed.data.whatsappText,
      campaignKind: parsed.data.campaignKind,
      productId: parsed.data.productId === "" ? null : parsed.data.productId ?? undefined,
      eventTitle: parsed.data.eventTitle === "" ? null : parsed.data.eventTitle?.trim() ?? undefined,
      eventDescription:
        parsed.data.eventDescription === "" ? null : parsed.data.eventDescription?.trim() ?? undefined,
      eventReferenceImageUrl: eventRef === undefined ? undefined : eventRef ?? undefined,
      bannerAspect: parsed.data.bannerAspect,
      imageRefinementPrompt:
        parsed.data.imageRefinementPrompt === ""
          ? null
          : parsed.data.imageRefinementPrompt?.trim() ?? undefined,
      productPageUrl:
        parsed.data.campaignKind === "event"
          ? null
          : parsed.data.productPageUrl === undefined
            ? undefined
            : parsed.data.productPageUrl ?? undefined,
      redirectUrl: parsed.data.redirectUrl === undefined ? undefined : parsed.data.redirectUrl ?? undefined,
      imagePrompt: parsed.data.imagePrompt,
      imageUrl,
      bannerImagePrompt:
        parsed.data.bannerImagePrompt === "" ? null : parsed.data.bannerImagePrompt ?? undefined,
      bannerImageUrl,
      platforms: parsed.data.platforms,
      createdBy: session.user.id,
    });
    return jsonOk({ campaign });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[POST /api/admin/marketing/campaigns]", e);
    return jsonError("Failed to create campaign", 500);
  }
}
