"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Array<{
    id: string;
    orderNumber: string;
    total: string;
    status: string;
    customerName: string | null;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrders(json.data.orders);
      });
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Orders</h1>
      <div className="mt-6 overflow-x-auto rounded-[length:var(--radius-card)] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-text-secondary">
              <th className="p-4">Order #</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Total</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border/50">
                <td className="p-4 font-mono">{o.orderNumber}</td>
                <td className="p-4">{o.customerName}</td>
                <td className="p-4">{formatINR(parseFloat(o.total))}</td>
                <td className="p-4">
                  <Badge>{o.status}</Badge>
                </td>
                <td className="p-4">
                  <Link href={`/admin/orders/${o.id}`} className="text-primary hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="p-8 text-center text-text-secondary">No orders found</p>
        )}
      </div>
    </div>
  );
}
