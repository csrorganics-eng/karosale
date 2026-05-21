"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function PackerPicklistPage() {
  const [items, setItems] = useState<
    Array<{
      id: string;
      orderId: string;
      productId: string;
      productName: string;
      productSku: string;
      qtyRequired: number;
      qtyPicked: number;
      isCompleted: boolean;
    }>
  >([]);

  function load() {
    fetch("/api/admin/orders/picklist")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setItems(json.data.items ?? []);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function pick(item: {
    orderId: string;
    productId: string;
    id: string;
    qtyRequired: number;
  }) {
    await fetch(`/api/admin/orders/${item.orderId}/pack-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: item.productId,
        qtyPacked: item.qtyRequired,
      }),
    });
    load();
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <h1 className="font-display text-2xl font-bold">Today&apos;s Pick List</h1>
      <p className="text-text-secondary">{items.length} line items</p>
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-[14px] border p-4 ${item.isCompleted ? "border-success bg-accent-soft" : "border-border bg-surface"}`}
          >
            <p className="text-lg font-semibold">{item.productName}</p>
            <p className="font-mono text-sm text-text-secondary">SKU: {item.productSku}</p>
            <p className="mt-2 text-xl">
              Pick {item.qtyRequired} · Picked {item.qtyPicked}
            </p>
            {!item.isCompleted && (
              <Button className="mt-3 w-full" size="lg" onClick={() => pick(item)}>
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
