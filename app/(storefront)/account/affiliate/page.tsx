"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackToHome } from "@/components/storefront/BackToHome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AffiliateDashboardPage() {
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    void fetch("/api/affiliate/stats")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const j = data as { success?: boolean; data?: { affiliate?: { status: string; username: string }; stats?: Record<string, number> } };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <BackToHome />
      <h1 className="font-display mt-6 text-3xl font-bold">Affiliate dashboard</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Track performance, manage links, and request payouts.
      </p>

      {!j?.success && <p className="mt-6 text-sm text-text-secondary">Loading…</p>}

      {j?.success && !j.data?.affiliate && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Get started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-text-secondary">You do not have an affiliate profile yet.</p>
            <Button asChild>
              <Link href="/account/affiliate/register">Apply now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {j?.success && j.data?.affiliate && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>
                Username: <strong className="font-mono">{j.data.affiliate.username}</strong>
              </p>
              <p className="mt-1">
                State: <strong>{j.data.affiliate.status}</strong>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Wallet</CardTitle>
            </CardHeader>
            <CardContent className="text-sm tabular-nums">
              <p>Balance: ₹{(Number(j.data.stats?.walletBalance) || 0).toFixed(2)}</p>
              <p className="mt-1">Total earned: ₹{(Number(j.data.stats?.totalEarned) || 0).toFixed(2)}</p>
              <p className="mt-1 text-xs text-text-secondary">
                Approved commission sum: ₹{(Number(j.data.stats?.pendingCommission) || 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/account/affiliate/links">My links</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
