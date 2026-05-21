"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminNewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    categoryId: "",
    shortDescription: "",
    description: "",
    price: "",
    sku: "",
    stockQty: "0",
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: parseFloat(form.price),
        stockQty: parseInt(form.stockQty, 10),
        isOrganicCertified: true,
        isActive: true,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) router.push("/admin/products");
    else alert(json.error ?? "Failed to create product");
  }

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-primary hover:underline">
        ← Products
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">New product</h1>
      <form onSubmit={submit} className="mt-6 max-w-lg space-y-4">
        {(["name", "slug", "categoryId", "sku", "shortDescription", "description", "price", "stockQty"] as const).map(
          (field) => (
            <div key={field}>
              <label className="text-sm font-medium capitalize">{field}</label>
              <Input
                className="mt-1"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required={field !== "description"}
              />
            </div>
          ),
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Create product"}
        </Button>
      </form>
    </div>
  );
}
