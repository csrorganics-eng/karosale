"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackToAccount } from "@/components/storefront/BackToAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Summary = {
  karmaPoints: number;
  tier: {
    name: string;
    discountPct: number;
    badgeLabel: string;
    alwaysFreeShipping: boolean;
    freeShippingOn: number | null;
  } | null;
  nextTier: {
    name: string;
    minPoints: number;
    discountPct: string;
    badgeLabel: string;
  } | null;
  pointsToNext: number | null;
  tiers: Array<{
    id: string;
    name: string;
    minPoints: number;
    maxPoints: number | null;
    discountPct: string;
    badgeLabel: string;
    badgeColor: string;
    freeShippingOn: string | null;
  }>;
  history: Array<{
    id: string;
    type: string;
    points: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
  }>;
  referralLink: string | null;
};

export default function LoyaltyPage() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/loyalty/summary")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      });
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <BackToAccount />
        Loading Karma…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <BackToAccount />
      <h1 className="font-display text-3xl font-bold">Karma Rewards</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Earn 1 point per ₹10 spent. Redeem up to 50% of your order with Karma at checkout (100 points = ₹10
        off).
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Your balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-4xl font-bold text-primary">{data.karmaPoints}</p>
              <p className="text-sm text-text-secondary">Karma points</p>
            </div>
            {data.tier && <Badge variant="secondary">{data.tier.badgeLabel}</Badge>}
          </div>
          {data.tier && (
            <p className="text-sm text-text-secondary">
              Tier: <strong>{data.tier.name}</strong> · {data.tier.discountPct}% off eligible orders
              {data.tier.alwaysFreeShipping && " · Free shipping (tier perk)"}
            </p>
          )}
          {data.nextTier && data.pointsToNext != null && (
            <p className="rounded-lg border border-border bg-accent-soft/50 p-3 text-sm">
              {data.pointsToNext === 0 ? (
                <>
                  You&apos;ve reached the points threshold for <strong>{data.nextTier.name}</strong> — your
                  next tier unlocks on the next balance refresh after checkout.
                </>
              ) : (
                <>
                  Earn <strong>{data.pointsToNext}</strong> more points to reach{" "}
                  <strong>{data.nextTier.name}</strong> ({data.nextTier.discountPct}% off,{" "}
                  {data.nextTier.badgeLabel}).
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to earn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-text-secondary">
          <p>Shop organic products — Karma posts when your order is paid or delivered (per campaign rules).</p>
          <p>Leave helpful reviews after delivery. When a review is published, you receive a Karma bonus.</p>
          <p>Invite friends with your referral link — they get a welcome offer and you grow the community.</p>
        </CardContent>
      </Card>

      {data.referralLink && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Refer friends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-text-secondary">Share your link from Account → referral card, or copy:</p>
            <code className="block break-all rounded-lg bg-surface-subtle p-3 text-xs">{data.referralLink}</code>
            <Button variant="outline" size="sm" asChild>
              <Link href="/account">Open account &amp; referral tools</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.tiers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.badgeColor }} />
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-text-secondary">
                    {t.minPoints}
                    {t.maxPoints != null ? `–${t.maxPoints}` : "+"} points
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary">{t.badgeLabel}</Badge>
                <p className="mt-1 text-sm text-primary">{t.discountPct}% off</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.history.length === 0 ? (
            <p className="text-sm text-text-secondary">No Karma transactions yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.history.map((h) => (
                <li key={h.id} className="flex justify-between gap-3 border-b border-border/60 py-2 last:border-0">
                  <span className="text-text-secondary">{h.description}</span>
                  <span className={h.points >= 0 ? "font-medium text-primary" : "text-error"}>
                    {h.points > 0 ? `+${h.points}` : h.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
