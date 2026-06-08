"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLoadingOverlay } from "@/components/providers/loading-overlay-provider";
import { WaitingSpinner } from "@/components/ui/waiting-overlay";

type PickItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  qtyRequired: number;
  qtyPicked: number;
  isCompleted: boolean;
};

export default function PackerPicklistPage() {
  const [items, setItems] = useState<PickItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const { runWithLoading } = useLoadingOverlay();

  function load() {
    return fetch("/api/admin/orders/picklist")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setItems(json.data.items ?? []);
      })
      .finally(() => setListLoading(false));
  }

  useEffect(() => {
    void load();
  }, []);

  async function pick(item: {
    orderId: string;
    productId: string;
    id: string;
    qtyRequired: number;
  }) {
    try {
      await runWithLoading("Saving pick…", async () => {
        const res = await fetch(`/api/admin/orders/${item.orderId}/pack-item`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.productId,
            qtyPacked: item.qtyRequired,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "Pick update failed");
        }
      });
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Pick failed");
    }
  }

  if (listLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <WaitingSpinner label="Loading pick list…" size="lg" className="min-h-[40vh]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <h1 className="font-display text-2xl font-bold">Today&apos;s Pick List</h1>
      <p className="text-text-secondary">{items.length} line items</p>
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-[length:var(--radius-card)] border p-4 ${item.isCompleted ? "border-success bg-accent-soft" : "border-border bg-surface"}`}
          >
            <p className="text-lg font-semibold">{item.productName}</p>
            <p className="font-mono text-sm text-text-secondary">SKU: {item.productSku}</p>
            <p className="mt-2 text-xl">
              Pick {item.qtyRequired} · Picked {item.qtyPicked}
            </p>
            {!item.isCompleted && (
              <Button className="mt-3 w-full" size="lg" onClick={() => void pick(item)}>
                Mark picked ({item.qtyRequired})
              </Button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-text-secondary">No items in today&apos;s pick list.</p>
        )}
      </div>
    </div>
  );
}
