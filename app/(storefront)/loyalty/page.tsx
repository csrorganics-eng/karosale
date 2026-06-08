"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BackToAccount } from "@/components/storefront/BackToAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WaitingSpinner } from "@/components/ui/waiting-overlay";

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

type PublicTier = Summary["tiers"][number];

const LOYALTY_FETCH: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

export default function LoyaltyPage() {
  const { status } = useSession();
  const [data, setData] = useState<Summary | null>(null);
  const [publicTiers, setPublicTiers] = useState<PublicTier[]>([]);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hadDataRef = useRef(false);

  const loadSummary = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/loyalty/summary", LOYALTY_FETCH);
      const json: {
        success?: boolean;
        error?: string;
        data?: Summary;
      } = await res.json();

      if (res.status === 401) {
        hadDataRef.current = false;
        setData(null);
        setErrorMessage("Your session expired. Sign in again to view Karma.");
        setLoadState("error");
        return;
      }

      if (!json.success) {
        const msg = json.error ?? "Could not load Karma rewards.";
        setErrorMessage(msg);
        if (hadDataRef.current) {
          setLoadState("idle");
        } else {
          setData(null);
          setLoadState("error");
        }
        return;
      }

      if (json.data) {
        hadDataRef.current = true;
        setData(json.data);
        setLoadState("idle");
      } else {
        setErrorMessage("Unexpected empty response from server.");
        if (hadDataRef.current) {
          setLoadState("idle");
        } else {
          setData(null);
          setLoadState("error");
        }
      }
    } catch {
      setErrorMessage("Network error. Check your connection and try again.");
      if (hadDataRef.current) {
        setLoadState("idle");
      } else {
        setData(null);
        setLoadState("error");
      }
    }
  }, []);

  useEffect(() => {
    void fetch("/api/loyalty/tiers", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data?.tiers)) {
          setPublicTiers(j.data.tiers as PublicTier[]);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      hadDataRef.current = false;
      setData(null);
      setLoadState("idle");
      setErrorMessage(null);
      return;
    }
    void loadSummary();
  }, [status, loadSummary]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <WaitingSpinner label="Checking your session…" size="lg" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <BackToAccount />
        <h1 className="font-display text-3xl font-bold">Karma Rewards</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Sign in to see your balance, tier benefits, and Karma history.
        </p>
        <Card className="mt-8">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-text-secondary">
              Earn points on eligible orders, redeem up to 50% at checkout (100 points = ₹10 off), and unlock
              tier discounts.
            </p>
            <Button asChild>
              <Link href="/account?redirect=/loyalty">Sign in to continue</Link>
            </Button>
          </CardContent>
        </Card>
        {publicTiers.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Tier ladder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {publicTiers.map((t) => (
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
                  <Badge variant="secondary">{t.badgeLabel}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (loadState === "loading" && !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <BackToAccount />
        <WaitingSpinner className="mt-8" label="Loading Karma…" size="lg" />
      </div>
    );
  }

  if (loadState === "error" && !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <BackToAccount />
        <h1 className="font-display text-3xl font-bold">Karma Rewards</h1>
        <div
          className="mt-6 rounded-[length:var(--radius-card)] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {errorMessage ?? "Something went wrong."}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void loadSummary()}>
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/account?redirect=/loyalty">Sign in again</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <BackToAccount />
        <WaitingSpinner className="mt-8" label="Loading Karma…" size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <BackToAccount />
        <Button type="button" variant="outline" size="sm" onClick={() => void loadSummary()} disabled={loadState === "loading"}>
          {loadState === "loading" ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {loadState === "error" && errorMessage && (
        <p className="mt-2 text-sm text-error" role="status">
          {errorMessage}
        </p>
      )}

      <h1 className="mt-4 font-display text-3xl font-bold">Karma Rewards</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Earn 1 point per ₹10 spent. Redeem up to 50% of your order with Karma at checkout (100 points = ₹10 off).
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
          {!data.tier && data.tiers.length > 0 && (
            <p className="text-sm text-text-secondary">Your tier will appear here once tier data is synced.</p>
          )}
          {data.nextTier && data.pointsToNext != null && (
            <p className="rounded-lg border border-border bg-accent-soft/50 p-3 text-sm">
              {data.pointsToNext === 0 ? (
                <>
                  You&apos;ve reached the points threshold for <strong>{data.nextTier.name}</strong> — your next
                  tier unlocks on the next balance refresh after checkout.
                </>
              ) : (
                <>
                  Earn <strong>{data.pointsToNext}</strong> more points to reach <strong>{data.nextTier.name}</strong>{" "}
                  ({data.nextTier.discountPct}% off, {data.nextTier.badgeLabel}).
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
              <Link href="/account">Open account and referral tools</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.tiers.length === 0 ? (
            <p className="text-sm text-text-secondary">No tier configuration loaded. Try refresh or contact support.</p>
          ) : (
            data.tiers.map((t) => (
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
            ))
          )}
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
                  <div>
                    <span className="text-text-secondary">{h.description}</span>
                    <p className="text-xs text-text-secondary/80">
                      {typeof h.createdAt === "string"
                        ? new Date(h.createdAt).toLocaleString()
                        : String(h.createdAt)}
                    </p>
                  </div>
                  <span className={h.points >= 0 ? "shrink-0 font-medium text-primary" : "shrink-0 text-error"}>
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
