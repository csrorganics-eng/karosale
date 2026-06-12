"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { isWhatsAppCloudConfigured } from "@/lib/marketing/whatsapp-publisher";
import {
  BANNER_ASPECT_OPTIONS,
  bannerDimensionsForAspect,
  bannerPreviewAspectClass,
  type MarketingBannerAspect,
} from "@/lib/marketing/banner-aspect";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ADMIN_SETTINGS_MARKETING_CHANNELS } from "@/lib/admin-marketing-routes";
import { MarketingPromotionPreviewModal } from "@/components/admin/marketing/marketing-promotion-preview-modal";
import {
  defaultProductShopUrl,
  defaultStorefrontHomepageUrl,
} from "@/lib/marketing/storefront-links";

const selectClassName = cn(
  "flex h-10 w-full rounded-[length:var(--radius-input)] border border-border/90 bg-surface px-3 py-2 text-sm text-text-primary shadow-sm transition-[border-color,box-shadow] duration-200 ease-premium focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50",
);

export type CampaignDetailDTO = {
  id: number;
  title: string;
  postText: string;
  whatsappText: string | null;
  campaignKind: "product" | "event";
  productId: string | null;
  product: { id: string; name: string; slug: string } | null;
  eventTitle: string | null;
  eventDescription: string | null;
  eventReferenceImageUrl: string | null;
  bannerAspect: MarketingBannerAspect;
  /** HTTPS image used as Pollinations reference when regenerating (product packshot or event upload). */
  primaryProductImageUrl: string | null;
  imagePrompt: string | null;
  imageUrl: string | null;
  bannerImagePrompt: string | null;
  bannerImageUrl: string | null;
  imageRefinementPrompt: string | null;
  /** Storefront product URL (product campaigns). */
  productPageUrl: string | null;
  /** Landing URL for CTAs. */
  redirectUrl: string | null;
  platforms: string[] | null;
  status: string;
};

type SocialStatus = {
  facebook: { connected: boolean; pageName?: string };
  instagram: { connected: boolean };
};

function hashtagsFromPostText(text: string): string[] {
  const m = text.match(/#[\w\u0900-\u0FFF]+/g);
  return m ? [...new Set(m.map((t) => t.replace(/^#/, "")))] : [];
}

export function CampaignDetailClient({ initial }: { initial: CampaignDetailDTO }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [postText, setPostText] = useState(initial.postText);
  const [whatsappText, setWhatsappText] = useState(initial.whatsappText?.trim() ?? "");
  const [eventTitle, setEventTitle] = useState(initial.eventTitle ?? "");
  const [eventDescription, setEventDescription] = useState(initial.eventDescription ?? "");
  const [eventReferenceImageUrl, setEventReferenceImageUrl] = useState(
    initial.eventReferenceImageUrl ?? "",
  );
  const [bannerAspect, setBannerAspect] = useState<MarketingBannerAspect>(initial.bannerAspect);
  const [imagePrompt, setImagePrompt] = useState(initial.imagePrompt ?? "");
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [bannerImagePrompt, setBannerImagePrompt] = useState(initial.bannerImagePrompt ?? "");
  const [bannerImageUrl, setBannerImageUrl] = useState(initial.bannerImageUrl ?? "");
  const [imageRefinementPrompt, setImageRefinementPrompt] = useState(
    initial.imageRefinementPrompt ?? "",
  );
  const [productPageUrl, setProductPageUrl] = useState(
    () =>
      initial.productPageUrl?.trim() ||
      (initial.campaignKind === "product" && initial.product?.slug
        ? defaultProductShopUrl(initial.product.slug)
        : ""),
  );
  const [redirectUrl, setRedirectUrl] = useState(
    () =>
      initial.redirectUrl?.trim() ||
      (initial.campaignKind === "event"
        ? defaultStorefrontHomepageUrl()
        : initial.campaignKind === "product" && initial.product?.slug
          ? defaultProductShopUrl(initial.product.slug)
          : ""),
  );
  const [platformFb, setPlatformFb] = useState(
    (initial.platforms ?? []).includes("facebook"),
  );
  const [platformIg, setPlatformIg] = useState(
    (initial.platforms ?? []).includes("instagram"),
  );
  const [platformWa, setPlatformWa] = useState(
    (initial.platforms ?? []).includes("whatsapp"),
  );
  const [waGroupId, setWaGroupId] = useState<number | "">("");
  const [social, setSocial] = useState<SocialStatus | null>(null);
  const [waGroups, setWaGroups] = useState<Array<{ id: number; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [bannerPreviewFailed, setBannerPreviewFailed] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [regeneratingBanner, setRegeneratingBanner] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadingEventImage, setUploadingEventImage] = useState(false);

  const loadMeta = useCallback(async () => {
    const r = await fetch("/api/admin/marketing/social/status");
    const j = (await r.json()) as { success?: boolean; data?: SocialStatus };
    if (j.success && j.data) setSocial(j.data);
    const rg = await fetch("/api/admin/marketing/whatsapp/groups");
    const gj = (await rg.json()) as {
      success?: boolean;
      data?: { groups: Array<{ id: number; name: string }> };
    };
    if (gj.success && gj.data?.groups) setWaGroups(gj.data.groups);
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    setImagePreviewFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    setBannerPreviewFailed(false);
  }, [bannerImageUrl]);

  const referenceForAi =
    initial.campaignKind === "event"
      ? (eventReferenceImageUrl.trim() || initial.primaryProductImageUrl)
      : initial.primaryProductImageUrl;

  function selectedPlatforms(): ("facebook" | "instagram" | "whatsapp")[] {
    const p: ("facebook" | "instagram" | "whatsapp")[] = [];
    if (platformFb) p.push("facebook");
    if (platformIg) p.push("instagram");
    if (platformWa) p.push("whatsapp");
    return p;
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/marketing/campaigns/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          postText,
          whatsappText: whatsappText.trim() || null,
          campaignKind: initial.campaignKind,
          productId: initial.campaignKind === "product" ? initial.productId : null,
          eventTitle: initial.campaignKind === "event" ? eventTitle.trim() || null : null,
          eventDescription:
            initial.campaignKind === "event" ? eventDescription.trim() || null : null,
          eventReferenceImageUrl:
            initial.campaignKind === "event"
              ? eventReferenceImageUrl.trim() || null
              : null,
          bannerAspect,
          imageRefinementPrompt: imageRefinementPrompt.trim() || null,
          imagePrompt: imagePrompt || null,
          imageUrl: imageUrl || null,
          bannerImagePrompt: bannerImagePrompt || null,
          bannerImageUrl: bannerImageUrl || null,
          productPageUrl: initial.campaignKind === "product" ? productPageUrl.trim() || null : null,
          redirectUrl: redirectUrl.trim() || null,
          platforms: selectedPlatforms().length ? selectedPlatforms() : ["facebook"],
        }),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) {
        setError(j.error ?? "Save failed");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    const saved = await save();
    if (!saved) return;
    setPublishing(true);
    setError(null);
    try {
      const body: {
        platforms: ("facebook" | "instagram" | "whatsapp")[];
        whatsappCloudGroupId?: number;
      } = { platforms: selectedPlatforms().length ? selectedPlatforms() : ["whatsapp"] };
      if (typeof waGroupId === "number" && platformWa) body.whatsappCloudGroupId = waGroupId;
      const r = await fetch(`/api/admin/marketing/campaigns/${initial.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) {
        setError(j.error ?? "Publish failed");
        return;
      }
      router.push("/admin/marketing?published=1");
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  async function regenImage() {
    setError(null);
    setRegeneratingImage(true);
    try {
      const r = await fetch("/api/admin/marketing/image-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: (imagePrompt || "organic products").trim(),
          refinementPrompt: imageRefinementPrompt.trim() || undefined,
          width: 1080,
          height: 1080,
          seed: Math.floor(Math.random() * 1e9),
          referenceImageUrl: referenceForAi,
        }),
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { imageUrl?: string };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data?.imageUrl) {
        setError(j.error ?? "Could not build image URL");
        return;
      }
      setImageUrl(j.data.imageUrl);
    } finally {
      setRegeneratingImage(false);
    }
  }

  async function regenBanner() {
    if (!bannerImagePrompt.trim()) return;
    setError(null);
    setRegeneratingBanner(true);
    try {
      const { width, height } = bannerDimensionsForAspect(bannerAspect);
      const r = await fetch("/api/admin/marketing/image-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: bannerImagePrompt.trim(),
          refinementPrompt: imageRefinementPrompt.trim() || undefined,
          width,
          height,
          seed: Math.floor(Math.random() * 1e9),
          referenceImageUrl: referenceForAi,
        }),
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { imageUrl?: string };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data?.imageUrl) {
        setError(j.error ?? "Could not build banner URL");
        return;
      }
      setBannerImageUrl(j.data.imageUrl);
    } finally {
      setRegeneratingBanner(false);
    }
  }

  const cloudConfigured = isWhatsAppCloudConfigured();
  const previewHashtags = hashtagsFromPostText(postText);

  return (
    <div className="min-w-0 max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">Edit campaign</h1>
          <p className="text-sm text-text-secondary">
            {BRAND_NAME} ·{" "}
            <span className="capitalize">{initial.campaignKind === "event" ? "event" : "product"}</span> · status:{" "}
            <span className="capitalize">{initial.status}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            className="gap-2 font-semibold shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
            onClick={() => setPreviewOpen(true)}
          >
            Preview · Instagram &amp; Facebook
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/marketing">Back</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {initial.campaignKind === "product" ? (
            initial.product ? (
              <p className="text-sm text-text-secondary">
                Product:{" "}
                <Link
                  href={`/admin/products/${initial.product.id}/edit`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {initial.product.name}
                </Link>
                {initial.primaryProductImageUrl ? (
                  <span className="text-xs"> · packshot available for AI reference</span>
                ) : null}
              </p>
            ) : initial.productId ? (
              <p className="text-xs text-amber-800">Linked product was removed or is unavailable.</p>
            ) : (
              <p className="text-xs text-text-secondary">Product campaign (no product link on file).</p>
            )
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
              <p className="text-sm font-medium text-text-secondary">Event / announcement</p>
              <div className="space-y-2">
                <label htmlFor="evt-title" className="text-sm font-medium">
                  Event title
                </label>
                <Input
                  id="evt-title"
                  value={eventTitle}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEventTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="evt-desc" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="evt-desc"
                  value={eventDescription}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEventDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Optional reference image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="text-sm"
                  disabled={uploadingEventImage}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    void (async () => {
                      setUploadingEventImage(true);
                      setError(null);
                      try {
                        const fd = new FormData();
                        fd.set("file", f);
                        const res = await fetch("/api/admin/marketing/event-image", {
                          method: "POST",
                          body: fd,
                        });
                        const j = (await res.json()) as {
                          success?: boolean;
                          data?: { url?: string };
                          error?: string;
                        };
                        if (!res.ok || !j.success || !j.data?.url?.startsWith("https://")) {
                          setError(j.error ?? "Upload failed");
                          return;
                        }
                        setEventReferenceImageUrl(j.data.url);
                      } finally {
                        setUploadingEventImage(false);
                      }
                    })();
                  }}
                />
                {uploadingEventImage ? <p className="text-xs text-text-secondary">Uploading…</p> : null}
                {eventReferenceImageUrl ? (
                  <p className="text-xs text-text-secondary">
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => setEventReferenceImageUrl("")}
                    >
                      Remove reference
                    </button>
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <label htmlFor="evt-redirect-d" className="text-sm font-medium">
                  Redirect URL <span className="font-normal text-text-secondary">(storefront homepage)</span>
                </label>
                <p className="text-xs text-text-secondary">
                  Landing page for this announcement — usually your site root.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="evt-redirect-d"
                    value={redirectUrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setRedirectUrl(e.target.value)}
                    placeholder={defaultStorefrontHomepageUrl()}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setRedirectUrl(defaultStorefrontHomepageUrl())}
                  >
                    Use homepage
                  </Button>
                </div>
              </div>
            </div>
          )}

          {initial.campaignKind === "product" && initial.product?.slug ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Storefront links
              </p>
              <div className="space-y-2">
                <label htmlFor="mkt-pp-d" className="text-sm font-medium">
                  Product page URL
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="mkt-pp-d"
                    value={productPageUrl}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setProductPageUrl(e.target.value)}
                    placeholder={defaultProductShopUrl(initial.product.slug)}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      const u = defaultProductShopUrl(initial.product!.slug);
                      setProductPageUrl(u);
                      setRedirectUrl((r) => (r.trim() ? r : u));
                    }}
                  >
                    Use /shop/{initial.product.slug}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="mkt-rd-d" className="text-sm font-medium">
                  Redirect URL <span className="font-normal text-text-secondary">(ads / link in bio)</span>
                </label>
                <Input
                  id="mkt-rd-d"
                  value={redirectUrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setRedirectUrl(e.target.value)}
                  placeholder={productPageUrl.trim() || defaultProductShopUrl(initial.product.slug)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="t" className="text-sm font-medium">
              Title
            </label>
            <Input id="t" value={title} onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="p" className="text-sm font-medium">
              Post text
            </label>
            <Textarea
              id="p"
              value={postText}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPostText(e.target.value)}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="wa-d" className="text-sm font-medium">
              WhatsApp message <span className="font-normal text-text-secondary">(optional)</span>
            </label>
            <Textarea
              id="wa-d"
              value={whatsappText}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setWhatsappText(e.target.value)}
              rows={3}
              placeholder="Leave empty to use post text when publishing to WhatsApp."
            />
            <p className="text-xs text-text-secondary">
              Feed image URL and redirect / product links are appended automatically on WhatsApp send (see preview).
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="ip" className="text-sm font-medium">
              Image prompt <span className="font-normal text-text-secondary">(Flux — feed)</span>
            </label>
            <Input
              id="ip"
              value={imagePrompt}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setImagePrompt(e.target.value)}
            />
          </div>
          <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-muted/20 p-4 ring-1 ring-primary/10">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1 space-y-2">
                <label htmlFor="refine-d" className="text-sm font-medium">
                  Visual direction <span className="font-normal text-text-secondary">(optional)</span>
                </label>
                <p className="text-xs leading-relaxed text-text-secondary">
                  Short notes for mood, lighting, or composition — <strong className="text-foreground/90">not</strong>{" "}
                  your main Flux prompt. They are merged in only when you click a regenerate button below (there is no
                  separate &quot;Send&quot;).
                </p>
                <div
                  className="rounded-lg border border-amber-500/25 bg-amber-50/90 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-400/20 dark:bg-amber-950/40 dark:text-amber-50/95"
                  role="note"
                >
                  <strong className="font-semibold">How it works:</strong> each run sends{" "}
                  <em>Flux prompt + visual direction + reference photo</em>. Use{" "}
                  <strong className="font-semibold">Regenerate feed image</strong> or{" "}
                  <strong className="font-semibold">Regenerate banner</strong> after editing prompts or notes.
                </div>
                <Textarea
                  id="refine-d"
                  value={imageRefinementPrompt}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setImageRefinementPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. softer light, cleaner background, richer greens…"
                  className="text-sm"
                />
                <p className="text-[11px] text-text-secondary tabular-nums">
                  {imageRefinementPrompt.length} / 1200 · saved with{" "}
                  <strong className="text-foreground/80">Save changes</strong>
                </p>
                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="default"
                    size="default"
                    className="font-semibold shadow-sm"
                    disabled={regeneratingImage}
                    onClick={() => void regenImage()}
                  >
                    {regeneratingImage ? "Regenerating feed…" : "Regenerate feed image"}
                  </Button>
                  {(bannerImageUrl || bannerImagePrompt) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      className="border-primary/30 font-semibold"
                      disabled={regeneratingBanner || !bannerImagePrompt.trim()}
                      onClick={() => void regenBanner()}
                    >
                      {regeneratingBanner ? "Regenerating banner…" : "Regenerate banner"}
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-text-secondary">
                  Tip: leave visual direction empty to use only the Flux feed line above (and banner Flux in the banner
                  section when applicable).
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Feed image (square)</span>
            <p className="text-xs text-text-secondary">
              Use <strong className="text-foreground/90">Regenerate feed image</strong> in Visual direction above.
            </p>
            <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-lg border border-border bg-muted">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="eager"
                  onError={() => setImagePreviewFailed(true)}
                />
              ) : null}
            </div>
            {imagePreviewFailed ? (
              <p className="text-xs text-amber-900">
                The preview image failed to load. Check server logs for{" "}
                <code className="rounded bg-background px-1">[fetchGenPollinationsImage]</code> /{" "}
                <code className="rounded bg-background px-1">public-image</code>.
              </p>
            ) : null}
          </div>

          {(bannerImageUrl || bannerImagePrompt) && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-4">
              <span className="text-sm font-medium">Banner</span>
              <div className="max-w-md space-y-2">
                <span className="text-xs font-medium">Shape for regenerate</span>
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
              <div
                className={cn(
                  "relative w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-muted",
                  bannerPreviewAspectClass(bannerAspect),
                )}
              >
                {bannerImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bannerImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="eager"
                    onError={() => setBannerPreviewFailed(true)}
                  />
                ) : null}
              </div>
              <Input
                value={bannerImagePrompt}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBannerImagePrompt(e.target.value)}
                placeholder="Banner image prompt"
              />
              <p className="text-xs text-text-secondary">
                Use <strong className="text-foreground/90">Regenerate banner</strong> under Visual direction above
                after changing aspect or the banner Flux line.
              </p>
              {bannerPreviewFailed ? (
                <p className="text-xs text-amber-900">Banner preview failed — check server logs.</p>
              ) : null}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            After you are happy with the content above, choose platforms here. Facebook and Instagram
            require{" "}
            <Link href={ADMIN_SETTINGS_MARKETING_CHANNELS} className="text-primary underline-offset-4 hover:underline">
              Marketing channels
            </Link>{" "}
            to be set up in Settings. Instagram uses the <strong>square</strong> feed image above.
          </p>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={platformFb}
                disabled={!social?.facebook.connected}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPlatformFb(e.target.checked)}
              />
              <span className="text-sm font-normal">
                Facebook{" "}
                {!social?.facebook.connected ? (
                  <span className="text-amber-800">
                    (
                    <Link href={ADMIN_SETTINGS_MARKETING_CHANNELS} className="underline">
                      connect in Settings
                    </Link>
                    )
                  </span>
                ) : null}
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={platformIg}
                disabled={!social?.instagram.connected || !imageUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPlatformIg(e.target.checked)}
              />
              <span className="text-sm font-normal">Instagram {!imageUrl ? "(needs image)" : null}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={platformWa}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPlatformWa(e.target.checked)}
              />
              <span className="text-sm font-normal">WhatsApp share link</span>
            </label>
          </div>
          {cloudConfigured && platformWa && waGroups.length > 0 ? (
            <div className="space-y-2">
              <span className="text-sm font-medium">Optional Cloud group</span>
              <select
                className={selectClassName}
                value={waGroupId === "" ? "__none" : String(waGroupId)}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setWaGroupId(e.target.value === "__none" ? "" : Number.parseInt(e.target.value, 10))
                }
              >
                <option value="__none">Share link only</option>
                {waGroups.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <Button type="button" disabled={publishing} onClick={() => void publish()}>
            {publishing ? "Publishing…" : "Save & publish"}
          </Button>
        </CardContent>
      </Card>

      <MarketingPromotionPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        postText={postText}
        hashtags={previewHashtags}
        whatsappText={whatsappText}
        imageUrl={imageUrl || null}
        bannerImageUrl={bannerImageUrl || null}
        bannerAspect={bannerAspect}
        redirectUrl={redirectUrl.trim() || null}
        productPageUrl={initial.campaignKind === "product" ? productPageUrl.trim() || null : null}
      />
    </div>
  );
}
