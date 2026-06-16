import { verifySignedMarketingImageRequest, fetchGenPollinationsImage } from "@/lib/marketing/image-generator";

/** Flux can exceed default Vercel / platform limits — allow time for Pollinations round-trip. */
export const maxDuration = 120;

function sniffImageContentType(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 4 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    return "image/webp";
  }
  return "image/jpeg";
}

/**
 * HMAC-signed, time-limited image proxy for Marketing (Flux via Pollinations).
 * No login — Meta/Instagram and `<img src>` use this URL; abuse is limited by signature + expiry.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const verified = verifySignedMarketingImageRequest(url.searchParams);
  if (!verified) {
    return new Response("Invalid or expired image link", { status: 403 });
  }
  try {
    const buf = await fetchGenPollinationsImage(verified.prep, verified.w, verified.h, verified.seed, {
      referenceImageUrl: verified.referenceImageUrl,
    });
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": sniffImageContentType(buf),
        "Cache-Control": "public, max-age=3600",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (e) {
    console.error("[GET /api/marketing/public-image]", e);
    return new Response("Image generation failed", { status: 502 });
  }
}
