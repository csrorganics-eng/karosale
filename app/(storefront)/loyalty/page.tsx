"use client";

import { useEffect, useState } from "react";
import { BackToAccount } from "@/components/storefront/BackToAccount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Tier = {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  discountPct: string;
  badgeLabel: string;
  badgeColor: string;
  freeShippingOn: string | null;
};

export default function LoyaltyPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);

  useEffect(() => {
    fetch("/api/loyalty/tiers")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTiers(json.data.tiers);
      });
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <BackToAccount />
      <h1 className="font-display text-3xl font-bold">Karma Rewards</h1>
      <p className="mt-2 text-text-secondary">Earn 1 point per ₹10 spent. 100 points = ₹10 off.</p>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tiers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: t.badgeColor }}
                />
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
          {tiers.length === 0 && (
            <p className="text-sm text-text-secondary">Reward tiers coming soon.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
