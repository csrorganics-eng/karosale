"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminTableShell, ADMIN_DATA_TABLE_CLASS } from "@/components/admin/AdminTableShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold">Products</h1>
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/admin/products/new">Add product</Link>
        </Button>
      </div>
      <p className="mt-1 text-text-secondary">{products.length} products in catalog</p>
      <AdminTableShell className="mt-4 sm:mt-6">
        <table className={ADMIN_DATA_TABLE_CLASS}>
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-left text-text-secondary">
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="font-medium">
                  <Link href={`/admin/products/${p.id}/edit`} className="hover:text-primary hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="font-mono text-xs">{p.sku}</td>
                <td>{p.categoryName}</td>
                <td>{formatINR(parseFloat(p.price))}</td>
                <td>
                  {p.lowStock ? (
                    <Badge variant="warning">{p.stockQty} left</Badge>
                  ) : (
                    p.stockQty
                  )}
                </td>
                <td>
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
      </AdminTableShell>
    </div>
  );
}
