"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminTableShell, ADMIN_DATA_TABLE_CLASS } from "@/components/admin/AdminTableShell";
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
    <div className="min-w-0">
      <h1 className="font-display text-2xl font-bold">Orders</h1>
      <AdminTableShell className="mt-4 sm:mt-6">
        <table className={ADMIN_DATA_TABLE_CLASS}>
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-text-secondary">
              <th>Order #</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border/50">
                <td className="font-mono">{o.orderNumber}</td>
                <td>{o.customerName}</td>
                <td>{formatINR(parseFloat(o.total))}</td>
                <td>
                  <Badge>{o.status}</Badge>
                </td>
                <td>
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
      </AdminTableShell>
    </div>
  );
}
