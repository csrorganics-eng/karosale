"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminEditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const p = json.data.product;
          setForm({
            name: p.name,
            slug: p.slug,
            shortDescription: p.shortDescription ?? "",
            description: p.description ?? "",
            price: String(p.price),
            stockQty: String(p.stockQty),
            sku: p.sku,
          });
        }
      });
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        shortDescription: form.shortDescription,
        description: form.description,
        price: parseFloat(form.price ?? "0"),
        stockQty: parseInt(form.stockQty ?? "0", 10),
        sku: form.sku,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) router.push("/admin/products");
    else alert(json.error ?? "Update failed");
  }

  async function generateAi() {
    const res = await fetch("/api/admin/products/generate-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id, name: form.name }),
    });
    const json = await res.json();
    if (json.success) {
      setForm((f) => ({ ...f, description: json.data.description }));
    } else {
      alert(json.error ?? "AI unavailable — set OPENAI_API_KEY");
    }
  }

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-primary hover:underline">
        ← Products
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">Edit product</h1>
      <form onSubmit={submit} className="mt-6 max-w-lg space-y-4">
        {Object.keys(form).map((field) => (
          <div key={field}>
            <label className="text-sm font-medium capitalize">{field}</label>
            <Input
              className="mt-1"
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={generateAi}>
          Generate AI description
        </Button>
        <Button type="submit" disabled={loading}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
