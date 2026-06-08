"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Frequency = "weekly" | "fortnightly" | "monthly" | "bimonthly";

export function SubscribeSection({
  productId,
  productName,
  eligible,
  subscriptionDiscountPct,
}: {
  productId: string;
  productName: string;
  eligible: boolean;
  subscriptionDiscountPct: string | null;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!eligible) return null;

  const pct = subscriptionDiscountPct ? parseFloat(subscriptionDiscountPct) : 10;

  async function subscribe() {
    setMsg(null);
    if (status !== "authenticated") {
      router.push(`/account?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/shop")}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, qty: 1, frequency }),
      });
      const json = await res.json();
      if (!json.success) {
        setMsg(json.error ?? "Could not start subscription");
        return;
      }
      setMsg("Subscription saved! Manage it anytime under My Subscriptions.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-[length:var(--radius-card)] border border-primary/20 bg-accent-soft/60 p-4">
      <p className="text-sm font-semibold text-text-primary">Subscribe &amp; save</p>
      <p className="mt-1 text-sm text-text-secondary">
        Save ~{Number.isFinite(pct) ? pct : 10}% on recurring orders for {productName}. You can pause
        or skip anytime.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="sub-frequency">
          Delivery frequency
        </label>
        <select
          id="sub-frequency"
          className="h-10 rounded-[length:var(--radius-card)] border border-border bg-surface px-3 text-sm"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Every 2 weeks</option>
          <option value="monthly">Monthly</option>
          <option value="bimonthly">Every 2 months</option>
        </select>
        <Button type="button" variant="warm" disabled={busy} onClick={() => void subscribe()}>
          {busy ? "Saving…" : "Subscribe"}
        </Button>
      </div>
      {msg && <p className="mt-2 text-xs text-primary">{msg}</p>}
    </div>
  );
}
