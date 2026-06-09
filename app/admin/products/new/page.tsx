"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = { id: string; name: string };

export default function AdminNewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [featuresNotes, setFeaturesNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/categories")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data?.categories)) {
          setCategories(
            j.data.categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
          );
        }
      })
      .catch(() => {});
  }, []);

  async function draftWithGemini() {
    if (!form.name.trim()) {
      alert("Enter a product name first.");
      return;
    }
    const cat = categories.find((c) => c.id === form.categoryId);
    if (!cat) {
      alert("Pick a category first.");
      return;
    }
    setAiLoading(true);
    try {
      const features = featuresNotes
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/admin/products/ai-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: cat.name,
          features: features.length ? features : ["organic", "India"],
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error ?? "AI generation failed");
        return;
      }
      const copy = json.data?.copy as {
        shortDescription?: string;
        description?: string;
      };
      setForm((f) => ({
        ...f,
        shortDescription: copy.shortDescription ?? f.shortDescription,
        description: copy.description ?? f.description,
      }));
    } finally {
      setAiLoading(false);
    }
  }

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
    <div className="min-w-0">
      <Link href="/admin/products" className="text-sm text-primary hover:underline">
        ← Products
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">New product</h1>
      <form onSubmit={submit} className="mt-6 max-w-lg space-y-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <Input
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Slug</label>
          <Input
            className="mt-1"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Category</label>
          <select
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            required
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">SKU</label>
          <Input
            className="mt-1"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">AI — features / notes (optional)</label>
          <textarea
            className="mt-1 min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={featuresNotes}
            onChange={(e) => setFeaturesNotes(e.target.value)}
            placeholder="One per line: e.g. cold-pressed, 500ml, FSSAI"
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            disabled={aiLoading}
            onClick={() => void draftWithGemini()}
          >
            {aiLoading ? "Generating…" : "Draft descriptions with Gemini"}
          </Button>
          <p className="mt-1 text-xs text-text-secondary">
            Fills short and long description — review before saving.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Short description</label>
          <textarea
            className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.shortDescription}
            onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="mt-1 min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            minLength={10}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Price</label>
          <Input
            className="mt-1"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            type="number"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Stock qty</label>
          <Input
            className="mt-1"
            value={form.stockQty}
            onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
            type="number"
            required
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Create product"}
        </Button>
      </form>
    </div>
  );
}
