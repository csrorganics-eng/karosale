"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
export default function AdminInventoryPage() {
  const [products, setProducts] = useState<
    Array<{
      id: string;
      name: string;
      sku: string;
      stockQty: number;
      status: string;
      categoryName: string;
    }>
  >([]);

  useEffect(() => {
    fetch("/api/admin/inventory")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProducts(json.data.products);
      });
  }, []);

  async function adjust(id: string, delta: number) {
    const note = prompt("Reason for adjustment:");
    if (!note) return;
    await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id, qtyChange: delta, note }),
    });
    const res = await fetch("/api/admin/inventory");
    const json = await res.json();
    if (json.success) setProducts(json.data.products);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Inventory</h1>
      <div className="mt-6 overflow-x-auto rounded-[length:var(--radius-card)] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-text-secondary">
              <th className="p-4">Product</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Status</th>
              <th className="p-4">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="p-4">{p.name}</td>
                <td className="p-4 font-mono text-xs">{p.sku}</td>
                <td className="p-4">{p.stockQty}</td>
                <td className="p-4">
                  <Badge
                    variant={
                      p.status === "in_stock"
                        ? "success"
                        : p.status === "low_stock"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {p.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="p-4">
                  <Button size="sm" variant="outline" onClick={() => adjust(p.id, 1)}>
                    +1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-1"
                    onClick={() => adjust(p.id, -1)}
                  >
                    -1
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
