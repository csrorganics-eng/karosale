import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import {
  getSiteHomepageBannerRow,
  patchSiteHomepageBanner,
} from "@/lib/db/queries/site-homepage-banner";
import { parseMarketingBannerAspect } from "@/lib/marketing/banner-aspect";
import { normalizeMarketingStoredImageUrl } from "@/lib/marketing/marketing-stored-image-url";

const optionalLink = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? v.trim() : v),
  z
    .string()
    .max(2000)
    .nullable()
    .refine(
      (s) =>
        s == null ||
        /^https:\/\//i.test(s) ||
        (s.startsWith("/") && !s.startsWith("//")),
      { message: "linkHref must be https URL or site-relative path starting with /" },
    ),
);

const optionalText = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? v.trim() : v),
  z.string().max(500).nullable(),
);

const patchSchema = z.object({
  imageUrl: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.string().max(16000).nullable(),
    )
    .optional(),
  linkHref: optionalLink.optional(),
  headline: optionalText.optional(),
  subheadline: optionalText.optional(),
  isEnabled: z.boolean().optional(),
  bannerAspect: z.enum(["16:9", "9:16", "1:1"]).optional(),
});

function normalizeStoredImageUrl(url: string | null | undefined): string | null {
  return normalizeMarketingStoredImageUrl(url);
}

export async function GET() {
  try {
    await requireRole(["admin"]);
    const row = await getSiteHomepageBannerRow();
    if (!row) return jsonOk({ banner: null });
    return jsonOk({
      banner: {
        imageUrl: row.imageUrl,
        linkHref: row.linkHref,
        headline: row.headline,
        subheadline: row.subheadline,
        isEnabled: row.isEnabled,
        bannerAspect: parseMarketingBannerAspect(row.bannerAspect),
        updatedAt: row.updatedAt?.toISOString?.() ?? null,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    const pg = e as { code?: string; message?: string };
    if (pg?.code === "42P01" || (typeof pg?.message === "string" && pg.message.includes("site_homepage_banner"))) {
      return jsonError(
        "Homepage banner table is missing. Run database migrations (e.g. npm run db:migrate) so 0010_site_homepage_banner.sql is applied.",
        503,
      );
    }
    console.error("[GET /api/admin/marketing/homepage-banner]", e);
    return jsonError("Failed to load homepage banner", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const rowBefore = await getSiteHomepageBannerRow();
    const nextEnabled =
      parsed.data.isEnabled !== undefined ? parsed.data.isEnabled : rowBefore?.isEnabled ?? false;

    let imageUrl: string | null | undefined;
    if (parsed.data.imageUrl !== undefined) {
      imageUrl = normalizeStoredImageUrl(parsed.data.imageUrl);
      if (parsed.data.imageUrl !== null && parsed.data.imageUrl !== "" && imageUrl === null) {
        return jsonError(
          "imageUrl must be https, or http://localhost / http://127.0.0.1 for signed preview URLs in local dev",
          400,
        );
      }
    }

    if (nextEnabled) {
      const effectiveImage =
        imageUrl !== undefined ? imageUrl : normalizeStoredImageUrl(rowBefore?.imageUrl ?? null);
      if (!effectiveImage) {
        return jsonError(
          "Cannot enable homepage banner without a valid image URL (https in production, or signed http://localhost URL in local dev).",
          400,
        );
      }
    }

    await patchSiteHomepageBanner(session.user.id, {
      ...(parsed.data.imageUrl !== undefined ? { imageUrl } : {}),
      ...(parsed.data.linkHref !== undefined ? { linkHref: parsed.data.linkHref } : {}),
      ...(parsed.data.headline !== undefined ? { headline: parsed.data.headline } : {}),
      ...(parsed.data.subheadline !== undefined ? { subheadline: parsed.data.subheadline } : {}),
      ...(parsed.data.isEnabled !== undefined ? { isEnabled: parsed.data.isEnabled } : {}),
      ...(parsed.data.bannerAspect !== undefined ? { bannerAspect: parsed.data.bannerAspect } : {}),
    });

    const row = await getSiteHomepageBannerRow();
    return jsonOk({
      banner: row
        ? {
            imageUrl: row.imageUrl,
            linkHref: row.linkHref,
            headline: row.headline,
            subheadline: row.subheadline,
            isEnabled: row.isEnabled,
            bannerAspect: parseMarketingBannerAspect(row.bannerAspect),
            updatedAt: row.updatedAt?.toISOString?.() ?? null,
          }
        : null,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    const pg = e as { code?: string; message?: string };
    if (pg?.code === "42P01" || (typeof pg?.message === "string" && pg.message.includes("site_homepage_banner"))) {
      return jsonError(
        "Homepage banner table is missing. Run database migrations (e.g. npm run db:migrate) so 0010_site_homepage_banner.sql is applied.",
        503,
      );
    }
    console.error("[PATCH /api/admin/marketing/homepage-banner]", e);
    return jsonError(e instanceof Error ? e.message : "Failed to update homepage banner", 500);
  }
}
