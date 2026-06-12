import { requireRole } from "@/lib/auth";
import { MarketingHubClient } from "@/components/admin/marketing/marketing-hub-client";
import { countCampaignsByStatus, listCampaigns } from "@/lib/marketing/campaign-queries";

export default async function AdminMarketingStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const [campaigns, stats] = await Promise.all([listCampaigns(50), countCampaignsByStatus()]);

  const items = campaigns.map((c) => ({
    id: c.id,
    title: c.title,
    campaignKind: (c.campaignKind === "event" ? "event" : "product") as "product" | "event",
    eventTitle: c.eventTitle,
    productName: c.productName,
    platforms: c.platforms,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
  }));

  return (
    <MarketingHubClient campaigns={items} stats={stats} showPublished={sp.published === "1"} />
  );
}
