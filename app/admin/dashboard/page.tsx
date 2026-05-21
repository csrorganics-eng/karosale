"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";

interface DashboardData {
  today_gmv: number;
  today_orders: number;
  pending_orders: number;
  low_stock_count: number;
  recent_orders: Array<{
    id: string;
    orderNumber: string;
    total: string;
    status: string;
    customerName: string | null;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error ?? "Failed to load");
      })
      .catch(() => setError("Network error"));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-error/20 bg-error/5 p-6 text-error">
        <p>{error}</p>
        <p className="mt-2 text-sm text-text-secondary">
          Sign in as admin at{" "}
          <Link href="/account" className="underline">
            /account
          </Link>
        </p>
      </div>
    );
  }

  if (!data) return <p className="text-text-secondary">Loading dashboard...</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>
      <p className="text-text-secondary">Live overview · ● Live</p>

      <Card className="mt-6 border-primary/20 bg-accent-soft/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Karma Rewards</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-text-secondary">
            Edit loyalty tiers, point ranges, discounts, and badges.
          </p>
          <Link
            href="/admin/karma-rewards"
            className="rounded-[8px] bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Manage rewards
          </Link>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Today&apos;s GMV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold text-primary">
              {formatINR(data.today_gmv)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Today&apos;s Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold">{data.today_orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold text-amber-600">
              {data.pending_orders}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl font-bold text-amber-600">
              {data.low_stock_count}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="pb-2 pr-4">Order #</th>
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/50">
                    <td className="py-3 font-mono">{o.orderNumber}</td>
                    <td className="py-3">{o.customerName ?? "—"}</td>
                    <td className="py-3">{formatINR(parseFloat(o.total))}</td>
                    <td className="py-3">
                      <Badge variant="secondary">{o.status}</Badge>
                    </td>
                    <td className="py-3">
                      <Link href={`/admin/orders/${o.id}`} className="text-primary hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.recent_orders.length === 0 && (
              <p className="py-8 text-center text-text-secondary">No orders yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
