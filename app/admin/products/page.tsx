"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<
    Array<{
      id: string;
      name: string;
      sku: string;
      price: string;
      stockQty: number;
      lowStock: boolean;
      isActive: boolean;
      categoryName: string;
    }>
  >([]);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProducts(json.data.products);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <a
          href="/admin/products/new"
          className="rounded-[8px] bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Add product
        </a>
      </div>
      <p className="mt-1 text-text-secondary">{products.length} products in catalog</p>
      <div className="mt-6 overflow-x-auto rounded-[14px] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-text-secondary">
              <th className="p-4">Name</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="p-4 font-medium">
                  <a href={`/admin/products/${p.id}/edit`} className="hover:text-primary hover:underline">
                    {p.name}
                  </a>
                </td>
                <td className="p-4 font-mono text-xs">{p.sku}</td>
                <td className="p-4">{p.categoryName}</td>
                <td className="p-4">{formatINR(parseFloat(p.price))}</td>
                <td className="p-4">
                  {p.lowStock ? (
                    <Badge variant="warning">{p.stockQty} left</Badge>
                  ) : (
                    p.stockQty
                  )}
                </td>
                <td className="p-4">
                  <Badge variant={p.isActive ? "success" : "outline"}>
                    {p.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="p-8 text-center text-text-secondary">
            No products. Run <code className="rounded bg-accent px-1">npm run seed</code> or sign in as admin.
          </p>
        )}
      </div>
    </div>
  );
}
