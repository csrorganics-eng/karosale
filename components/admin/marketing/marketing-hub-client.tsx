"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_SETTINGS_MARKETING_CHANNELS } from "@/lib/admin-marketing-routes";

export type CampaignListItem = {
  id: number;
  title: string;
  campaignKind: "product" | "event";
  eventTitle?: string | null;
  productName?: string | null;
  platforms: string[] | null;
  status: string;
  createdAt: string;
  publishedAt: string | null;
};

type Props = {
  campaigns: CampaignListItem[];
  stats: { total: number; published: number; draft: number; failed: number };
  showPublished?: boolean;
};

export function MarketingHubClient({ campaigns, stats, showPublished }: Props) {
  const router = useRouter();

  return (
    <div className="min-w-0 space-y-8">
      {showPublished ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          Campaign published. Check per-platform results in your Meta dashboards if needed.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Marketing Content Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and review campaigns first, then publish to Facebook, Instagram, or WhatsApp when
            ready. Channel setup is under{" "}
            <Link
              href={ADMIN_SETTINGS_MARKETING_CHANNELS}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Settings → Marketing channels
            </Link>
            .
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/marketing/new">+ New campaign</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Total posts", stats.total],
            ["Published", stats.published],
            ["Drafts", stats.draft],
            ["Failed", stats.failed],
          ] as const
        ).map(([label, n]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{n}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Campaigns</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-6">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Target</th>
                <th className="px-4 py-2 font-medium">Platforms</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No campaigns yet. Start with <strong>New campaign</strong> to generate copy and an
                    image, then review before publishing.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-border/80">
                    <td className="px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.campaignKind === "event" ? (
                        <span>
                          <Badge variant="outline" className="mr-2">
                            Event
                          </Badge>
                          {c.eventTitle?.trim() || "—"}
                        </span>
                      ) : (
                        c.productName ?? "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(c.platforms ?? []).map((p) => (
                        <Badge key={p} variant="secondary" className="mr-1 uppercase">
                          {p.slice(0, 2)}
                        </Badge>
                      ))}
                    </td>
                    <td className="px-4 py-3 capitalize">{c.status}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" className="h-auto p-0 font-normal underline" asChild>
                        <Link href={`/admin/marketing/${c.id}`}>View / publish</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
