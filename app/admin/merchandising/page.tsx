"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RANKING_WEIGHT_KEYS, type RankingWeights } from "@/lib/merchandising/types";

type SettingsResp = RankingWeights & { id: string; updatedAt?: string };

type ExperimentRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  segment: string;
  trafficBPercent: number;
  variantAConfig: unknown;
  variantBConfig: unknown;
  isActive: boolean;
};

const LABELS: Record<keyof RankingWeights, string> = {
  matchNameWeight: "Name match bonus",
  matchDescWeight: "Short description match",
  matchSkuWeight: "SKU match",
  salesLogCoef: "ln(1 + total sales) ×",
  ratingCoef: "Average rating ×",
  reviewCountCoef: "Review count ×",
  featuredBonus: "Featured product bonus",
  bestsellerBonus: "Bestseller bonus",
  inStockBonus: "In-stock bonus",
};

const CONFIG_PLACEHOLDER = `Example (optional overrides only):
{
  "salesLogCoef": 20,
  "matchNameWeight": 120
}`;

export default function AdminMerchandisingPage() {
  const [settings, setSettings] = useState<SettingsResp | null>(null);
  const [rankMsg, setRankMsg] = useState<string | null>(null);
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [expMsg, setExpMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [rs, re] = await Promise.all([
      fetch("/api/admin/search-ranking"),
      fetch("/api/admin/ab-experiments"),
    ]);
    const sj = await rs.json();
    const ej = await re.json();
    if (sj.success) setSettings(sj.data.settings);
    if (ej.success) setExperiments(ej.data.experiments ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRanking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRankMsg(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, number> = {};
    for (const k of RANKING_WEIGHT_KEYS) {
      body[k] = parseFloat(String(fd.get(k) ?? "0"));
    }
    const r = await fetch("/api/admin/search-ranking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    setRankMsg(j.success ? "Saved." : j.error ?? "Failed");
    if (j.success) setSettings(j.data.settings);
  }

  async function createExperiment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setExpMsg(null);
    const fd = new FormData(e.currentTarget);
    const slug = String(fd.get("slug") ?? "").trim();
    const name = String(fd.get("name") ?? "").trim();
    let variantAConfig: unknown = {};
    let variantBConfig: unknown = {};
    const rawA = String(fd.get("variantA") ?? "").trim();
    const rawB = String(fd.get("variantB") ?? "").trim();
    try {
      if (rawA) variantAConfig = JSON.parse(rawA) as unknown;
      if (rawB) variantBConfig = JSON.parse(rawB) as unknown;
    } catch {
      setExpMsg("Variant A or B is not valid JSON.");
      return;
    }
    const r = await fetch("/api/admin/ab-experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name,
        description: String(fd.get("description") ?? "").trim() || undefined,
        segment: fd.get("segment"),
        trafficBPercent: Number(fd.get("trafficBPercent") ?? 50),
        variantAConfig,
        variantBConfig,
        isActive: fd.get("isActive") === "on",
      }),
    });
    const j = await r.json();
    setExpMsg(j.success ? "Experiment created." : j.error ?? "Failed");
    if (j.success) {
      (e.target as HTMLFormElement).reset();
      void load();
    }
  }

  async function toggleExperiment(id: string, isActive: boolean) {
    await fetch(`/api/admin/ab-experiments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    void load();
  }

  async function deleteExperiment(id: string) {
    if (!confirm("Delete this experiment?")) return;
    await fetch(`/api/admin/ab-experiments/${id}`, { method: "DELETE" });
    void load();
  }

  if (!settings) {
    return <p className="text-text-secondary">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl min-w-0 space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold">Search ranking &amp; A/B tests</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Control how shop search and the default &quot;Relevance&quot; sort score products. A/B experiments apply
          <strong> partial weight overrides</strong> per shopper segment; assignment is sticky per user id or cart
          session cookie.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global ranking weights</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveRanking}>
            {RANKING_WEIGHT_KEYS.map((k) => (
              <div key={k}>
                <label className="text-xs font-medium text-text-secondary">{LABELS[k]}</label>
                <Input
                  className="mt-1 font-mono text-sm"
                  name={k}
                  type="number"
                  step="any"
                  defaultValue={settings[k]}
                  required
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Button type="submit">Save ranking weights</Button>
              {rankMsg && <p className="mt-2 text-sm">{rankMsg}</p>}
              {settings.updatedAt && (
                <p className="mt-1 text-xs text-text-secondary">
                  Last updated: {new Date(settings.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>A/B experiments (shopper segments)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-text-secondary">
            <strong>Segments:</strong> <code>all</code> — everyone; <code>guest</code> — not signed in;{" "}
            <code>customer</code> — signed in; <code>returning</code> — signed in with at least one past order.{" "}
            <strong>Traffic B %</strong> is the share of matching shoppers who receive variant B (deterministic hash).
            Only numeric ranking keys from the table above are merged from JSON.
          </p>

          <form className="space-y-3 border-b border-border pb-8" onSubmit={createExperiment}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="slug" placeholder="slug (e.g. search_boost_v1)" required pattern="[a-z0-9_-]+" />
              <Input name="name" placeholder="Display name" required />
            </div>
            <Input name="description" placeholder="Description (optional)" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="segment" className="h-10 rounded-[8px] border border-border px-3 text-sm">
                <option value="all">all shoppers</option>
                <option value="guest">guest only</option>
                <option value="customer">signed-in (incl. returning)</option>
                <option value="returning">returning customers only</option>
              </select>
              <Input
                name="trafficBPercent"
                type="number"
                min={0}
                max={100}
                defaultValue={50}
                placeholder="Traffic to variant B (%)"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked className="rounded border-border" />
              Active
            </label>
            <div>
              <p className="text-xs font-medium text-text-secondary">Variant A — JSON overrides (optional)</p>
              <textarea
                name="variantA"
                rows={4}
                placeholder={CONFIG_PLACEHOLDER}
                className="mt-1 w-full rounded-[8px] border border-border bg-surface p-3 font-mono text-xs"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Variant B — JSON overrides (optional)</p>
              <textarea
                name="variantB"
                rows={4}
                placeholder={CONFIG_PLACEHOLDER}
                className="mt-1 w-full rounded-[8px] border border-border bg-surface p-3 font-mono text-xs"
              />
            </div>
            <Button type="submit">Create experiment</Button>
            {expMsg && <p className="text-sm">{expMsg}</p>}
          </form>

          <div>
            <h3 className="font-semibold">Active &amp; past experiments</h3>
            <ul className="mt-4 space-y-3">
              {experiments.map((ex) => (
                <li
                  key={ex.id}
                  className="rounded-lg border border-border bg-surface p-4 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {ex.name}{" "}
                        <span className="text-text-secondary">
                          (<code>{ex.slug}</code>)
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Segment: <code>{ex.segment}</code> · B traffic: {ex.trafficBPercent}% ·{" "}
                        {ex.isActive ? "Active" : "Paused"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void toggleExperiment(ex.id, ex.isActive)}
                      >
                        {ex.isActive ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => void deleteExperiment(ex.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-primary">Configs</summary>
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-surface-subtle p-2">
                      A: {JSON.stringify(ex.variantAConfig, null, 2)}
                      {"\n"}
                      B: {JSON.stringify(ex.variantBConfig, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
              {experiments.length === 0 && (
                <p className="text-text-secondary">No experiments yet. Create one to A/B ranking weights.</p>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
