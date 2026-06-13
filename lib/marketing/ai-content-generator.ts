import {
  AI_ROUTER_ALL_PROVIDERS_EXHAUSTED,
  isAiRouterExhausted,
  parseJsonFromAssistantText,
  routerChatCompletion,
} from "@/lib/ai-router";
import type { AiMessage } from "@/lib/ai-router";
import { BRAND_NAME } from "@/lib/brand";
import type { MarketingBannerAspect } from "@/lib/marketing/banner-aspect";
import { bannerAspectInstructionForAi } from "@/lib/marketing/banner-aspect";

export interface MarketingContentRequest {
  /** `product` (default) = SKU campaign; `event` = announcement without a catalog product. */
  contentKind?: "product" | "event";
  productName?: string;
  productDescription?: string;
  eventTitle?: string;
  eventDescription?: string;
  campaignGoal: "sale" | "launch" | "awareness" | "seasonal" | "custom";
  tone: "professional" | "friendly" | "festive" | "urgent";
  language: "english" | "hindi" | "hinglish";
  brandName: string;
  customInstructions?: string;
  /** When true, JSON must include bannerImagePrompt sized for `bannerAspect`. */
  includeBanner?: boolean;
  /** Target banner shape when includeBanner is true. */
  bannerAspect?: MarketingBannerAspect;
  /** Informs copy/image prompts that a catalog product photo will be used as the visual base. */
  hasProductImage?: boolean;
  /** Optional uploaded HTTPS image for event campaigns (Flux reference). */
  hasEventReferenceImage?: boolean;
}

export interface MarketingContentResult {
  postText: string;
  hashtags: string[];
  imagePrompt: string;
  /** Wide landscape marketing banner; only when includeBanner was requested. */
  bannerImagePrompt?: string;
  whatsappText: string;
  /** Short approved lines for on-image typography (feed). */
  feedImageHeadline?: string;
  feedImageSubline?: string;
  /** Short approved lines for on-image typography (banner). */
  bannerImageHeadline?: string;
  bannerImageSubline?: string;
}

function brandFromEnv(): string {
  return (
    process.env.NEXT_PUBLIC_BUSINESS_NAME?.trim() ||
    process.env.BUSINESS_NAME?.trim() ||
    BRAND_NAME
  );
}

function buildUserMessage(req: MarketingContentRequest): string {
  const kind = req.contentKind ?? "product";
  const extra = req.customInstructions?.trim()
    ? `Extra instructions: ${req.customInstructions.trim()}`
    : "";

  if (kind === "event") {
    const title = req.eventTitle?.trim() || "Announcement";
    const desc = req.eventDescription?.trim() || "";
    const visual = req.hasEventReferenceImage
      ? "An optional reference photo (flyer, venue, product flatlay, etc.) may be used for AI image generation — imagePrompt should describe how to build on that reference (coherent lighting, readable key elements, premium organic brand scene)."
      : "No reference photo — imagePrompt should fully describe a striking announcement visual (Indian organic brand context, tasteful, no illegible tiny text).";
    return [
      "Create marketing content for an EVENT / ANNOUNCEMENT (not a single catalog SKU):",
      `Brand: ${req.brandName}`,
      `Event title: ${title}`,
      desc ? `Event details:\n${desc}` : "",
      `Goal: ${req.campaignGoal}`,
      `Tone: ${req.tone}`,
      `Language: ${req.language}`,
      visual,
      extra,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const product = req.productName?.trim() || "our organic products range";
  const visual = req.hasProductImage
    ? "A real product packshot photo from the catalog will be used as the REFERENCE image for AI image generation — prompts must describe how to compose around that product (keep label readable, natural lighting, premium marketing scene)."
    : "No reference product photo is available — imagePrompt should describe a full scene including the product look.";
  return [
    "Create marketing content for:",
    `Brand: ${req.brandName}`,
    `Product: ${product}`,
    req.productDescription?.trim() ? `Description: ${req.productDescription.trim()}` : "",
    `Goal: ${req.campaignGoal}`,
    `Tone: ${req.tone}`,
    `Language: ${req.language}`,
    visual,
    extra,
  ]
    .filter(Boolean)
    .join("\n");
}

function readOverlayField(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function parseResult(raw: unknown, includeBanner: boolean): MarketingContentResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const postText = typeof o.postText === "string" ? o.postText : null;
  const imagePrompt = typeof o.imagePrompt === "string" ? o.imagePrompt : null;
  const whatsappText = typeof o.whatsappText === "string" ? o.whatsappText : null;
  const tags = o.hashtags;
  let hashtags: string[] = [];
  if (Array.isArray(tags)) {
    hashtags = tags.filter((t): t is string => typeof t === "string");
  }
  if (!postText || !imagePrompt || !whatsappText) return null;
  const bannerImagePrompt =
    typeof o.bannerImagePrompt === "string" && o.bannerImagePrompt.trim() ? o.bannerImagePrompt.trim() : undefined;
  if (includeBanner && !bannerImagePrompt) return null;
  return {
    postText,
    hashtags,
    imagePrompt,
    bannerImagePrompt,
    whatsappText,
    feedImageHeadline: readOverlayField(o.feedImageHeadline),
    feedImageSubline: readOverlayField(o.feedImageSubline),
    bannerImageHeadline: readOverlayField(o.bannerImageHeadline),
    bannerImageSubline: readOverlayField(o.bannerImageSubline),
  };
}

async function runCompletion(
  messages: AiMessage[],
  includeBanner: boolean,
): Promise<MarketingContentResult> {
  const { content } = await routerChatCompletion(messages, undefined, { maxTokens: 2048 });
  if (!content) throw new Error("CONTENT_GENERATION_FAILED");
  let parsed: unknown;
  try {
    parsed = parseJsonFromAssistantText(content);
  } catch {
    throw new Error("CONTENT_GENERATION_FAILED");
  }
  const result = parseResult(parsed, includeBanner);
  if (!result) throw new Error("CONTENT_GENERATION_FAILED");
  return result;
}

export async function generateMarketingContent(
  req: MarketingContentRequest,
): Promise<MarketingContentResult> {
  const brandName = req.brandName || brandFromEnv();
  const includeBanner = Boolean(req.includeBanner);
  const contentKind = req.contentKind ?? "product";
  const bannerAspect = req.bannerAspect ?? "16:9";
  const bannerShapeHint = bannerAspectInstructionForAi(bannerAspect);
  const bannerField = includeBanner
    ? ', "bannerImagePrompt": string, "bannerImageHeadline": string, "bannerImageSubline": string'
    : "";

  const overlayFields = ', "feedImageHeadline": string, "feedImageSubline": string';

  const imageRules =
    contentKind === "event"
      ? `- imagePrompt: detailed Flux prompt for a square (1:1) Instagram-style feed image for the event. Demand luxury editorial quality: soft diffused light, refined palette, tasteful props, cinematic depth. Leave comfortable negative space for a clean text panel. If a reference image exists, echo its mood and palette without copying illegible small print.
- feedImageHeadline: 2–7 words, high-impact hook aligned with the event (Latin / English strongly preferred for crisp on-image type). This exact spelling will be used as the primary line in a premium minimalist text panel on the feed image — no hashtags.
- feedImageSubline: optional 3–12 words (benefit, date window, or location); use empty string if not needed. Same spelling discipline.`
      : `- imagePrompt: detailed Flux prompt for a square (1:1) Instagram-style feed image. Preserve the real product identity from any reference packshot (shape, colors, label legibility). Demand refined editorial / premium D2C quality: soft key light, gentle shadows, elegant negative space, magazine-grade composition. Leave comfortable negative space for a clean text panel.
- feedImageHeadline: 2–7 words, product-led hook aligned with the campaign (Latin / English strongly preferred for crisp on-image type). This exact spelling will be used as the primary line in a premium minimalist text panel on the feed image — no hashtags.
- feedImageSubline: optional 3–12 words (offer, proof point, or shipping angle); use empty string if not needed. Same spelling discipline.`;

  const bannerRule = includeBanner
    ? `- bannerImagePrompt: separate Flux prompt for a marketing banner with this composition: ${bannerShapeHint}. Match the campaign theme and feed image mood. Same quality bar: sophisticated commercial art direction, soft sophisticated lighting, cohesive palette, generous breathing room. Leave space for a clean text panel.
- bannerImageHeadline: 2–7 words, banner-sized hook (can echo feedImageHeadline with a twist); Latin / English preferred for legibility; no hashtags.
- bannerImageSubline: optional 3–12 words; empty string if not needed.`
    : "";

  const system = `You are an expert digital marketing copywriter for an organic products brand in India.
You ALWAYS respond with ONLY valid JSON, no markdown, no explanation.
JSON schema: { "postText": string, "hashtags": string[], "imagePrompt": string${bannerField}${overlayFields}, "whatsappText": string }

Rules:
- postText: engaging social media post, 2-4 sentences, include emojis naturally
- hashtags: 5-10 relevant hashtags without # prefix (add # in postText)
${imageRules}
${bannerRule}
- whatsappText: conversational shorter version, ends with a question or CTA, no hashtags`;

  const user = buildUserMessage({ ...req, brandName });
  const messages: AiMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  try {
    return await runCompletion(messages, includeBanner);
  } catch (e) {
    if (isAiRouterExhausted(e) || (e instanceof Error && e.message === AI_ROUTER_ALL_PROVIDERS_EXHAUSTED)) {
      throw e;
    }
    if (e instanceof Error && e.message === "CONTENT_GENERATION_FAILED") {
      return await runCompletion(messages, includeBanner);
    }
    throw e;
  }
}
