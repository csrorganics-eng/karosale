"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "bestseller", label: "Bestsellers" },
];

export function FilterSidebar() {
  const router = useRouter();
  const params = useSearchParams();
  const category = params.get("category") ?? "";
  const organic = params.get("isOrganic") === "true";
  const sort = params.get("sort") ?? "newest";

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/shop?${next.toString()}`);
  }

  return (
    <aside className="space-y-6 rounded-[length:var(--radius-card)] border border-border bg-surface p-4">
      <div>
        <h3 className="text-sm font-semibold">Sort</h3>
        <select
          className="mt-2 w-full rounded-[8px] border border-border px-3 py-2 text-sm"
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={organic}
          onChange={(e) => update("isOrganic", e.target.checked ? "true" : null)}
        />
        Organic certified only
      </label>
      {category && (
        <p className="text-xs text-text-secondary">
          Category: <strong>{category}</strong>
        </p>
      )}
    </aside>
  );
}
