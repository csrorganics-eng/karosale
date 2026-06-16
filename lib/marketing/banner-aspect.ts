/** Stored on campaigns and sent with generate / image-url flows. */
export type MarketingBannerAspect = "16:9" | "9:16" | "1:1";

export const BANNER_ASPECT_OPTIONS: { value: MarketingBannerAspect; label: string }[] = [
  { value: "16:9", label: "16:9 (landscape)" },
  { value: "9:16", label: "9:16 (vertical / Stories)" },
  { value: "1:1", label: "1:1 / 4×4 (square)" },
];

export function parseMarketingBannerAspect(raw: string | null | undefined): MarketingBannerAspect {
  if (raw === "9:16" || raw === "1:1" || raw === "16:9") return raw;
  return "16:9";
}

/** Pixel size for Pollinations `size` (may fall back to 1024×1024 in image generator). */
export function bannerDimensionsForAspect(aspect: MarketingBannerAspect): { width: number; height: number } {
  switch (aspect) {
    case "16:9":
      return { width: 1200, height: 675 };
    case "9:16":
      return { width: 1080, height: 1920 };
    case "1:1":
      return { width: 1080, height: 1080 };
    default:
      return { width: 1200, height: 675 };
  }
}

/** Tailwind aspect-* classes for preview frames. */
export function bannerPreviewAspectClass(aspect: MarketingBannerAspect): string {
  switch (aspect) {
    case "16:9":
      return "aspect-video";
    case "9:16":
      return "aspect-[9/16]";
    case "1:1":
      return "aspect-square";
    default:
      return "aspect-video";
  }
}

const LANDSCAPE_MAX_FRAME_REM = 22;

/**
 * Frame for the published homepage hero (and admin “matches storefront” preview).
 * Caps height indirectly via max-width so aspect-ratio is never violated (avoids
 * `max-h` + `aspect-*` fighting and cropping like a 21:9 box on 16:9 art).
 */
export function homepageBannerStorefrontImageShellClass(aspect: MarketingBannerAspect): string {
  const cap = `${LANDSCAPE_MAX_FRAME_REM}rem`;
  switch (aspect) {
    case "16:9":
      return [
        "relative isolate w-full overflow-hidden bg-muted",
        "aspect-video",
        `max-w-[min(100%,calc(${cap}*16/9))]`,
        "mx-auto",
      ].join(" ");
    case "1:1":
      return [
        "relative isolate w-full overflow-hidden bg-muted",
        "aspect-square",
        `max-w-[min(100%,${cap})]`,
        "mx-auto",
      ].join(" ");
    case "9:16":
      return [
        "relative isolate mx-auto overflow-hidden bg-muted",
        "aspect-[9/16]",
        "h-[min(78vh,40rem)] w-auto",
      ].join(" ");
    default:
      return homepageBannerStorefrontImageShellClass("16:9");
  }
}

export function bannerAspectInstructionForAi(aspect: MarketingBannerAspect): string {
  switch (aspect) {
    case "16:9":
      return "wide landscape ~16:9, hero composition, space for headline feel";
    case "9:16":
      return "tall vertical ~9:16 (phone story / Reels style), strong focal point top-to-bottom";
    case "1:1":
      return "square 1:1 balanced composition, centered focal subject";
    default:
      return "wide landscape ~16:9";
  }
}
