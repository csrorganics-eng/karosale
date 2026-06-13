import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import {
  AI_ROUTER_ALL_PROVIDERS_EXHAUSTED,
  isAiRouterExhausted,
  isAiRouterOrGeminiConfigured,
} from "@/lib/ai-router";
import { generateMarketingContent } from "@/lib/marketing/ai-content-generator";
import { bannerDimensionsForAspect, parseMarketingBannerAspect } from "@/lib/marketing/banner-aspect";
import { buildSignedMarketingImageUrl, mergeMarketingImagePrompt } from "@/lib/marketing/image-generator";
import {
  OVERLAY_PRIMARY_MAX,
  OVERLAY_SECONDARY_MAX,
  sanitizeMarketingOverlayLine,
} from "@/lib/marketing/marketing-on-image-copy";
import { getProductForMarketing } from "@/lib/marketing/product-for-campaign";
import { isAllowedMarketingReferenceImageUrl } from "@/lib/marketing/reference-image-url";
import { BRAND_NAME } from "@/lib/brand";

const shared = {
  campaignGoal: z.enum(["sale", "launch", "awareness", "seasonal", "custom"]),
  tone: z.enum(["professional", "friendly", "festive", "urgent"]),
  language: z.enum(["english", "hindi", "hinglish"]),
  customInstructions: z.string().max(200).optional(),
  includeBanner: z.boolean().optional().default(false),
  bannerAspect: z.enum(["16:9", "9:16", "1:1"]).optional().default("16:9"),
  /** Optional; merged into feed + banner Flux prompts on first generation. */
  imageRefinementPrompt: z.string().max(1200).optional(),
};

const bodySchema = z
  .object({
    kind: z.enum(["product", "event"]).default("product"),
    productId: z.string().uuid().optional(),
    eventTitle: z.string().max(200).optional(),
    eventDescription: z.string().max(8000).optional(),
    eventReferenceImageUrl: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.string().url().max(900).optional(),
    ),
    ...shared,
  })
  .superRefine((data, ctx) => {
    if (data.kind === "product") {
      if (!data.productId) {
        ctx.addIssue({ code: "custom", message: "productId is required for product campaigns", path: ["productId"] });
      }
    } else {
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
    }
  });

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    if (!isAiRouterOrGeminiConfigured()) {
      return jsonError(
        "No AI provider is configured (set GROQ_API_KEY, CEREBRAS_API_KEY, or GEMINI_API_KEY)",
        503,
      );
    }
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const brandName =
      process.env.NEXT_PUBLIC_BUSINESS_NAME?.trim() ||
      process.env.BUSINESS_NAME?.trim() ||
      BRAND_NAME;

    const bannerAspect = parseMarketingBannerAspect(parsed.data.bannerAspect);
    const { width: bw, height: bh } = bannerDimensionsForAspect(bannerAspect);
    const origin = new URL(request.url).origin;
    const refine = parsed.data.imageRefinementPrompt?.trim() || "";

    if (parsed.data.kind === "product") {
      const productId = parsed.data.productId!;
      const product = await getProductForMarketing(productId);
      if (!product) {
        return jsonError("Product not found or inactive", 404);
      }

      const refUrl =
        product.primaryImageUrl && isAllowedMarketingReferenceImageUrl(product.primaryImageUrl)
          ? product.primaryImageUrl
          : null;

      const result = await generateMarketingContent({
        contentKind: "product",
        productName: product.name,
        productDescription: `${product.shortDescription}\n\n${product.description}`.slice(0, 4000),
        campaignGoal: parsed.data.campaignGoal,
        tone: parsed.data.tone,
        language: parsed.data.language,
        customInstructions: parsed.data.customInstructions,
        brandName,
        includeBanner: parsed.data.includeBanner,
        bannerAspect,
        hasProductImage: Boolean(refUrl),
      });

      const feedPrimary = sanitizeMarketingOverlayLine(result.feedImageHeadline ?? "", OVERLAY_PRIMARY_MAX);
      const feedSecondary = sanitizeMarketingOverlayLine(result.feedImageSubline ?? "", OVERLAY_SECONDARY_MAX);

      const imageUrl = buildSignedMarketingImageUrl(
        origin,
        mergeMarketingImagePrompt(result.imagePrompt, refine),
        1080,
        1080,
        {
          referenceImageUrl: refUrl,
          exactOverlayPrimary: feedPrimary,
          exactOverlaySecondary: feedSecondary,
        },
      );

      let bannerImageUrl: string | undefined;
      if (parsed.data.includeBanner && result.bannerImagePrompt) {
        const bHead = sanitizeMarketingOverlayLine(result.bannerImageHeadline ?? "", OVERLAY_PRIMARY_MAX);
        const bSub = sanitizeMarketingOverlayLine(result.bannerImageSubline ?? "", OVERLAY_SECONDARY_MAX);
        bannerImageUrl = buildSignedMarketingImageUrl(
          origin,
          mergeMarketingImagePrompt(result.bannerImagePrompt, refine),
          bw,
          bh,
          {
            referenceImageUrl: refUrl,
            exactOverlayPrimary: bHead ?? feedPrimary,
            exactOverlaySecondary: bSub ?? feedSecondary,
          },
        );
      }

      return jsonOk({
        kind: "product" as const,
        productId: product.id,
        productName: product.name,
        bannerAspect,
        postText: result.postText,
        hashtags: result.hashtags,
        imagePrompt: result.imagePrompt,
        imageUrl,
        feedImageHeadline: result.feedImageHeadline,
        feedImageSubline: result.feedImageSubline,
        bannerImagePrompt: result.bannerImagePrompt,
        bannerImageHeadline: result.bannerImageHeadline,
        bannerImageSubline: result.bannerImageSubline,
        bannerImageUrl,
        whatsappText: result.whatsappText,
      });
    }

    const eventRefRaw = parsed.data.eventReferenceImageUrl?.trim() || null;
    const eventRef =
      eventRefRaw && isAllowedMarketingReferenceImageUrl(eventRefRaw) ? eventRefRaw : null;

    const result = await generateMarketingContent({
      contentKind: "event",
      eventTitle: parsed.data.eventTitle!.trim(),
      eventDescription: parsed.data.eventDescription!.trim(),
      campaignGoal: parsed.data.campaignGoal,
      tone: parsed.data.tone,
      language: parsed.data.language,
      customInstructions: parsed.data.customInstructions,
      brandName,
      includeBanner: parsed.data.includeBanner,
      bannerAspect,
      hasEventReferenceImage: Boolean(eventRef),
    });

    const feedPrimary = sanitizeMarketingOverlayLine(result.feedImageHeadline ?? "", OVERLAY_PRIMARY_MAX);
    const feedSecondary = sanitizeMarketingOverlayLine(result.feedImageSubline ?? "", OVERLAY_SECONDARY_MAX);

    const imageUrl = buildSignedMarketingImageUrl(
      origin,
      mergeMarketingImagePrompt(result.imagePrompt, refine),
      1080,
      1080,
      {
        referenceImageUrl: eventRef,
        exactOverlayPrimary: feedPrimary,
        exactOverlaySecondary: feedSecondary,
      },
    );

    let bannerImageUrl: string | undefined;
    if (parsed.data.includeBanner && result.bannerImagePrompt) {
      const bHead = sanitizeMarketingOverlayLine(result.bannerImageHeadline ?? "", OVERLAY_PRIMARY_MAX);
      const bSub = sanitizeMarketingOverlayLine(result.bannerImageSubline ?? "", OVERLAY_SECONDARY_MAX);
      bannerImageUrl = buildSignedMarketingImageUrl(
        origin,
        mergeMarketingImagePrompt(result.bannerImagePrompt, refine),
        bw,
        bh,
        {
          referenceImageUrl: eventRef,
          exactOverlayPrimary: bHead ?? feedPrimary,
          exactOverlaySecondary: bSub ?? feedSecondary,
        },
      );
    }

    return jsonOk({
      kind: "event" as const,
      eventTitle: parsed.data.eventTitle!.trim(),
      eventDescription: parsed.data.eventDescription!.trim(),
      eventReferenceImageUrl: eventRef,
      bannerAspect,
      postText: result.postText,
      hashtags: result.hashtags,
      imagePrompt: result.imagePrompt,
      imageUrl,
      feedImageHeadline: result.feedImageHeadline,
      feedImageSubline: result.feedImageSubline,
      bannerImagePrompt: result.bannerImagePrompt,
      bannerImageHeadline: result.bannerImageHeadline,
      bannerImageSubline: result.bannerImageSubline,
      bannerImageUrl,
      whatsappText: result.whatsappText,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    if (isAiRouterExhausted(e) || (e instanceof Error && e.message === AI_ROUTER_ALL_PROVIDERS_EXHAUSTED)) {
      return jsonError("AI service temporarily unavailable. Please try again in a minute.", 503);
    }
    if (e instanceof Error && e.message === "CONTENT_GENERATION_FAILED") {
      return jsonError("Could not parse AI response. Please try again.", 502);
    }
    console.error("[POST /api/admin/marketing/generate]", e);
    return jsonError(e instanceof Error ? e.message : "Generation failed", 500);
  }
}
