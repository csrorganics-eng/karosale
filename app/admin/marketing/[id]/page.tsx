import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { CampaignDetailClient } from "@/components/admin/marketing/campaign-detail-client";
import { getCampaignApiBundle } from "@/lib/marketing/campaign-queries";
import { getProductForMarketing } from "@/lib/marketing/product-for-campaign";
import { isAllowedMarketingReferenceImageUrl } from "@/lib/marketing/reference-image-url";
import { parseMarketingBannerAspect } from "@/lib/marketing/banner-aspect";

export default async function MarketingCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id: raw } = await params;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id < 1) notFound();
  const bundle = await getCampaignApiBundle(id);
  if (!bundle) notFound();
  const c = bundle.campaign;
  const kind = (c.campaignKind === "event" ? "event" : "product") as "product" | "event";

  let primaryProductImageUrl: string | null = null;
  if (kind === "event") {
    const u = c.eventReferenceImageUrl;
    if (u && isAllowedMarketingReferenceImageUrl(u)) primaryProductImageUrl = u;
  } else if (c.productId) {
    const p = await getProductForMarketing(c.productId);
    const u = p?.primaryImageUrl ?? null;
    if (u && isAllowedMarketingReferenceImageUrl(u)) primaryProductImageUrl = u;
  }

  const initial = {
    id: c.id,
    title: c.title,
    postText: c.postText,
    whatsappText: c.whatsappText,
    campaignKind: kind,
    productId: c.productId,
    eventTitle: c.eventTitle,
    eventDescription: c.eventDescription,
    eventReferenceImageUrl: c.eventReferenceImageUrl,
    bannerAspect: parseMarketingBannerAspect(c.bannerAspect),
    imagePrompt: c.imagePrompt,
    imageUrl: c.imageUrl,
    bannerImagePrompt: c.bannerImagePrompt,
    bannerImageUrl: c.bannerImageUrl,
    imageRefinementPrompt: c.imageRefinementPrompt,
    productPageUrl: c.productPageUrl,
    redirectUrl: c.redirectUrl,
    platforms: c.platforms,
    status: c.status,
    product: bundle.product,
    primaryProductImageUrl,
  };

  return <CampaignDetailClient initial={initial} />;
}
