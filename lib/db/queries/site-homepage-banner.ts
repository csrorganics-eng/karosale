import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteHomepageBanner } from "@/lib/db/schema";
import { isPublishableMarketingImageUrl } from "@/lib/marketing/marketing-stored-image-url";

const SINGLETON = "default" as const;

export type SiteHomepageBannerPublic = {
  imageUrl: string;
  linkHref: string | null;
  headline: string | null;
  subheadline: string | null;
};

export async function getSiteHomepageBannerRow() {
  const [row] = await db
    .select()
    .from(siteHomepageBanner)
    .where(eq(siteHomepageBanner.singleton, SINGLETON))
    .limit(1);
  return row ?? null;
}

/** Data for the storefront when the strip is active and has an image. */
export async function getPublishedHomepageBanner(): Promise<SiteHomepageBannerPublic | null> {
  const row = await getSiteHomepageBannerRow();
  const url = row?.imageUrl?.trim();
  if (!row?.isEnabled || !url || !isPublishableMarketingImageUrl(url)) return null;
  return {
    imageUrl: url,
    linkHref: row.linkHref?.trim() || null,
    headline: row.headline?.trim() || null,
    subheadline: row.subheadline?.trim() || null,
  };
}

export async function patchSiteHomepageBanner(
  adminUserId: string,
  patch: Partial<{
    imageUrl: string | null;
    linkHref: string | null;
    headline: string | null;
    subheadline: string | null;
    isEnabled: boolean;
  }>,
) {
  const existing = await getSiteHomepageBannerRow();
  const imageUrl = patch.imageUrl !== undefined ? patch.imageUrl : existing?.imageUrl ?? null;
  const linkHref = patch.linkHref !== undefined ? patch.linkHref : existing?.linkHref ?? null;
  const headline = patch.headline !== undefined ? patch.headline : existing?.headline ?? null;
  const subheadline = patch.subheadline !== undefined ? patch.subheadline : existing?.subheadline ?? null;
  const isEnabled = patch.isEnabled !== undefined ? patch.isEnabled : existing?.isEnabled ?? false;
  const now = new Date();

  await db
    .insert(siteHomepageBanner)
    .values({
      singleton: SINGLETON,
      imageUrl,
      linkHref,
      headline,
      subheadline,
      isEnabled,
      updatedAt: now,
      updatedBy: adminUserId,
    })
    .onConflictDoUpdate({
      target: siteHomepageBanner.singleton,
      set: {
        imageUrl,
        linkHref,
        headline,
        subheadline,
        isEnabled,
        updatedAt: now,
        updatedBy: adminUserId,
      },
    });
}
