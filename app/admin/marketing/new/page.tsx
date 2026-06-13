"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { isWhatsAppCloudConfigured } from "@/lib/marketing/whatsapp-publisher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ADMIN_MARKETING_HOMEPAGE_BANNER,
  ADMIN_SETTINGS_MARKETING_CHANNELS,
} from "@/lib/admin-marketing-routes";
import { MarketingPromotionPreviewModal } from "@/components/admin/marketing/marketing-promotion-preview-modal";
import {
  defaultProductShopUrl,
  defaultStorefrontHomepageUrl,
} from "@/lib/marketing/storefront-links";

const selectClassName = cn(
  "flex h-10 w-full rounded-[length:var(--radius-input)] border border-border/90 bg-surface px-3 py-2 text-sm text-text-primary shadow-sm transition-[border-color,box-shadow] duration-200 ease-premium focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50",
);

type CatalogProduct = { id: string; name: string; slug: string; sku: string };

type Step = 1 | 2 | 3;

type SocialStatus = {
  facebook: { connected: boolean; pageName?: string };
  instagram: { connected: boolean };
  whatsapp: { cloudConfigured: boolean };
};

export default function NewMarketingCampaignPage() {
  return (
    <Suspense
      fallback={
        <div className="min-w-0 max-w-4xl p-6">
          <p className="text-sm text-text-secondary">Loading campaign builder…</p>
        </div>
      }
    >
      <NewMarketingCampaignContent />
    </Suspense>
  );
}

function NewMarketingCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [campaignId, setCampaignId] = useState<number | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  /** Primary packshot HTTPS URL for Pollinations reference (must be publicly reachable). */
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string | null>(null);

  const [campaignKind, setCampaignKind] = useState<"product" | "event">("product");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventReferenceImageUrl, setEventReferenceImageUrl] = useState<string | null>(null);
  const [uploadingEventImage, setUploadingEventImage] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [campaignGoal, setCampaignGoal] = useState<
    "sale" | "launch" | "awareness" | "seasonal" | "custom"
  >("sale");
  const [tone, setTone] = useState<"professional" | "friendly" | "festive" | "urgent">("friendly");
  const [language, setLanguage] = useState<"english" | "hindi" | "hinglish">("hinglish");
  const [customInstructions, setCustomInstructions] = useState("");

  const [postText, setPostText] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [whatsappText, setWhatsappText] = useState("");
  /** Merged into Flux on regenerate + saved on campaign; optional “improve image” notes. */
  const [imageRefinementPrompt, setImageRefinementPrompt] = useState("");
  /** Storefront product page (product campaigns). */
  const [productPageUrl, setProductPageUrl] = useState("");
  /** Link-in-bio / ad landing: homepage for events, product or tracking URL for products. */
  const [redirectUrl, setRedirectUrl] = useState("");

  /** Exact lines passed into Flux for controlled on-image typography (from AI or manual). */
  const [onImagePrimary, setOnImagePrimary] = useState("");
  const [onImageSecondary, setOnImageSecondary] = useState("");

  const [platformFb, setPlatformFb] = useState(true);
  const [platformIg, setPlatformIg] = useState(true);
  const [platformWa, setPlatformWa] = useState(true);
  const [waGroupId, setWaGroupId] = useState<number | "">("");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [social, setSocial] = useState<SocialStatus | null>(null);
  const [waGroups, setWaGroups] = useState<Array<{ id: number; name: string }>>([]);

  const loadMeta = useCallback(async () => {
    const r = await fetch("/api/admin/marketing/social/status");
    const j = (await r.json()) as { success?: boolean; data?: SocialStatus };
    if (j.success && j.data) setSocial(j.data);
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    setImagePreviewFailed(false);
  }, [imageUrl]);

  const hydrateProductSelection = useCallback(async (productId: string) => {
    setSelectedProductId(productId);
    setPrimaryImageUrl(null);
    try {
      const r = await fetch(`/api/admin/products/${productId}`);
      const j = (await r.json()) as {
        success?: boolean;
        data?: {
          images?: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
        };
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

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/products");
        const j = (await r.json()) as {
          success?: boolean;
          data?: { products: CatalogProduct[] };
        };
        if (j.success && j.data?.products) setCatalog(j.data.products);
      } catch {
        /* ignore */
      } finally {
        setCatalogLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (campaignKind !== "product") return;
    const pid = searchParams.get("productId");
    if (!pid || !catalogLoaded) return;
    if (!/^[0-9a-f-]{36}$/i.test(pid)) return;
    void hydrateProductSelection(pid);
  }, [searchParams, catalogLoaded, hydrateProductSelection, campaignKind]);

  useEffect(() => {
    if (step !== 3) return;
    void (async () => {
      const r = await fetch("/api/admin/marketing/whatsapp/groups");
      const j = (await r.json()) as {
        success?: boolean;
        data?: { groups: Array<{ id: number; name: string }> };
      };
      if (j.success && j.data?.groups) setWaGroups(j.data.groups);
    })();
  }, [step]);

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const shared = {
        campaignGoal,
        tone,
        language,
        customInstructions: customInstructions.trim() || undefined,
        includeBanner: false,
        imageRefinementPrompt: imageRefinementPrompt.trim() || undefined,
      };
      const body =
        campaignKind === "product"
          ? { kind: "product" as const, productId: selectedProductId, ...shared }
          : {
              kind: "event" as const,
              eventTitle: eventTitle.trim(),
              eventDescription: eventDescription.trim(),
              eventReferenceImageUrl: eventReferenceImageUrl || undefined,
              ...shared,
            };
      const r = await fetch("/api/admin/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          eventReferenceImageUrl?: string | null;
          postText: string;
          hashtags: string[];
          imagePrompt: string;
          imageUrl: string;
          whatsappText: string;
          feedImageHeadline?: string;
          feedImageSubline?: string;
        };
      };
      if (!r.ok || !j.success || !j.data) {
        setError(j.error ?? "Generation failed");
        return;
      }
      setPostText(j.data.postText);
      setHashtags(j.data.hashtags ?? []);
      setImagePrompt(j.data.imagePrompt);
      setImageUrl(j.data.imageUrl);
      setWhatsappText(j.data.whatsappText);
      setOnImagePrimary(j.data.feedImageHeadline?.trim() ?? "");
      setOnImageSecondary(j.data.feedImageSubline?.trim() ?? "");
      if (campaignKind === "event" && j.data.eventReferenceImageUrl !== undefined) {
        setEventReferenceImageUrl(j.data.eventReferenceImageUrl);
      }
      setStep(2);
    } finally {
      setGenerating(false);
    }
  }

  async function regenerateImage() {
    setError(null);
    setRegeneratingImage(true);
    try {
      const ref = campaignKind === "product" ? primaryImageUrl : eventReferenceImageUrl;
      const r = await fetch("/api/admin/marketing/image-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: imagePrompt.trim() || "organic natural products",
          refinementPrompt: imageRefinementPrompt.trim() || undefined,
          width: 1080,
          height: 1080,
          seed: Math.floor(Math.random() * 1_000_000_000),
          referenceImageUrl: ref,
          exactOverlayPrimary: onImagePrimary.trim() || null,
          exactOverlaySecondary: onImageSecondary.trim() || null,
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

  function selectedPlatforms(): ("facebook" | "instagram" | "whatsapp")[] {
    const p: ("facebook" | "instagram" | "whatsapp")[] = [];
    if (platformFb) p.push("facebook");
    if (platformIg) p.push("instagram");
    if (platformWa) p.push("whatsapp");
    return p;
  }

  async function saveDraft(): Promise<number | null> {
    setSaving(true);
    setError(null);
    try {
      const linkedName = catalog.find((p) => p.id === selectedProductId)?.name?.trim() ?? "";
      const title =
        campaignKind === "event"
          ? eventTitle.trim() ||
            postText.slice(0, 48).trim() ||
            `Event ${new Date().toLocaleDateString()}`
          : linkedName ||
            postText.slice(0, 48).trim() ||
            `Campaign ${new Date().toLocaleDateString()}`;
      const body = {
        title,
        postText,
        whatsappText: whatsappText.trim() || undefined,
        campaignKind,
        productId: campaignKind === "product" ? selectedProductId ?? undefined : null,
        eventTitle: campaignKind === "event" ? eventTitle.trim() : undefined,
        eventDescription: campaignKind === "event" ? eventDescription.trim() : undefined,
        eventReferenceImageUrl:
          campaignKind === "event" ? eventReferenceImageUrl ?? undefined : undefined,
        imagePrompt: imagePrompt || undefined,
        imageUrl: imageUrl || undefined,
        imageRefinementPrompt: imageRefinementPrompt.trim() || undefined,
        platforms: selectedPlatforms().length ? selectedPlatforms() : ["facebook"],
        productPageUrl: campaignKind === "product" ? productPageUrl.trim() || undefined : undefined,
        redirectUrl: redirectUrl.trim() || undefined,
      };
      if (campaignId) {
        const r = await fetch(`/api/admin/marketing/campaigns/${campaignId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = (await r.json()) as { success?: boolean; error?: string };
        if (!r.ok || !j.success) {
          setError(j.error ?? "Save failed");
          return null;
        }
        return campaignId;
      }
      const r = await fetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        success?: boolean;
        error?: string;
        data?: { campaign: { id: number } };
      };
      if (!r.ok || !j.success || !j.data?.campaign) {
        setError(j.error ?? "Save failed");
        return null;
      }
      setCampaignId(j.data.campaign.id);
      return j.data.campaign.id;
    } finally {
      setSaving(false);
    }
  }

  async function goPublish() {
    const id = await saveDraft();
    if (id == null) return;
    setStep(3);
  }

  async function publishNow() {
    let id = campaignId;
    if (id == null) {
      id = await saveDraft();
    }
    if (id == null) return;
    setPublishing(true);
    setError(null);
    try {
      const body: {
        platforms: ("facebook" | "instagram" | "whatsapp")[];
        whatsappCloudGroupId?: number;
      } = { platforms: selectedPlatforms().length ? selectedPlatforms() : ["whatsapp"] };
      if (typeof waGroupId === "number" && platformWa) {
        body.whatsappCloudGroupId = waGroupId;
      }
      const r = await fetch(`/api/admin/marketing/campaigns/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) {
        setError(j.error ?? "Publish failed");
        return;
      }
      await loadMeta();
      router.push("/admin/marketing?published=1");
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  const cloudConfigured = isWhatsAppCloudConfigured();

  const filteredCatalog = catalog.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q)
    );
  });

  const selectedProduct = selectedProductId
    ? catalog.find((p) => p.id === selectedProductId) ?? null
    : null;

  return (
    <div className="min-w-0 max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">New campaign</h1>
          <p className="text-sm text-text-secondary">
            AI-assisted content for {BRAND_NAME}. Finish copy and image in steps 1–2, then publish in step
            3. Meta / WhatsApp channel setup lives in{" "}
            <Link href={ADMIN_SETTINGS_MARKETING_CHANNELS} className="text-primary underline-offset-4 hover:underline">
              Settings → Marketing channels
            </Link>
            .
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/marketing">Cancel</Link>
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <StepDot active={step >= 1} label="Generate" />
        <span>—</span>
        <StepDot active={step >= 2} label="Review" />
        <span>—</span>
        <StepDot active={step >= 3} label="Publish" />
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 1 — Campaign type &amp; AI content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Campaign type</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={campaignKind === "product" ? "default" : "outline"}
                  onClick={() => {
                    setCampaignKind("product");
                    setEventReferenceImageUrl(null);
                    setProductPageUrl("");
                    setRedirectUrl("");
                  }}
                >
                  Product
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={campaignKind === "event" ? "default" : "outline"}
                  onClick={() => {
                    setCampaignKind("event");
                    setSelectedProductId(null);
                    setPrimaryImageUrl(null);
                    setProductPageUrl("");
                    setRedirectUrl((prev) => (prev.trim() ? prev : defaultStorefrontHomepageUrl()));
                  }}
                >
                  Event / announcement
                </Button>
              </div>
              <p className="text-xs text-text-secondary">
                Product campaigns use a catalog SKU and packshot. Events use a title, description, and an optional
                reference image for AI. Wide <strong className="text-foreground/90">shop homepage</strong> banners are{" "}
                <Link
                  href={ADMIN_MARKETING_HOMEPAGE_BANNER}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  managed separately
                </Link>
                .
              </p>
            </div>

            {campaignKind === "product" ? (
              <div className="space-y-2">
                <span className="text-sm font-medium">Product</span>
                <p className="text-xs text-text-secondary">
                  Choose the catalog product this campaign promotes. You can also open this page from{" "}
                  <strong>Admin → Products → Edit</strong> via &quot;Marketing&quot;.
                </p>
                <Input
                  value={productSearch}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setProductSearch(e.target.value)}
                  placeholder="Search by name, slug, or SKU…"
                  disabled={!catalogLoaded}
                />
                <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/20">
                  {filteredCatalog.length === 0 ? (
                    <p className="p-3 text-xs text-text-secondary">
                      {catalogLoaded ? "No products match." : "Loading products…"}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border text-sm">
                      {filteredCatalog.slice(0, 80).map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-muted/60",
                              selectedProductId === p.id && "bg-primary/10",
                            )}
                            onClick={() => {
                              void hydrateProductSelection(p.id);
                              const shop = defaultProductShopUrl(p.slug);
                              setProductPageUrl(shop);
                              setRedirectUrl(shop);
                            }}
                          >
                            <span className="font-medium">{p.name}</span>
                            <span className="shrink-0 text-xs text-text-secondary">{p.sku}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {selectedProduct ? (
                  <p className="text-xs text-text-secondary">
                    Selected:{" "}
                    <Link
                      href={`/admin/products/${selectedProduct.id}/edit`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {selectedProduct.name}
                    </Link>
                    {primaryImageUrl ? (
                      <span className="ml-1">· packshot will guide AI images (HTTPS CDN).</span>
                    ) : (
                      <span className="ml-1 text-amber-800">
                        · add an <strong>https</strong> primary image on the product for best results (Pollinations
                        must fetch it publicly).
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-amber-800">Select a product to enable generation.</p>
                )}
                {selectedProduct ? (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Storefront links
                    </p>
                    <div className="space-y-2">
                      <label htmlFor="mkt-product-page" className="text-sm font-medium">
                        Product page URL
                      </label>
                      <p className="text-xs text-text-secondary">
                        Canonical public URL for this SKU (<code className="rounded bg-muted px-1">/shop/…</code>).
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          id="mkt-product-page"
                          value={productPageUrl}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setProductPageUrl(e.target.value)}
                          placeholder={defaultProductShopUrl(selectedProduct.slug)}
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            const u = defaultProductShopUrl(selectedProduct.slug);
                            setProductPageUrl(u);
                            setRedirectUrl((r) => (r.trim() ? r : u));
                          }}
                        >
                          Use /shop/{selectedProduct.slug}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="mkt-redirect" className="text-sm font-medium">
                        Redirect URL <span className="font-normal text-text-secondary">(ads / link in bio)</span>
                      </label>
                      <p className="text-xs text-text-secondary">
                        Often the same as the product page, or a short / UTM link for tracking.
                      </p>
                      <Input
                        id="mkt-redirect"
                        value={redirectUrl}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setRedirectUrl(e.target.value)}
                        placeholder={productPageUrl.trim() || defaultProductShopUrl(selectedProduct.slug)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
                <div className="space-y-2">
                  <label htmlFor="evt-title" className="text-sm font-medium">
                    Event title
                  </label>
                  <Input
                    id="evt-title"
                    value={eventTitle}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEventTitle(e.target.value)}
                    placeholder="e.g. Monsoon sale weekend"
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
                    rows={5}
                    placeholder="What should people know? Dates, offers, location…"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium">Optional reference image</span>
                  <p className="text-xs text-text-secondary">
                    Upload a flyer or mood image (JPEG/PNG/WebP, max 4MB). Stored on your CDN — used as a visual
                    hint for AI, not shown as the final post unless you publish it.
                  </p>
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
                          const r = await fetch("/api/admin/marketing/event-image", {
                            method: "POST",
                            body: fd,
                          });
                          const j = (await r.json()) as {
                            success?: boolean;
                            data?: { url?: string };
                            error?: string;
                          };
                          if (!r.ok || !j.success || !j.data?.url?.startsWith("https://")) {
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
                  {uploadingEventImage ? (
                    <p className="text-xs text-text-secondary">Uploading…</p>
                  ) : null}
                  {eventReferenceImageUrl ? (
                    <p className="text-xs text-text-secondary">
                      Reference set:{" "}
                      <a href={eventReferenceImageUrl} className="break-all text-primary underline" target="_blank" rel="noreferrer">
                        {eventReferenceImageUrl.slice(0, 64)}…
                      </a>{" "}
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() => setEventReferenceImageUrl(null)}
                      >
                        Remove
                      </button>
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2 border-t border-border pt-3">
                  <label htmlFor="evt-redirect" className="text-sm font-medium">
                    Redirect URL <span className="font-normal text-text-secondary">(storefront homepage)</span>
                  </label>
                  <p className="text-xs text-text-secondary">
                    Where ads and &quot;link in bio&quot; should land — defaults to your site root. Matches{" "}
                    <code className="rounded bg-muted px-1">NEXT_PUBLIC_APP_URL</code> when set.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      id="evt-redirect"
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

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <span className="text-sm font-medium">Goal</span>
                <select
                  className={selectClassName}
                  value={campaignGoal}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setCampaignGoal(e.target.value as typeof campaignGoal)
                  }
                >
                  <option value="sale">Sale</option>
                  <option value="launch">Launch</option>
                  <option value="awareness">Awareness</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Tone</span>
                <select
                  className={selectClassName}
                  value={tone}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setTone(e.target.value as typeof tone)}
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="festive">Festive</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Language</span>
                <select
                  className={selectClassName}
                  value={language}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setLanguage(e.target.value as typeof language)
                  }
                >
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="extra" className="text-sm font-medium">
                Extra instructions (optional)
              </label>
              <Textarea
                id="extra"
                value={customInstructions}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCustomInstructions(e.target.value)}
                rows={2}
              />
            </div>
            <Button
              type="button"
              disabled={
                generating ||
                (campaignKind === "product"
                  ? !selectedProductId
                  : !eventTitle.trim() || !eventDescription.trim())
              }
              onClick={() => void generate()}
            >
              {generating ? "Generating…" : "Generate content"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step >= 2 ? (
        <Card className="overflow-hidden border-border/80 shadow-lg ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <CardHeader className="space-y-1 border-b border-border/60 bg-gradient-to-r from-muted/40 via-surface to-muted/30 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Step 2
                </p>
                <CardTitle className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
                  Refine &amp; preview
                </CardTitle>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
                  Edit copy on the left, preview realistic feed layouts on the right.{" "}
                  <strong className="text-foreground">Visual direction</strong> is optional extra guidance for the
                  image model — it is applied only when you press a regenerate button (there is no separate &quot;Send&quot;
                  control).
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                size="default"
                className="shrink-0 gap-2 rounded-xl px-5 font-semibold shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                onClick={() => setPreviewOpen(true)}
              >
                Preview · Instagram &amp; Facebook
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-10 p-6 sm:p-8">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="space-y-8 lg:col-span-7">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-border/80 p-6 shadow-sm",
                    "bg-gradient-to-br from-primary/[0.06] via-surface to-muted/25 ring-1 ring-primary/10",
                  )}
                >
                  <div className="absolute right-4 top-4 opacity-[0.07]">
                    <Sparkles className="h-24 w-24 text-primary" aria-hidden />
                  </div>
                  <div className="relative flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                      <Sparkles className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <label htmlFor="refine-visual" className="text-sm font-semibold text-foreground">
                          Visual direction <span className="font-normal text-text-secondary">(optional)</span>
                        </label>
                        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                          Short notes for mood, lighting, palette, or composition. These are{" "}
                          <strong className="text-foreground/90">not</strong> the main image prompt — they are{" "}
                          <strong className="text-foreground/90">merged in when you regenerate</strong> the feed
                          image (same request as your Flux line below).
                        </p>
                      </div>
                      <div
                        className="rounded-lg border border-amber-500/25 bg-amber-50/90 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-400/20 dark:bg-amber-950/40 dark:text-amber-50/95"
                        role="note"
                      >
                        <strong className="font-semibold">How it works:</strong> there is no &quot;Send&quot; for this
                        box. Write your notes, then click{" "}
                        <strong className="font-semibold">Regenerate feed image</strong> — each run sends{" "}
                        <em>Flux prompt + visual direction + reference photo</em> to the image API.
                      </div>
                      <Textarea
                        id="refine-visual"
                        value={imageRefinementPrompt}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                          setImageRefinementPrompt(e.target.value)
                        }
                        rows={4}
                        placeholder="e.g. softer morning light, more minimal background, terracotta accents, no extra objects near the product…"
                        className="min-h-[100px] resize-y border-border/90 bg-background/80 text-sm shadow-inner"
                      />
                      <p className="text-[11px] text-text-secondary tabular-nums">
                        {imageRefinementPrompt.length} / 1200 characters · also saved with{" "}
                        <strong className="text-foreground/80">Save draft</strong>
                      </p>
                      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
                        <Button
                          type="button"
                          variant="default"
                          size="default"
                          className="w-full font-semibold shadow-sm sm:w-auto"
                          disabled={regeneratingImage}
                          onClick={() => void regenerateImage()}
                        >
                          {regeneratingImage ? "Regenerating feed…" : "Regenerate feed image"}
                        </Button>
                      </div>
                      <p className="text-[11px] leading-relaxed text-text-secondary">
                        Tip: empty visual direction is fine — then only the Flux lines below are used.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="post" className="text-sm font-semibold">
                    Post caption
                  </label>
                  <Textarea
                    id="post"
                    value={postText}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPostText(e.target.value)}
                    rows={5}
                    className="border-border/90 text-sm leading-relaxed shadow-sm"
                  />
                  <p className="text-xs text-text-secondary tabular-nums">{postText.length} / 5000 characters</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="wa" className="text-sm font-semibold">
                    WhatsApp message
                  </label>
                  <Textarea
                    id="wa"
                    value={whatsappText}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setWhatsappText(e.target.value)}
                    rows={3}
                    className="border-border/90 text-sm shadow-sm"
                  />
                  <p className="text-xs text-text-secondary">
                    Saved with your draft. If empty at publish, post caption is used. The feed image URL and redirect /
                    product links are <strong className="text-foreground/90">appended automatically</strong> for
                    WhatsApp (see preview).
                  </p>
                </div>

                {hashtags.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Hashtags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {hashtags.map((h: string) => (
                        <Badge key={h} variant="secondary" className="rounded-md px-2.5 py-0.5 font-normal">
                          {h.startsWith("#") ? h : `#${h}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="imgp" className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      Flux — feed image
                    </label>
                    <Input
                      id="imgp"
                      value={imagePrompt}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setImagePrompt(e.target.value)}
                      className="font-mono text-xs shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="onimg1"
                      className="text-xs font-semibold uppercase tracking-wide text-text-secondary"
                    >
                      On-image line 1 <span className="font-normal">(optional)</span>
                    </label>
                    <Input
                      id="onimg1"
                      value={onImagePrimary}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setOnImagePrimary(e.target.value)}
                      placeholder="e.g. Monsoon harvest sale"
                      maxLength={52}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="onimg2"
                      className="text-xs font-semibold uppercase tracking-wide text-text-secondary"
                    >
                      On-image line 2 <span className="font-normal">(optional)</span>
                    </label>
                    <Input
                      id="onimg2"
                      value={onImageSecondary}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setOnImageSecondary(e.target.value)}
                      placeholder="e.g. Free shipping over ₹499"
                      maxLength={80}
                      className="text-sm"
                    />
                  </div>
                </div>

                {campaignKind === "product" && selectedProductId ? (
                  <p className="text-xs text-text-secondary">
                    Linked product:{" "}
                    <Link
                      href={`/admin/products/${selectedProductId}/edit`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {catalog.find((p) => p.id === selectedProductId)?.name ?? "View product"}
                    </Link>
                  </p>
                ) : campaignKind === "event" ? (
                  <p className="text-xs text-text-secondary">
                    Event · <span className="font-medium text-foreground">{eventTitle || "—"}</span>
                  </p>
                ) : null}
              </div>

              <div className="space-y-6 lg:col-span-5">
                <div className="rounded-2xl border border-border/90 bg-muted/15 p-5 shadow-inner ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Feed image</p>
                    <p className="text-xs leading-relaxed text-text-secondary">
                      Regenerate from <strong className="text-foreground/90">Visual direction</strong> on the left —
                      includes Flux feed line, your notes, and the reference photo. Optional{" "}
                      <strong className="text-foreground/90">On-image lines</strong> below are sent as exact copy for
                      premium text panels (edit spelling before regenerating).
                    </p>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl border border-border/80 bg-background shadow-md ring-1 ring-black/5">
                    <div className="relative aspect-square w-full max-w-sm mx-auto bg-muted">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="eager"
                          onError={() => setImagePreviewFailed(true)}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-text-secondary">
                          No image URL
                        </div>
                      )}
                    </div>
                  </div>
                  {imagePreviewFailed ? (
                    <p className="mt-3 text-xs text-amber-900 dark:text-amber-200/90">
                      Preview failed to load — check server logs for{" "}
                      <code className="rounded bg-background px-1">public-image</code> / Pollinations.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <hr className="border-border/60" />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" disabled={saving} onClick={() => void saveDraft()}>
                {saving ? "Saving…" : "Save draft"}
              </Button>
              <Button type="button" disabled={saving} onClick={() => void goPublish()}>
                Continue to publish
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 3 — Publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-secondary">
              Publishing uses the channels configured in{" "}
              <Link href={ADMIN_SETTINGS_MARKETING_CHANNELS} className="text-primary underline-offset-4 hover:underline">
                Settings → Marketing channels
              </Link>
              .
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
                  Facebook
                  {!social?.facebook.connected ? (
                    <span className="ml-1 text-xs text-amber-700">
                      —{" "}
                      <Link href={ADMIN_SETTINGS_MARKETING_CHANNELS} className="underline">
                        connect in Settings
                      </Link>
                    </span>
                  ) : (
                    <span className="ml-1 text-xs text-text-secondary">
                      — {social.facebook.pageName ?? "your Page"}
                    </span>
                  )}
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
                <span className="text-sm font-normal">
                  Instagram
                  {!social?.instagram.connected ? (
                    <span className="ml-1 text-xs text-amber-700">
                      —{" "}
                      <Link href={ADMIN_SETTINGS_MARKETING_CHANNELS} className="underline">
                        connect Page + IG in Settings
                      </Link>
                    </span>
                  ) : !imageUrl ? (
                    <span className="ml-1 text-xs text-amber-700">— image required</span>
                  ) : null}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={platformWa}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPlatformWa(e.target.checked)}
                />
                <span className="text-sm font-normal">WhatsApp — share link (always free)</span>
              </label>
            </div>

            {cloudConfigured && platformWa && waGroups.length > 0 ? (
              <div className="space-y-2">
                <span className="text-sm font-medium">Optional Cloud API group</span>
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

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={saving} onClick={() => void saveDraft()}>
                Save draft
              </Button>
              <Button type="button" disabled={publishing} onClick={() => void publishNow()}>
                {publishing ? "Publishing…" : "Publish now"}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/admin/marketing">Exit without publishing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <MarketingPromotionPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        postText={postText}
        hashtags={hashtags}
        whatsappText={whatsappText}
        imageUrl={imageUrl}
        bannerImageUrl={null}
        redirectUrl={redirectUrl.trim() || null}
        productPageUrl={campaignKind === "product" ? productPageUrl.trim() || null : null}
      />
    </div>
  );
}

function StepDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={active ? "font-medium text-foreground" : "text-text-secondary"}>
      <span className={active ? "text-primary" : ""}>●</span> {label}
    </span>
  );
}
