import Link from "next/link";
import { listProducts } from "@/lib/db/queries/products";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Button } from "@/components/ui/button";
import { buildShopHref } from "@/lib/shop-url";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  if (q) {
    return {
      title: `“${q}” — Search results`,
      description: `Products matching “${q}” at CSR Organics.`,
    };
  }
  return {
    title: "Shop — Organic Products",
    description: "Browse certified organic seeds, fertilizers, groceries and garden essentials.",
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const category = typeof params.category === "string" ? params.category : undefined;
  const search = typeof params.q === "string" ? params.q : undefined;
  const isOrganic = params.isOrganic === "true";
  const inStock = params.inStock === "true";
  const sort =
    typeof params.sort === "string"
      ? (params.sort as "relevance" | "price_asc" | "price_desc" | "newest" | "rating" | "bestsellers")
      : "relevance";

  const { items, total, limit } = await listProducts({
    page,
    limit: 24,
    category,
    search,
    isOrganic,
    inStock,
    sort,
  });

  const totalPages = Math.ceil(total / limit);
  const searchTrimmed = search?.trim();
  const isSearchMode = Boolean(searchTrimmed);

  const linkBase = {
    q: searchTrimmed,
    category,
    sort,
    isOrganic: isOrganic || undefined,
    inStock: inStock || undefined,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {isSearchMode ? (
            <>
              <h1 className="font-display text-3xl font-bold text-text-primary">Search results</h1>
              <p className="mt-1 text-text-secondary">
                <span className="text-text-primary">“{searchTrimmed}”</span>
                {" · "}
                {total === 0 ? (
                  "No products matched."
                ) : (
                  <>
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} product
                    {total === 1 ? "" : "s"}
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-bold text-text-primary">Shop</h1>
              <p className="mt-1 text-text-secondary">
                Showing {items.length} of {total} products
              </p>
            </>
          )}
        </div>
        <form className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" action="/shop" method="get">
          <input
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search products…"
            className="h-10 min-w-0 flex-1 rounded-[8px] border border-border px-3 text-sm"
            aria-label="Search products"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 rounded-[8px] border border-border px-3 text-sm sm:w-44"
            aria-label="Sort order"
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest</option>
            <option value="rating">Best Rated</option>
            <option value="bestsellers">Bestsellers</option>
          </select>
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {isOrganic ? <input type="hidden" name="isOrganic" value="true" /> : null}
          {inStock ? <input type="hidden" name="inStock" value="true" /> : null}
          <Button type="submit" className="sm:shrink-0">
            Apply
          </Button>
        </form>
      </div>

      {isSearchMode && total > 0 && (
        <p className="mt-4 text-sm text-text-secondary">
          Tip: use filters in the bar above, or{" "}
          <Link href={buildShopHref({ sort, category, isOrganic: isOrganic || undefined, inStock: inStock || undefined })} className="font-medium text-primary underline">
            clear search
          </Link>{" "}
          to browse the full catalog.
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>

      {items.length === 0 && (
        <div className="mx-auto mt-16 max-w-md rounded-[length:var(--radius-card)] border border-border/80 bg-surface px-6 py-10 text-center shadow-[var(--shadow-soft)]">
          <p className="text-lg font-semibold text-text-primary">
            {isSearchMode ? "No matches for your search" : "No products found"}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {isSearchMode
              ? "Try a shorter keyword, check spelling, or browse categories from the shop."
              : "Adjust filters or return to the home page."}
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {isSearchMode ? (
              <Button asChild variant="default">
                <Link href="/shop">Browse all products</Link>
              </Button>
            ) : null}
            <Button asChild variant={isSearchMode ? "outline" : "default"}>
              <Link href="/">Return home</Link>
            </Button>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link href={buildShopHref({ ...linkBase, page: page - 1 })} rel="prev">
                Previous
              </Link>
            </Button>
          )}
          <span className="px-3 text-sm text-text-secondary">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link href={buildShopHref({ ...linkBase, page: page + 1 })} rel="next">
                Next
              </Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
