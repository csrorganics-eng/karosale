"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormState = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: string;
  comparePrice: string;
  promotionalDiscountPct: string;
  stockQty: string;
  lowStockThreshold: string;
  sku: string;
  isOrganicCertified: boolean;
  isBestseller: boolean;
};

export default function AdminEditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const p = json.data.product;
          setCategoryName(String(json.data.categoryName ?? ""));
          setForm({
            name: p.name,
            slug: p.slug,
            shortDescription: p.shortDescription ?? "",
            description: p.description ?? "",
            price: String(p.price ?? ""),
            comparePrice: p.comparePrice != null ? String(p.comparePrice) : "",
            promotionalDiscountPct:
              p.promotionalDiscountPct != null ? String(p.promotionalDiscountPct) : "",
            stockQty: String(p.stockQty ?? "0"),
            lowStockThreshold: String(p.lowStockThreshold ?? "10"),
            sku: p.sku ?? "",
            isOrganicCertified: Boolean(p.isOrganicCertified),
            isBestseller: Boolean(p.isBestseller),
          });
        }
      });
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setLoading(true);
    const compareRaw = form.comparePrice.trim();
    const promoRaw = form.promotionalDiscountPct.trim();
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        shortDescription: form.shortDescription,
        description: form.description,
        price: parseFloat(form.price || "0"),
        comparePrice: compareRaw ? parseFloat(compareRaw) : null,
        promotionalDiscountPct: promoRaw ? parseFloat(promoRaw) : null,
        stockQty: parseInt(form.stockQty || "0", 10),
        lowStockThreshold: parseInt(form.lowStockThreshold || "10", 10),
        sku: form.sku,
        isOrganicCertified: form.isOrganicCertified,
        isBestseller: form.isBestseller,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.success) router.push("/admin/products");
    else alert(json.error ?? "Update failed");
  }

  async function draftWithGemini() {
    if (!form?.name.trim()) return;
    setGeminiLoading(true);
    try {
      const res = await fetch("/api/admin/products/ai-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: categoryName || "Groceries",
          features: [],
        }),
      });
      const json = await res.json();
      if (json.success) {
        const copy = json.data?.copy as { shortDescription?: string; description?: string };
        setForm((f) =>
          f
            ? {
                ...f,
                shortDescription: copy.shortDescription ?? f.shortDescription,
                description: copy.description ?? f.description,
              }
            : f,
        );
      } else {
        alert(json.error ?? "Gemini unavailable — set GEMINI_API_KEY");
      }
    } finally {
      setGeminiLoading(false);
    }
  }

  if (!form) {
    return (
      <div className="min-w-0 p-4">
        <p className="text-sm text-text-secondary">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <Link href="/admin/products" className="text-sm text-primary hover:underline">
        ← Products
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">Edit product</h1>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/marketing/new?productId=${encodeURIComponent(id)}`}>
            Marketing &amp; promotions
          </Link>
        </Button>
      </div>
      <form onSubmit={(e) => void submit(e)} className="mt-6 max-w-xl space-y-5">
        <div>
          <label className="text-sm font-medium">Name</label>
          <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Slug</label>
          <Input className="mt-1" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">SKU</label>
          <Input className="mt-1" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Selling price (₹)</label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">MRP / compare-at (₹)</label>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              min="0"
              placeholder="Optional — shows strike-through when above selling price"
              value={form.comparePrice}
              onChange={(e) => setForm({ ...form, comparePrice: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Display discount % (optional)</label>
          <Input
            className="mt-1"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="e.g. 25 — overrides % badge vs MRP math when set"
            value={form.promotionalDiscountPct}
            onChange={(e) => setForm({ ...form, promotionalDiscountPct: e.target.value })}
          />
          <p className="mt-1 text-xs text-text-secondary">
            Leave empty to derive “% off” from MRP and selling price only. Clear field and save to remove.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Stock qty</label>
            <Input
              className="mt-1"
              type="number"
              value={form.stockQty}
              onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Low stock threshold</label>
            <Input
              className="mt-1"
              type="number"
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isOrganicCertified}
              onChange={(e) => setForm({ ...form, isOrganicCertified: e.target.checked })}
            />
            Organic certified
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isBestseller}
              onChange={(e) => setForm({ ...form, isBestseller: e.target.checked })}
            />
            Bestseller
          </label>
        </div>
        <div>
          <label className="text-sm font-medium">Short description</label>
          <textarea
            className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.shortDescription}
            onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={geminiLoading} onClick={() => void draftWithGemini()}>
            {geminiLoading ? "Gemini…" : "Draft with Gemini"}
          </Button>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
