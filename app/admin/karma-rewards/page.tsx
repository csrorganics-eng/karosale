"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Tier = {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  discountPct: string;
  freeShippingOn: string | null;
  badgeLabel: string;
  badgeColor: string;
};

const emptyForm = {
  name: "",
  minPoints: "0",
  maxPoints: "",
  discountPct: "0",
  freeShippingOn: "",
  badgeLabel: "",
  badgeColor: "#1B4332",
};

export default function AdminKarmaRewardsPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function load() {
    fetch("/api/admin/loyalty-tiers")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTiers(json.data.tiers);
      });
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(tier: Tier) {
    setEditingId(tier.id);
    setForm({
      name: tier.name,
      minPoints: String(tier.minPoints),
      maxPoints: tier.maxPoints != null ? String(tier.maxPoints) : "",
      discountPct: String(tier.discountPct),
      freeShippingOn: tier.freeShippingOn ?? "",
      badgeLabel: tier.badgeLabel,
      badgeColor: tier.badgeColor,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      name: form.name,
      minPoints: parseInt(form.minPoints, 10),
      maxPoints: form.maxPoints ? parseInt(form.maxPoints, 10) : null,
      discountPct: parseFloat(form.discountPct),
      freeShippingOn: form.freeShippingOn ? parseFloat(form.freeShippingOn) : null,
      badgeLabel: form.badgeLabel,
      badgeColor: form.badgeColor,
    };

    const url = editingId
      ? `/api/admin/loyalty-tiers/${editingId}`
      : "/api/admin/loyalty-tiers";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setLoading(false);

    if (json.success) {
      resetForm();
      load();
    } else {
      alert(json.error ?? "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this reward tier?")) return;
    const res = await fetch(`/api/admin/loyalty-tiers/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) load();
    else alert(json.error ?? "Delete failed");
  }

  return (
    <div>
      <Link href="/admin/dashboard" className="text-sm text-primary hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">Karma Rewards</h1>
      <p className="mt-1 text-text-secondary">
        Configure loyalty tiers, point ranges, and discounts shown to customers.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <form
          onSubmit={submit}
          className="rounded-[14px] border border-border bg-surface p-6 space-y-4"
        >
          <h2 className="font-semibold">{editingId ? "Edit tier" : "Add new tier"}</h2>
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              className="mt-1"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Min points</label>
              <Input
                type="number"
                className="mt-1"
                value={form.minPoints}
                onChange={(e) => setForm({ ...form, minPoints: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max points (empty = unlimited)</label>
              <Input
                type="number"
                className="mt-1"
                value={form.maxPoints}
                onChange={(e) => setForm({ ...form, maxPoints: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Discount %</label>
              <Input
                type="number"
                step="0.01"
                className="mt-1"
                value={form.discountPct}
                onChange={(e) => setForm({ ...form, discountPct: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Free shipping above ₹</label>
              <Input
                type="number"
                className="mt-1"
                value={form.freeShippingOn}
                onChange={(e) => setForm({ ...form, freeShippingOn: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Badge label</label>
              <Input
                className="mt-1"
                value={form.badgeLabel}
                onChange={(e) => setForm({ ...form, badgeLabel: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Badge color</label>
              <Input
                type="color"
                className="mt-1 h-10 w-full"
                value={form.badgeColor}
                onChange={(e) => setForm({ ...form, badgeColor: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : editingId ? "Update tier" : "Add tier"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="rounded-[14px] border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-subtle text-left text-text-secondary">
                <th className="p-4">Tier</th>
                <th className="p-4">Points</th>
                <th className="p-4">Discount</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="p-4">
                    <span
                      className="mr-2 inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: t.badgeColor }}
                    />
                    {t.name}
                    <Badge className="ml-2" variant="outline">
                      {t.badgeLabel}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {t.minPoints}
                    {t.maxPoints != null ? `–${t.maxPoints}` : "+"}
                  </td>
                  <td className="p-4">{t.discountPct}%</td>
                  <td className="p-4">
                    <Button size="sm" variant="outline" onClick={() => startEdit(t)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-1"
                      onClick={() => remove(t.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tiers.length === 0 && (
            <p className="p-8 text-center text-text-secondary">No tiers yet. Add one or run seed.</p>
          )}
        </div>
      </div>
    </div>
  );
}
