import Link from "next/link";
import { listProducts } from "@/lib/db/queries/products";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop — Organic Products",
  description: "Browse certified organic seeds, fertilizers, groceries and garden essentials.",
};

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">Shop</h1>
          <p className="mt-1 text-text-secondary">
            Showing {items.length} of {total} products
          </p>
        </div>
        <form className="flex flex-wrap gap-2" action="/shop" method="get">
          <input
            name="q"
            defaultValue={search}
            placeholder="Search products..."
            className="h-10 rounded-[8px] border border-border px-3 text-sm"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="h-10 rounded-[8px] border border-border px-3 text-sm"
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest</option>
            <option value="rating">Best Rated</option>
            <option value="bestsellers">Bestsellers</option>
          </select>
          <Button type="submit">Filter</Button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-16 text-center text-text-secondary">
          No products found.{" "}
          <Link href="/" className="text-primary underline">
            Return home
          </Link>
        </p>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link href={`/shop?page=${page - 1}`}>Previous</Link>
            </Button>
          )}
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link href={`/shop?page=${page + 1}`}>Load More</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
