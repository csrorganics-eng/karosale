"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatINR, cn } from "@/lib/utils";
import { buildShopHref } from "@/lib/shop-url";
import { InCartSearchHint, InCartSearchThumbDot } from "@/components/storefront/in-cart-product-markers";

interface SearchHit {
  id: string;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
}

const TYPEAHEAD_MIN = 2;
const DEBOUNCE_MS = 280;

export function SearchBar({
  className,
  onFullResultsNavigate,
}: {
  className?: string;
  onFullResultsNavigate?: () => void;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearch = useSearchParams();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === "/shop") {
      const urlQ = urlSearch.get("q");
      if (urlQ != null) setQ(urlQ);
    }
  }, [pathname, urlSearch]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < TYPEAHEAD_MIN) {
      setResults([]);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(term)}`, {
          signal: ac.signal,
        });
        const json = (await res.json()) as { success?: boolean; data?: { results?: unknown } };
        if (!json.success) {
          setResults([]);
        } else {
          const raw = json.data?.results;
          const list = Array.isArray(raw) ? raw : [];
          setResults(
            list.map((p) => ({
              id: String((p as SearchHit).id ?? ""),
              name: String((p as SearchHit).name ?? ""),
              slug: String((p as SearchHit).slug ?? ""),
              price: String((p as SearchHit).price ?? "0"),
              imageUrl: (p as SearchHit).imageUrl ?? null,
            })),
          );
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setResults([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [q]);

  const goToFullResults = useCallback(() => {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    onFullResultsNavigate?.();
    router.push(buildShopHref({ q: term, sort: "relevance" }));
  }, [q, router, onFullResultsNavigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const trimmed = q.trim();
  const showPanel = open && trimmed.length >= TYPEAHEAD_MIN;

  return (
    <div ref={wrapRef} className={cn("relative", className)} role="search">
      <form
        className="relative flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          goToFullResults();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
          <Input
            name="q"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const term = q.trim();
              if (!term) return;
              e.preventDefault();
              goToFullResults();
            }}
            placeholder="Search products…"
            className="pl-9 pr-2"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={showPanel}
            aria-controls={showPanel ? listId : undefined}
            enterKeyHint="search"
          />
        </div>
        <Button type="submit" size="icon" className="shrink-0" aria-label="See results on Shop">
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      {showPanel && (
        <div
          id={listId}
          className="absolute z-50 mt-1 max-h-[min(70vh,24rem)] w-full overflow-y-auto rounded-[length:var(--radius-card)] border border-border/80 bg-surface shadow-[var(--shadow-float)] ring-1 ring-black/[0.03]"
          role="listbox"
        >
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Searching…
            </div>
          )}

          {!loading &&
            results.map((p) => (
              <Link
                key={p.id}
                href={`/shop/${p.slug}`}
                role="option"
                className="flex items-center gap-3 border-b border-border/50 px-3 py-2.5 last:border-0 transition-colors duration-200 ease-premium hover:bg-accent-soft"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-accent-soft">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-text-secondary">
                      —
                    </div>
                  )}
                  <InCartSearchThumbDot productId={p.id} />
                </div>
                <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{p.name}</span>
                <div className="flex shrink-0 flex-col items-end justify-center gap-1">
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {formatINR(parseFloat(p.price))}
                  </span>
                  <InCartSearchHint productId={p.id} />
                </div>
              </Link>
            ))}

          {!loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-text-secondary">No quick matches. Try full shop search.</p>
          )}

          <div className="sticky bottom-0 border-t border-border/80 bg-surface p-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-full text-sm font-semibold"
              onClick={() => goToFullResults()}
            >
              View all results on Shop
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
