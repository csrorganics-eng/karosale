"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackToAccount } from "@/components/storefront/BackToAccount";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Array<{
    id: string;
    orderNumber: string;
    total: string;
    status: string;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrders(json.data.orders);
      });
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BackToAccount />
      <h1 className="font-display text-3xl font-bold">My Orders</h1>
      <div className="mt-6 space-y-4">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="block rounded-[14px] border border-border bg-surface p-4 hover:shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-medium">{o.orderNumber}</span>
              <Badge>{o.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              {new Date(o.createdAt).toLocaleDateString("en-IN")} · {formatINR(parseFloat(o.total))}
            </p>
          </Link>
        ))}
        {orders.length === 0 && (
          <p className="text-text-secondary">No orders yet. Sign in and place an order.</p>
        )}
      </div>
    </div>
  );
}
