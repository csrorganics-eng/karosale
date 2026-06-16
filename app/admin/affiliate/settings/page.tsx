"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function AdminAffiliateSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [commissionTrigger, setCommissionTrigger] = useState("order_complete");
  const [cookieDays, setCookieDays] = useState(7);
  const [multitier, setMultitier] = useState(false);
  const [minPayout, setMinPayout] = useState(500);
  const [grab, setGrab] = useState(false);
  const [ncEnabled, setNcEnabled] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/affiliate/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.settings) {
          const s = j.data.settings;
          setIsEnabled(Boolean(s.isEnabled));
          setCommissionTrigger(String(s.commissionTrigger));
          setCookieDays(Number(s.cookieDurationDays) || 7);
          setMultitier(Boolean(s.multitierEnabled));
          setMinPayout(parseFloat(s.minPayoutAmount) || 500);
          setGrab(Boolean(s.allowGrabReferrer));
          setNcEnabled(Boolean(s.newCustomerDiscountEnabled));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/admin/affiliate/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled,
          commissionTrigger,
          cookieDurationDays: cookieDays,
          multitierEnabled: multitier,
          minPayoutAmount: minPayout,
          allowGrabReferrer: grab,
          newCustomerDiscountEnabled: ncEnabled,
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-text-secondary">Loading…</p>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Affiliate settings</h1>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/affiliate">← Back</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <Label>Program enabled</Label>
          <p className="text-xs text-text-secondary">Master switch</p>
        </div>
        <input
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={isEnabled}
          onChange={(e) => setIsEnabled(e.target.checked)}
        />
      </div>

      <div className="space-y-2 rounded-xl border border-border p-4">
        <Label htmlFor="trigger">Commission trigger</Label>
        <select
          id="trigger"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={commissionTrigger}
          onChange={(e) => setCommissionTrigger(e.target.value)}
        >
          <option value="order_placed">Order placed</option>
          <option value="order_paid">Order paid</option>
          <option value="order_complete">Order delivered</option>
        </select>
      </div>

      <div className="space-y-2 rounded-xl border border-border p-4">
        <Label>Cookie duration (days)</Label>
        <input
          type="number"
          min={1}
          max={90}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={cookieDays}
          onChange={(e) => setCookieDays(Number(e.target.value))}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <Label>Multi-tier commissions</Label>
          <p className="text-xs text-text-secondary">Uses upline chain (up to 4)</p>
        </div>
        <input
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={multitier}
          onChange={(e) => setMultitier(e.target.checked)}
        />
      </div>

      <div className="space-y-2 rounded-xl border border-border p-4">
        <Label>Minimum payout (INR)</Label>
        <input
          type="number"
          min={0}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={minPayout}
          onChange={(e) => setMinPayout(Number(e.target.value))}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <Label>Allow grab referrer</Label>
          <p className="text-xs text-text-secondary">Affiliates can claim unassigned customers</p>
        </div>
        <input
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={grab}
          onChange={(e) => setGrab(e.target.checked)}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <Label>New customer discount</Label>
          <p className="text-xs text-text-secondary">Tune percent/amount in DB or extend this form</p>
        </div>
        <input
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={ncEnabled}
          onChange={(e) => setNcEnabled(e.target.checked)}
        />
      </div>

      <Button onClick={() => void save()} disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
