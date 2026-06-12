"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Heart, MessageCircle, MoreHorizontal, Share2, ThumbsUp } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import {
  type MarketingBannerAspect,
  bannerPreviewAspectClass,
} from "@/lib/marketing/banner-aspect";
import {
  appendDestinationUrlsToCaption,
  composeWhatsAppMarketingMessage,
} from "@/lib/marketing/marketing-message-composition";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MarketingPromotionPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  brandName?: string;
  postText: string;
  hashtags: string[];
  /** WhatsApp-specific copy; when empty, post text is used as the base (same as publish). */
  whatsappText?: string;
  imageUrl?: string | null;
  bannerImageUrl?: string | null;
  bannerAspect?: MarketingBannerAspect;
  redirectUrl?: string | null;
  productPageUrl?: string | null;
};

type PlatformTab = "instagram" | "facebook";

export function MarketingPromotionPreviewModal({
  open,
  onClose,
  brandName = BRAND_NAME,
  postText,
  hashtags,
  whatsappText,
  imageUrl,
  bannerImageUrl,
  bannerAspect = "16:9",
  redirectUrl,
  productPageUrl,
}: MarketingPromotionPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<PlatformTab>("instagram");

  useEffect(() => {
    setMounted(true);
  }, []);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    },
    [open, onClose],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onKey]);

  if (!mounted || !open) return null;

  const hashtagLine = hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  const bannerAspectClass = bannerPreviewAspectClass(bannerAspect);
  const timeLabel = "Just now";

  const metaCaption = appendDestinationUrlsToCaption(postText, { redirectUrl, productPageUrl });
  const waBase = (whatsappText?.trim() || postText).trim();
  const whatsappComposed = composeWhatsAppMarketingMessage({
    body: waBase,
    imageUrl,
    redirectUrl,
    productPageUrl,
  });

  const tabBtn = (id: PlatformTab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        "relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
        tab === id
          ? "bg-foreground text-background shadow-sm"
          : "text-text-secondary hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="marketing-preview-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px]"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-[101] flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10",
          "bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 text-zinc-100 shadow-2xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="marketing-preview-title" className="text-sm font-semibold tracking-tight text-white">
              Social preview
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Simulated layouts — final Meta / Instagram rendering may differ slightly.
            </p>
            <p className="mt-2 max-w-md text-[11px] leading-relaxed text-zinc-500">
              <span className="font-semibold text-zinc-300">Links</span> — Storefront URLs are appended to the{" "}
              <span className="text-zinc-300">caption</span> below (tappable on phones). Organic feed images are not
              custom hyperlinks; use Meta Ads or Shopping tags for image-level destinations.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-zinc-300 hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            Close
          </Button>
        </div>

        <div className="border-b border-white/10 px-5 py-3">
          <div className="inline-flex rounded-full bg-zinc-800/80 p-0.5 ring-1 ring-white/10">
            {tabBtn("instagram", "Instagram")}
            {tabBtn("facebook", "Facebook")}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-950/50 px-4 py-6 sm:px-6">
          {tab === "instagram" ? (
            <div className="mx-auto flex max-w-[340px] flex-col items-center">
              <div className="w-full rounded-[2.4rem] border-[10px] border-zinc-800 bg-zinc-900 p-1 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.85)]">
                <div className="overflow-hidden rounded-[1.85rem] bg-black">
                  <div className="flex items-center gap-3 border-b border-white/5 bg-black px-3 py-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-bold text-white ring-2 ring-white/20">
                      {brandName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-white">{brandName}</p>
                      <p className="text-[11px] text-zinc-500">{timeLabel}</p>
                    </div>
                    <MoreHorizontal className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
                  </div>
                  {imageUrl ? (
                    <div className="w-full bg-zinc-950">
                      <div className="aspect-square w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <p className="border-t border-white/5 bg-black px-3 py-1.5 text-[10px] text-zinc-500">
                        Image preview — tap-to-open URL is not applied to the image in organic posts.
                      </p>
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-zinc-900 text-xs text-zinc-500">
                      No feed image
                    </div>
                  )}
                  <div className="space-y-2 border-t border-white/5 bg-black px-3 py-3">
                    <div className="flex items-center gap-4 text-zinc-100">
                      <Heart className="h-6 w-6" strokeWidth={1.6} />
                      <MessageCircle className="h-6 w-6" strokeWidth={1.6} />
                      <Share2 className="h-6 w-6" strokeWidth={1.6} />
                    </div>
                    <p className="text-[13px] leading-snug text-zinc-100">
                      <span className="font-semibold">{brandName}</span>{" "}
                      <span className="whitespace-pre-wrap text-zinc-200">{metaCaption}</span>
                    </p>
                    {hashtagLine ? (
                      <p className="text-[12px] leading-relaxed text-sky-400/90">{hashtagLine}</p>
                    ) : null}
                  </div>
                </div>
              </div>
              {bannerImageUrl ? (
                <div className="mt-6 w-full space-y-2">
                  <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {redirectUrl?.trim() || productPageUrl?.trim()
                      ? "Banner + URL (Stories / link sticker style)"
                      : "Story / link preview (banner crop)"}
                  </p>
                  <div
                    className={cn(
                      "mx-auto w-full max-w-[280px] overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-lg",
                      bannerAspect === "9:16" ? "aspect-[9/16]" : bannerAspectClass,
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={bannerImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  {redirectUrl?.trim() || productPageUrl?.trim() ? (
                    <p className="mx-auto max-w-[280px] text-center text-[10px] leading-relaxed text-zinc-500">
                      URL in caption appears as tappable text below the feed; Stories often use a link sticker
                      pointing here.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mx-auto max-w-md">
              <div className="overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900 shadow-xl ring-1 ring-black/40">
                <div className="flex items-start gap-3 border-b border-zinc-800 bg-[#242526] px-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877f2] text-sm font-bold text-white">
                    {brandName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-[#e4e6eb]">{brandName}</p>
                    <p className="text-xs text-[#b0b3b8]">
                      {timeLabel} · <span className="text-[#b0b3b8]">Public</span>
                    </p>
                  </div>
                </div>
                <div className="bg-[#18191a] px-3 pb-2 pt-2">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#e4e6eb]">{metaCaption}</p>
                  {hashtagLine ? (
                    <p className="mt-2 text-[14px] leading-relaxed text-[#8ab4ff]">{hashtagLine}</p>
                  ) : null}
                </div>
                {imageUrl ? (
                  <div className="border-y border-black/40 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" className="max-h-[420px] w-full object-cover" loading="lazy" />
                    <p className="border-t border-black/40 bg-[#18191a] px-3 py-1.5 text-[10px] text-[#8a8d91]">
                      Feed image — custom tap URL is not attached to the image in organic posts.
                    </p>
                  </div>
                ) : null}
                <div className="flex items-center justify-around border-t border-zinc-800 bg-[#242526] px-2 py-1.5 text-[#b0b3b8]">
                  <span className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[13px] font-medium hover:bg-white/5">
                    <ThumbsUp className="h-[18px] w-[18px]" />
                    Like
                  </span>
                  <span className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[13px] font-medium hover:bg-white/5">
                    <MessageCircle className="h-[18px] w-[18px]" />
                    Comment
                  </span>
                  <span className="flex flex-1 items-center justify-center gap-1.5 py-2 text-[13px] font-medium hover:bg-white/5">
                    <Share2 className="h-[18px] w-[18px]" />
                    Share
                  </span>
                </div>
              </div>
              {bannerImageUrl ? (
                <div className="mt-6 space-y-2">
                  <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {redirectUrl?.trim() || productPageUrl?.trim()
                      ? "Link preview card (Facebook)"
                      : "Link share image (banner)"}
                  </p>
                  {redirectUrl?.trim() || productPageUrl?.trim() ? (
                    <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-md">
                      <div className="flex gap-3 border-b border-zinc-800 bg-zinc-900/90 p-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={bannerImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[#e4e6eb]">{brandName}</p>
                          <p className="mt-1 line-clamp-2 break-all text-[12px] leading-snug text-[#b0b3b8]">
                            {redirectUrl?.trim() || productPageUrl?.trim()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-md",
                        bannerAspectClass,
                        "max-h-56 w-full",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bannerImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          <div className="mx-auto mt-8 max-w-md rounded-xl border border-emerald-500/20 bg-emerald-950/40 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">WhatsApp</p>
            <p className="mt-1 text-[11px] leading-relaxed text-emerald-200/80">
              <span className="font-medium text-emerald-100/95">What gets sent:</span> your WhatsApp message (or post
              text if empty) plus the feed image URL and shop links below — same as Cloud API publish. WhatsApp sends
              one <span className="italic">text</span> bubble; the image line is a tappable link (not embedded media)
              unless you upgrade the integration to image messages.
            </p>
            {imageUrl ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-emerald-500/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="max-h-40 w-full object-cover" loading="lazy" />
              </div>
            ) : null}
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-emerald-50/95">{whatsappComposed}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
