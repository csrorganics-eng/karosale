import { createHmac, timingSafeEqual } from "node:crypto";
import { isAllowedMarketingReferenceImageUrl } from "@/lib/marketing/reference-image-url";

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  aspectRatio?: "square" | "portrait" | "landscape";
  /** Required for marketing preview URLs (HMAC-signed proxy on this origin). */
  signedImageOrigin?: string;
}

export interface GeneratedImage {
  url: string;
  downloadUrl: string;
  prompt: string;
}

/**
 * Max length for the *final* prompt string sent to Pollinations (after `enhancePromptForOrganic`).
 */
export const MAX_POLLINATIONS_PROMPT_CHARS = 1400;

const FALLBACK_IMAGE_PROMPT =
  "organic natural products, refined editorial hero still, soft diffused daylight, premium Indian wellness aesthetic, magazine cover quality";

/** Merged into prepared prompts for every marketing image to steer Flux away from garbled text. */
const POLLINATIONS_TYPOGRAPHY_GUARD =
  ", photoreal scene only: no fake headlines, coupons, watermarks, hashtags, or random words in the image; do not render slogans or lettering unless it is authentic packaging from the reference photo reproduced faithfully; avoid invented typography entirely when possible";

const POLLINATIONS_QUALITY_SUFFIX =
  ", ultra high detail, soft sophisticated lighting, refined color grading, gentle contrast, tasteful negative space, calm premium commercial look, shallow depth of field where appropriate";

/**
 * Merge base Flux prompt with optional user refinement (Step 2 “improve image” notes).
 * If the user asks for “text on the image”, nudge toward visual-only execution so it does not
 * fight our typography guard or trip provider filters.
 */
export function mergeMarketingImagePrompt(base: string, refinement?: string | null): string {
  const b = (base || "").trim();
  let r = (refinement || "").trim();
  if (!r) return b;
  if (!b) return r;
  const lower = r.toLowerCase();
  const asksForReadableCopy =
    /\b(text|words?|wording|lettering|typography|headline|headlines|slogan|caption|copywriting|spelling)\b/i.test(
      r,
    ) && /\b(on the|in the|into the|overlay|banner|image|photo|picture|creative)\b/i.test(lower);
  if (asksForReadableCopy) {
    r = `${r}. Execute this as pure visual hierarchy only (color blocks, focal layout, premium negative space) — do not paint readable letters, fake signage, or misspelled words in the frame.`;
  }
  return `${b}. Additional creative direction: ${r}`;
}

const GEN_IMAGE_GENERATIONS = "https://gen.pollinations.ai/v1/images/generations";

/** Legacy signed URLs (no reference image). */
const SIGN_V1 = "1";
/** Current: includes optional reference image URL in HMAC payload. */
const SIGN_V2 = "2";
const DEFAULT_SIGNED_IMAGE_TTL_SEC = 72 * 60 * 60;

export type BuildSignedMarketingImageUrlOptions = {
  seed?: number;
  ttlSeconds?: number;
  /** HTTPS product / asset URL; must pass `isAllowedMarketingReferenceImageUrl`. */
  referenceImageUrl?: string | null;
};

/** djb2 hash → positive 32-bit int for deterministic Pollinations seed */
export function djb2HashToSeed(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)!;
  }
  return Math.abs(hash >>> 0);
}

export function enhancePromptForOrganic(prompt: string): string {
  const t = prompt.trim();
  const lower = t.toLowerCase();
  if (lower.includes("photography") || lower.includes("professional") || lower.includes("editorial")) {
    return t;
  }
  return `${t}, refined editorial photography, soft natural light, clean premium composition, subtle color harmony, high-end commercial still`;
}

/**
 * Shorten a prompt for Pollinations requests without mid-word cuts when possible.
 */
export function clampImagePromptForPollinations(text: string, maxChars: number): string {
  const t = text.trim();
  if (!t) return FALLBACK_IMAGE_PROMPT.slice(0, maxChars);
  if (t.length <= maxChars) return t;

  let cut = t.slice(0, maxChars);
  const lastComma = cut.lastIndexOf(",");
  const lastSpace = cut.lastIndexOf(" ");
  const boundary = Math.max(lastComma, lastSpace);
  if (boundary >= Math.floor(maxChars * 0.55)) {
    cut = cut.slice(0, boundary);
  }
  return cut.trimEnd();
}

function clampForEncodedUrlLength(decoded: string, maxEncodedLen: number): string {
  let s = decoded;
  while (s.length > 40 && encodeURIComponent(s).length > maxEncodedLen) {
    s = s.slice(0, Math.floor(s.length * 0.88)).trimEnd();
    const sp = s.lastIndexOf(" ");
    if (sp > 40) s = s.slice(0, sp);
  }
  return s || FALLBACK_IMAGE_PROMPT.slice(0, 120);
}

/** Trim/fallback → organic suffix → quality & typography guards → length clamps for Pollinations. */
export function preparePollinationsImagePrompt(prompt: string): string {
  const raw = (prompt || "").trim() || FALLBACK_IMAGE_PROMPT;
  let enhanced = enhancePromptForOrganic(raw);
  enhanced = `${enhanced}${POLLINATIONS_QUALITY_SUFFIX}${POLLINATIONS_TYPOGRAPHY_GUARD}`;
  enhanced = clampImagePromptForPollinations(enhanced, MAX_POLLINATIONS_PROMPT_CHARS);
  enhanced = clampForEncodedUrlLength(enhanced, 6500);
  return enhanced;
}

/** Strip BOM / whitespace — .env values can accidentally include a UTF-8 BOM. */
function envSecret(raw: string | undefined): string {
  return (raw ?? "").replace(/^\uFEFF/, "").trim();
}

function imageSigningSecret(): string {
  const s = envSecret(process.env.AUTH_SECRET) || envSecret(process.env.NEXTAUTH_SECRET);
  if (!s) {
    throw new Error(
      "AUTH_SECRET or NEXTAUTH_SECRET is required to sign marketing image URLs (same secret as Auth.js).",
    );
  }
  return s;
}

function signImagePayloadV1(exp: number, prepPrompt: string, w: number, h: number, seed: number): string {
  const payload = `${SIGN_V1}|${exp}|${w}|${h}|${seed}|${prepPrompt}`;
  return createHmac("sha256", imageSigningSecret()).update(payload).digest("base64url");
}

function signImagePayloadV2(
  exp: number,
  prepPrompt: string,
  w: number,
  h: number,
  seed: number,
  refUrl: string,
): string {
  const payload = `${SIGN_V2}|${exp}|${w}|${h}|${seed}|${prepPrompt}|${refUrl}`;
  return createHmac("sha256", imageSigningSecret()).update(payload).digest("base64url");
}

function normalizeRefForSigning(ref: string | null | undefined): string {
  const r = (ref ?? "").trim();
  if (!r) return "";
  if (!isAllowedMarketingReferenceImageUrl(r)) {
    throw new Error("REFERENCE_IMAGE_URL_NOT_ALLOWED");
  }
  return r;
}

/**
 * Time-limited, HMAC-signed URL to `/api/marketing/public-image` — uses only `POLLINATIONS_API_KEY`
 * on the server (no deprecated publishable `pk_` keys in the browser).
 */
export function buildSignedMarketingImageUrl(
  origin: string,
  prompt: string,
  width: number,
  height: number,
  options?: BuildSignedMarketingImageUrlOptions,
): string {
  const prep = preparePollinationsImagePrompt(prompt);
  const seed = options?.seed ?? djb2HashToSeed(prep);
  const exp = Math.floor(Date.now() / 1000) + (options?.ttlSeconds ?? DEFAULT_SIGNED_IMAGE_TTL_SEC);
  const refNorm = options?.referenceImageUrl ? normalizeRefForSigning(options.referenceImageUrl) : "";
  const sig = signImagePayloadV2(exp, prep, width, height, seed, refNorm);
  const base = origin.replace(/\/$/, "");
  const qs = new URLSearchParams({
    v: SIGN_V2,
    e: String(exp),
    p: prep,
    w: String(width),
    h: String(height),
    s: String(seed),
    sig,
  });
  if (refNorm) qs.set("ref", refNorm);
  return `${base}/api/marketing/public-image?${qs.toString()}`;
}

export function verifySignedMarketingImageRequest(
  sp: URLSearchParams,
): { prep: string; w: number; h: number; seed: number; referenceImageUrl: string | null } | null {
  const v = sp.get("v");
  const exp = Number.parseInt(sp.get("e") || "0", 10);
  const prep = sp.get("p") || "";
  const w = Number.parseInt(sp.get("w") || "0", 10);
  const h = Number.parseInt(sp.get("h") || "0", 10);
  const seed = Number.parseInt(sp.get("s") || "0", 10);
  const sig = sp.get("sig") || "";
  const ref = (sp.get("ref") || "").trim();

  if (!prep || !w || !h || !Number.isFinite(exp) || !Number.isFinite(seed)) {
    return null;
  }
  if (exp < Math.floor(Date.now() / 1000)) return null;

  if (v === SIGN_V2) {
    if (ref && !isAllowedMarketingReferenceImageUrl(ref)) return null;
    const expected = signImagePayloadV2(exp, prep, w, h, seed, ref);
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { prep, w, h, seed, referenceImageUrl: ref || null };
  }

  if (v === SIGN_V1) {
    if (ref) return null;
    const expected = signImagePayloadV1(exp, prep, w, h, seed);
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { prep, w, h, seed, referenceImageUrl: null };
  }

  return null;
}

type PollinationsImageGenJson = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
  message?: string;
};

export type FetchGenPollinationsImageOptions = {
  referenceImageUrl?: string | null;
};

/**
 * Flux image via OpenAI-compatible POST. Optional `referenceImageUrl` for image-guided generation
 * (Pollinations `image` extension — URL array).
 */
export async function fetchGenPollinationsImage(
  preparedPrompt: string,
  width: number,
  height: number,
  seed: number,
  opts?: FetchGenPollinationsImageOptions,
): Promise<Buffer> {
  const sk = envSecret(process.env.POLLINATIONS_API_KEY);
  if (!sk) {
    throw new Error("POLLINATIONS_API_KEY is not configured");
  }
  const ref = opts?.referenceImageUrl?.trim() || "";
  const refOk = ref && isAllowedMarketingReferenceImageUrl(ref) ? ref : "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "CSROrganics-MarketingBot/1.0",
    Authorization: `Bearer ${sk}`,
  };

  async function post(size: string, withImage: boolean): Promise<{ res: Response; text: string }> {
    const body: Record<string, unknown> = {
      model: "flux",
      prompt: preparedPrompt,
      n: 1,
      size,
      response_format: "b64_json",
      seed,
    };
    if (withImage && refOk) {
      body.image = [refOk];
    }
    const res = await fetch(GEN_IMAGE_GENERATIONS, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      redirect: "follow",
    });
    const text = await res.text();
    return { res, text };
  }

  async function runOnce(withImage: boolean): Promise<Buffer> {
    const requested = `${width}x${height}`;
    let { res, text } = await post(requested, withImage);

    // Pollinations / Flux often rejects or bills oddly on arbitrary sizes (e.g. 1200×675, 1080×1920).
    // Retry the OpenAI-compatible default many providers accept.
    if (!res.ok && requested !== "1024x1024") {
      console.warn(
        "[fetchGenPollinationsImage] primary size failed",
        requested,
        res.status,
        "- retrying 1024x1024",
      );
      const retry = await post("1024x1024", withImage);
      res = retry.res;
      text = retry.text;
    }

    if (!res.ok) {
      let detail = text.slice(0, 400);
      try {
        const j = JSON.parse(text) as PollinationsImageGenJson;
        detail = j.error?.message ?? j.message ?? detail;
      } catch {
        /* keep slice */
      }
      console.error("[fetchGenPollinationsImage]", res.status, detail);
      throw new Error(`GEN_IMAGE_FAILED:${res.status}`);
    }

    let json: PollinationsImageGenJson & { success?: boolean };
    try {
      json = JSON.parse(text) as PollinationsImageGenJson & { success?: boolean };
    } catch {
      throw new Error("GEN_IMAGE_FAILED:invalid_json");
    }
    if (json.success === false) {
      const detail = json.error?.message ?? json.message ?? "unknown_error";
      console.error("[fetchGenPollinationsImage]", detail);
      throw new Error("GEN_IMAGE_FAILED:api_success_false");
    }

    const b64 = json.data?.[0]?.b64_json;
    if (b64) {
      return Buffer.from(b64, "base64");
    }
    const imageUrl = json.data?.[0]?.url;
    if (imageUrl) {
      const r2 = await fetch(imageUrl, { headers: { "User-Agent": headers["User-Agent"]! } });
      if (!r2.ok) throw new Error(`GEN_IMAGE_FAILED:url_fetch:${r2.status}`);
      return Buffer.from(await r2.arrayBuffer());
    }
    throw new Error("GEN_IMAGE_FAILED:no_image_data");
  }

  if (refOk) {
    try {
      return await runOnce(true);
    } catch (e) {
      console.warn("[fetchGenPollinationsImage] reference image request failed, retrying text-only:", e);
      return runOnce(false);
    }
  }
  return runOnce(false);
}

function dimensionsFromAspect(
  aspect: ImageGenerationOptions["aspectRatio"],
  width: number,
  height: number,
): { w: number; h: number } {
  if (aspect === "portrait") return { w: 1080, h: 1350 };
  if (aspect === "landscape") return { w: 1200, h: 630 };
  return { w: width, h: height };
}

export async function generateMarketingImage(
  options: ImageGenerationOptions,
): Promise<GeneratedImage> {
  let width = options.width ?? 1080;
  let height = options.height ?? 1080;
  if (options.aspectRatio) {
    const d = dimensionsFromAspect(options.aspectRatio, width, height);
    width = d.w;
    height = d.h;
  }
  const enhanced = preparePollinationsImagePrompt(options.prompt);
  const origin = options.signedImageOrigin?.trim();
  if (!origin) {
    throw new Error(
      "generateMarketingImage requires signedImageOrigin (your app origin, e.g. from the incoming request URL).",
    );
  }
  const url = buildSignedMarketingImageUrl(origin, options.prompt, width, height);
  return {
    url,
    downloadUrl: url,
    prompt: enhanced,
  };
}

/**
 * Download image bytes (Facebook photo upload, etc.).
 * - Our signed `/api/marketing/public-image` URLs: plain fetch (signature authenticates).
 * - Direct `gen.pollinations.ai` URLs: Bearer `POLLINATIONS_API_KEY` when set.
 */
export async function fetchImageAsBuffer(url: string): Promise<Buffer> {
  const headers: Record<string, string> = { "User-Agent": "CSROrganics-MarketingBot/1.0" };
  const lower = url.toLowerCase();
  if (lower.includes("/api/marketing/public-image")) {
    const res = await fetch(url, { headers, redirect: "follow" });
    if (!res.ok) throw new Error(`IMAGE_DOWNLOAD_FAILED:${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (lower.includes("gen.pollinations.ai")) {
    const sk = envSecret(process.env.POLLINATIONS_API_KEY);
    if (sk) headers.Authorization = `Bearer ${sk}`;
  }
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) {
    throw new Error(`IMAGE_DOWNLOAD_FAILED:${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
