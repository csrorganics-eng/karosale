"use client";

import { useEffect, useState } from "react";
import { AdminTableShell, ADMIN_DATA_TABLE_CLASS } from "@/components/admin/AdminTableShell";
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
    <div className="min-w-0">
      <h1 className="font-display text-2xl font-bold">Inventory</h1>
      <AdminTableShell className="mt-4 sm:mt-6">
        <table className={ADMIN_DATA_TABLE_CLASS}>
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-text-secondary">
              <th>Product</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td>{p.name}</td>
                <td className="font-mono text-xs">{p.sku}</td>
                <td>{p.stockQty}</td>
                <td>
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
                <td>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => adjust(p.id, 1)}>
                      +1
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => adjust(p.id, -1)}>
                      -1
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>
    </div>
  );
}
