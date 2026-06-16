"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";
import { BackToHome } from "@/components/storefront/BackToHome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AffiliateLinksPage() {
  const [data, setData] = useState<{ globalUrl?: string; links?: { id: number; fullUrl: string }[] } | null>(
    null,
  );
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const j = await fetch("/api/affiliate/links").then((r) => r.json());
    if (j.success) setData(j.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addProductLink() {
    if (!slug.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/affiliate/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug: slug.trim() }),
      });
      setSlug("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <BackToHome />
      <h1 className="font-display mt-6 text-3xl font-bold">Affiliate links</h1>
      <p className="mt-2 text-sm text-text-secondary">Global store link and per-product tracked URLs.</p>

      {data?.globalUrl && (
        <div className="mt-8 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">Global link</p>
          <p className="mt-2 break-all font-mono text-xs text-text-secondary">{data.globalUrl}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 gap-1"
            onClick={() => data.globalUrl && void navigator.clipboard.writeText(data.globalUrl)}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
        </div>
      )}

      <div className="mt-8 space-y-3 rounded-xl border border-border p-4">
        <p className="text-sm font-medium">Create product link</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="product slug from URL /shop/…"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <Button type="button" onClick={() => void addProductLink()} disabled={busy}>
            Add
          </Button>
        </div>
      </div>

      <div className="mt-8 space-y-2">
        <p className="text-sm font-medium">Saved links</p>
        <ul className="space-y-2 text-sm">
          {(data?.links ?? []).map((l) => (
            <li key={l.id} className="break-all rounded-lg border border-border/70 bg-surface-subtle/40 p-3 font-mono text-xs">
              {l.fullUrl}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-center text-sm">
        <Link href="/account/affiliate" className="text-primary hover:underline">
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}
