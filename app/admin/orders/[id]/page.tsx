"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

const STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("");

  function load() {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
          setStatus(json.data.order.status);
        }
      });
  }

  useEffect(() => {
    load();
  }, [id]);

  async function updateStatus() {
    await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function ship() {
    const res = await fetch(`/api/admin/orders/${id}/ship`, { method: "POST" });
    const json = await res.json();
    if (json.success) load();
    else alert(json.error ?? "Ship failed — check Shiprocket credentials");
  }

  async function printTag() {
    const res = await fetch(`/api/admin/orders/${id}/packaging-tag`);
    const json = await res.json();
    if (json.success && json.data.pdfUrl) {
      window.open(json.data.pdfUrl, "_blank");
    } else {
      alert(json.data?.message ?? "Generating tag… refresh in a few seconds");
    }
  }

  if (!data) return <p>Loading...</p>;

  const order = data.order as {
    orderNumber: string;
    total: string;
    status: string;
    packagingTagUrl: string | null;
  };
  const customer = data.customer as { name: string; email: string; phone: string };
  const items = data.items as Array<{ productName: string; qty: number; total: string }>;

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-primary hover:underline">
        ← Orders
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold">{order.orderNumber}</h1>
        <Badge>{order.status}</Badge>
      </div>
      <p className="text-text-secondary">
        {customer?.name} · {customer?.phone} · {formatINR(parseFloat(order.total))}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={printTag}>Print tag</Button>
        <Button variant="outline" onClick={ship}>
          Ship via Shiprocket
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-[length:var(--radius-card)] border border-border bg-surface p-4">
        <div>
          <label className="text-sm font-medium">Update status</label>
          <select
            className="mt-1 block rounded-[8px] border border-border px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={updateStatus}>Save status</Button>
      </div>

      <div className="mt-6 rounded-[length:var(--radius-card)] border border-border bg-surface p-4">
        <h2 className="font-semibold">Items</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {items?.map((item, i) => (
            <li key={i}>
              {item.productName} × {item.qty} — {formatINR(parseFloat(item.total))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
