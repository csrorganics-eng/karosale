"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Program = {
  enabled: boolean;
  popupBgColor?: string;
  popupTextColor?: string;
  defaultCommissionPercent?: number;
};

export function AffiliateShareButton({
  productSlug,
  productName,
  unitPriceInr,
}: {
  productSlug: string;
  productName: string;
  unitPriceInr: number;
}) {
  const [program, setProgram] = useState<Program | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void fetch("/api/affiliate/program")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setProgram(j.data);
      })
      .catch(() => setProgram({ enabled: false }));
  }, []);

  useEffect(() => {
    void fetch("/api/affiliate/stats")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.affiliate?.status === "active") {
          setUsername(j.data.affiliate.username as string);
        }
      })
      .catch(() => undefined);
  }, []);

  if (!program?.enabled) return null;

  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "";
  const shareUrl =
    username && origin
      ? `${origin}/share/${encodeURIComponent(productSlug)}/${encodeURIComponent(username)}`
      : "";

  const est =
    program.defaultCommissionPercent != null
      ? Math.round(unitPriceInr * (program.defaultCommissionPercent / 100) * 100) / 100
      : null;

  const bg = program.popupBgColor ?? "#2D6A4F";
  const fg = program.popupTextColor ?? "#ffffff";

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="outline"
        className="gap-2 border-primary/30 text-primary"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        {username ? "Share & earn" : "Earn by sharing"}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      <div
        className={cn(
          "mt-3 overflow-hidden rounded-xl border border-border/80 bg-surface p-4 text-sm shadow-[var(--shadow-soft)] transition-all",
          open ? "block" : "hidden",
        )}
      >
        {username ? (
          <div className="space-y-4">
            <p className="text-text-secondary">
              Your link for <strong>{productName}</strong>
              {est != null ? (
                <>
                  {" "}
                  — earn about <strong>₹{est}</strong> per unit sold (estimate).
                </>
              ) : null}
            </p>
            <div
              className="rounded-lg p-4 text-xs break-all"
              style={{ backgroundColor: bg, color: fg }}
            >
              {shareUrl || "Set NEXT_PUBLIC_APP_URL for full share URLs."}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!shareUrl}
                onClick={() => shareUrl && void navigator.clipboard.writeText(shareUrl)}
              >
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy link
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="/account/affiliate/links">Manage links</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-text-secondary">
            <p>Join the affiliate program to get tracked links and earn commissions on referred sales.</p>
            <Button asChild className="w-full">
              <Link href="/account/affiliate/register">Apply as affiliate</Link>
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link href="/account/affiliate">Affiliate dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
