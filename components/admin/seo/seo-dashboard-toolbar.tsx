"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  siteOrigin: string;
  generatedAtLabel: string;
};

export function SeoDashboardToolbar({ siteOrigin, generatedAtLabel }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  async function copyUrl(path: string, key: string) {
    const url = `${siteOrigin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-4">
      <p className="mr-auto text-xs text-text-secondary tabular-nums">Last scan · {generatedAtLabel}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} aria-hidden />
        Refresh data
      </Button>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void copyUrl("/sitemap.xml", "sm")}>
        {copied === "sm" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        Copy sitemap URL
      </Button>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void copyUrl("/robots.txt", "rb")}>
        {copied === "rb" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        Copy robots URL
      </Button>
    </div>
  );
}
