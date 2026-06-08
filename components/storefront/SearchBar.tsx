"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/utils";

interface SearchHit {
  id: string;
  name: string;
  slug: string;
  price: string;
  imageUrl: string | null;
}

export function SearchBar({ className }: { className?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (json.success) setResults(json.data.results ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 300);
    return () => clearTimeout(t);
  }, [q, search]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search products..."
          className="pl-9"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-[length:var(--radius-card)] border border-border/80 bg-surface shadow-[var(--shadow-float)] ring-1 ring-black/[0.03]">
          {results.map((p) => (
            <Link
              key={p.id}
              href={`/shop/${p.slug}`}
              className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0 transition-colors duration-200 ease-premium hover:bg-accent-soft"
            >
              <span className="flex-1 text-sm font-medium">{p.name}</span>
              <span className="text-sm text-primary">{formatINR(parseFloat(p.price))}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
