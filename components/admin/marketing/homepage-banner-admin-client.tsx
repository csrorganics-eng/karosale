"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { isPublishableMarketingImageUrl } from "@/lib/marketing/marketing-stored-image-url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  BANNER_ASPECT_OPTIONS,
  bannerDimensionsForAspect,
  homepageBannerStorefrontImageShellClass,
  parseMarketingBannerAspect,
  type MarketingBannerAspect,
} from "@/lib/marketing/banner-aspect";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "flex h-10 w-full rounded-[length:var(--radius-input)] border border-border/90 bg-surface px-3 py-2 text-sm text-text-primary shadow-sm transition-[border-color,box-shadow] duration-200 ease-premium focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50",
);

type BannerApi = {
  imageUrl: string | null;
  linkHref: string | null;
  headline: string | null;
  subheadline: string | null;
  isEnabled: boolean;
  bannerAspect?: MarketingBannerAspect | string | null;
  updatedAt: string | null;
};

export function HomepageBannerAdminClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageRefinement, setImageRefinement] = useState("");
  const [bannerAspect, setBannerAspect] = useState<MarketingBannerAspect>("16:9");
  const [imageUrl, setImageUrl] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  /** When true, headline/subheadline are sent as exact on-image copy during Generate. */
  const [bakeTextIntoImage, setBakeTextIntoImage] = useState(true);

  const [catalog, setCatalog] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string | null>(null);

  const loadBanner = useCallback(async () => {
    const r = await fetch("/api/admin/marketing/homepage-banner");
    const j = (await r.json()) as { success?: boolean; data?: { banner: BannerApi | null }; error?: string };
    if (!r.ok || !j.success) {
      setError(j.error ?? "Could not load banner settings");
      return;
    }
    const b = j.data?.banner;
    if (b) {
      setImageUrl(b.imageUrl ?? "");
      setLinkHref(b.linkHref ?? "");
      setHeadline(b.headline ?? "");
      setSubheadline(b.subheadline ?? "");
      setIsLive(b.isEnabled);
      setUpdatedAt(b.updatedAt);
      setBannerAspect(parseMarketingBannerAspect(b.bannerAspect ?? undefined));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await loadBanner();
        const pr = await fetch("/api/admin/products");
        const pj = (await pr.json()) as {
          success?: boolean;
          data?: { products: Array<{ id: string; name: string; slug: string }> };
        };
        if (pj.success && pj.data?.products) setCatalog(pj.data.products);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadBanner]);

  useEffect(() => {
    setPreviewFailed(false);
  }, [imageUrl]);

  const hydrateProduct = useCallback(async (productId: string) => {
    setSelectedProductId(productId);
    setPrimaryImageUrl(null);
    try {
      const r = await fetch(`/api/admin/products/${productId}`);
      const j = (await r.json()) as {
        success?: boolean;
        data?: { images?: Array<{ url: string; isPrimary: boolean; sortOrder: number }> };
      };
      if (!j.success || !j.data?.images?.length) return;
      const sorted = [...j.data.images].sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
      const first = sorted[0]?.url;
      if (first?.startsWith("https://")) setPrimaryImageUrl(first);
    } catch {
      /* ignore */
    }
  }, []);

  async function generateImageUrl() {
    if (!imagePrompt.trim()) {
      setError("Enter an image prompt first.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const { width, height } = bannerDimensionsForAspect(bannerAspect);
      const h1 = headline.trim();
      const h2 = subheadline.trim();
      const overlayPrimary = bakeTextIntoImage ? h1 || h2 || null : null;
      const overlaySecondary = bakeTextIntoImage && h1 && h2 ? h2 : null;

      const r = await fetch("/api/admin/marketing/image-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: imagePrompt.trim(),
          refinementPrompt: imageRefinement.trim() || undefined,
          width,
          height,
          seed: Math.floor(Math.random() * 1_000_000_000),
          referenceImageUrl: primaryImageUrl,
          exactOverlayPrimary: overlayPrimary,
          exactOverlaySecondary: overlaySecondary,
        }),
      });
      const j = (await r.json()) as { success?: boolean; data?: { imageUrl?: string }; error?: string };
      if (!r.ok || !j.success || !j.data?.imageUrl) {
        setError(j.error ?? "Could not build image URL");
        return;
      }
      setImageUrl(j.data.imageUrl);
    } finally {
      setGenerating(false);
    }
  }

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/marketing/homepage-banner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { banner: BannerApi | null };
        error?: string;
        details?: unknown;
      };
      if (!r.ok || !j.success) {
        let msg = j.error ?? `Request failed (${r.status})`;
        const d = j.details as { fieldErrors?: Record<string, string[]> } | undefined;
        if (d?.fieldErrors) {
          const first = Object.entries(d.fieldErrors)
            .flatMap(([k, arr]) => (Array.isArray(arr) && arr[0] ? [`${k}: ${arr[0]}`] : []))
            .at(0);
          if (first) msg = `${msg} (${first})`;
        }
        setError(msg);
        return;
      }
      const b = j.data?.banner;
      if (b) {
        setImageUrl(b.imageUrl ?? "");
        setLinkHref(b.linkHref ?? "");
        setHeadline(b.headline ?? "");
        setSubheadline(b.subheadline ?? "");
        setIsLive(b.isEnabled);
        setUpdatedAt(b.updatedAt);
        setBannerAspect(parseMarketingBannerAspect(b.bannerAspect ?? undefined));
      }
    } finally {
      setSaving(false);
    }
  }

  async function publishToHomepage() {
    const u = imageUrl.trim();
    if (!isPublishableMarketingImageUrl(u)) {
      setError(
        "Use a valid image URL: https in production, or a signed http://localhost / http://127.0.0.1 link from Generate in local dev.",
      );
      return;
    }
    await patch({
      imageUrl: u,
      linkHref: linkHref.trim() || null,
      headline: headline.trim() || null,
      subheadline: subheadline.trim() || null,
      isEnabled: true,
      bannerAspect,
    });
  }

  async function removeFromHomepage() {
    await patch({ isEnabled: false });
  }

  if (loading) {
    return (
      <div className="min-w-0 max-w-3xl p-6">
        <p className="text-sm text-text-secondary">Loading homepage banner…</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-3xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Shop homepage banner</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-secondary">
            Premium hero strip above the main {BRAND_NAME} homepage — separate from social campaigns. Generate a
            wide visual, publish in one step, or take it live off without affecting the rest of the layout.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/marketing">Back to Marketing</Link>
        </Button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {isLive ? (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Live on storefront</Badge>
        ) : (
          <Badge variant="secondary">Not shown on storefront</Badge>
        )}
        {updatedAt ? (
          <span className="text-xs text-text-secondary tabular-nums">
            Last updated {new Date(updatedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · Creative &amp; image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs leading-relaxed text-text-secondary">
            Optional catalog reference keeps packshots aligned with a SKU. The live storefront uses the same frame as
            this preview (aspect + safe scaling) so what you see here matches the shop after publish.
          </p>
          <div className="space-y-2">
            <span className="text-sm font-medium">Optional reference product</span>
            <select
              className={selectClassName}
              value={selectedProductId ?? ""}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                const v = e.target.value;
                if (!v) {
                  setSelectedProductId(null);
                  setPrimaryImageUrl(null);
                  return;
                }
                void hydrateProduct(v);
              }}
            >
              <option value="">None (prompt only)</option>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {primaryImageUrl ? (
              <p className="text-xs text-text-secondary">HTTPS packshot loaded for image generation.</p>
            ) : selectedProductId ? (
              <p className="text-xs text-amber-800">
                Add an https primary image on the product for best reference results.
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-medium">Banner aspect</span>
              <select
                className={selectClassName}
                value={bannerAspect}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setBannerAspect(e.target.value as MarketingBannerAspect)
                }
              >
                {BANNER_ASPECT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="hb-head" className="text-sm font-medium">
                Headline <span className="font-normal text-text-secondary">(storefront + optional AI)</span>
              </label>
              <Input id="hb-head" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <label htmlFor="hb-sub" className="text-sm font-medium">
                Subheadline <span className="font-normal text-text-secondary">(optional)</span>
              </label>
              <Input id="hb-sub" value={subheadline} onChange={(e) => setSubheadline(e.target.value)} maxLength={240} />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border"
              checked={bakeTextIntoImage}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setBakeTextIntoImage(e.target.checked)}
            />
            <span className="text-sm leading-snug text-text-secondary">
              <strong className="text-foreground">Embed headline &amp; subheadline into the AI image</strong> as exact
              on-image typography (spell-check first). The storefront can still show the same copy as a crisp overlay
              when published.
            </span>
          </label>
          <div className="space-y-2">
            <label htmlFor="hb-prompt" className="text-sm font-medium">
              Image prompt
            </label>
            <Textarea
              id="hb-prompt"
              value={imagePrompt}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setImagePrompt(e.target.value)}
              rows={4}
              placeholder="Scene, mood, palette — headline/subheadline can be added separately or baked in when checked above."
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="hb-refine" className="text-sm font-medium">
              Extra visual direction <span className="font-normal text-text-secondary">(optional)</span>
            </label>
            <Textarea
              id="hb-refine"
              value={imageRefinement}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setImageRefinement(e.target.value)}
              rows={2}
              placeholder="Lighting, palette, mood — merged when you generate."
              className="text-sm"
            />
          </div>
          <Button type="button" disabled={generating || !imagePrompt.trim()} onClick={() => void generateImageUrl()}>
            {generating ? "Generating…" : "Generate preview image"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2 · Preview &amp; storefront copy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "overflow-hidden rounded-xl border border-border/80 bg-muted shadow-inner",
              homepageBannerStorefrontImageShellClass(bannerAspect),
            )}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-contain object-center"
                onError={() => setPreviewFailed(true)}
              />
            ) : (
              <div className="flex h-full min-h-[140px] items-center justify-center p-4 text-center text-xs text-text-secondary">
                Generate an image to preview the strip. Published banners use the same URL stored for the homepage.
              </div>
            )}
          </div>
          {previewFailed ? (
            <p className="text-xs text-amber-900 dark:text-amber-200/90">
              Preview failed to load — check image signing / Pollinations.
            </p>
          ) : null}
          <div className="space-y-2">
            <label htmlFor="hb-url" className="text-sm font-medium">
              Image URL <span className="font-normal text-text-secondary">(from Generate or paste)</span>
            </label>
            <Input
              id="hb-url"
              value={imageUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
              className="font-mono text-xs"
              placeholder="https://… or http://localhost:3000/… in dev"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="hb-link" className="text-sm font-medium">
              Click-through URL <span className="font-normal text-text-secondary">(optional)</span>
            </label>
            <Input
              id="hb-link"
              value={linkHref}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLinkHref(e.target.value)}
              className="font-mono text-xs"
              placeholder="/shop or https://…"
            />
          </div>
          <p className="text-xs text-text-secondary">
            Headline and subheadline are edited in step 1 — they appear as a premium glass overlay on the live
            storefront and can optionally be baked into the generated image.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3 · Publish</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button type="button" disabled={saving} onClick={() => void publishToHomepage()}>
            {saving ? "Saving…" : "Publish to shop homepage"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving || !isLive}
            onClick={() => void removeFromHomepage()}
          >
            Remove from homepage
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() =>
              void patch({
                ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
                linkHref: linkHref.trim() || null,
                headline: headline.trim() || null,
                subheadline: subheadline.trim() || null,
                bannerAspect,
              })
            }
          >
            Save draft only
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/">View storefront</Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-text-secondary">
        Tip: social post campaigns stay under{" "}
        <Link href="/admin/marketing/new" className="font-medium text-primary underline-offset-4 hover:underline">
          New campaign
        </Link>
        . This page only controls the top-of-homepage strip.
      </p>
    </div>
  );
}
