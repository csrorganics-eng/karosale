"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/utils";

type Dash = {
  today_gmv?: number;
  today_orders?: number;
  pending_orders?: number;
  low_stock_count?: number;
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data);
      });
  }, []);

  if (!data) return <p className="text-text-secondary">Loading analytics…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Analytics overview</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Snapshot from the dashboard KPI endpoint. Extend with search analytics and funnel charts as traffic grows.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Today GMV" value={formatINR(data.today_gmv ?? 0)} />
        <Metric label="Today orders" value={String(data.today_orders ?? 0)} />
        <Metric label="Pending orders" value={String(data.pending_orders ?? 0)} />
        <Metric label="Low stock SKUs" value={String(data.low_stock_count ?? 0)} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
