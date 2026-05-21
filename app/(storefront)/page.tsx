import Link from "next/link";
import { eq, desc, isNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, productImages, products } from "@/lib/db/schema";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function getHomeData() {
  const cats = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.sortOrder)
    .limit(6);

  const bestsellers = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      comparePrice: products.comparePrice,
      stockQty: products.stockQty,
      lowStockThreshold: products.lowStockThreshold,
      isOrganicCertified: products.isOrganicCertified,
      isBestseller: products.isBestseller,
      avgRating: products.avgRating,
      reviewCount: products.reviewCount,
      imageUrl: productImages.url,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)),
    )
    .where(
      and(eq(products.isActive, true), isNull(products.deletedAt), eq(products.isBestseller, true)),
    )
    .orderBy(desc(products.totalSales))
    .limit(8);

  return { cats, bestsellers };
}

export default async function HomePage() {
  const { cats, bestsellers } = await getHomeData();

  return (
    <>
      <section className="relative flex min-h-[70vh] items-center overflow-hidden md:min-h-[90vh]">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, var(--accent) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, var(--primary-light) 0%, transparent 40%)`,
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Smart Commerce. Seamless Experience.
          </p>
          <h1 className="font-display mt-4 max-w-3xl text-4xl font-black leading-tight text-text-primary md:text-6xl lg:text-7xl">
            Nature&apos;s Best,
            <br />
            Delivered Fresh
          </h1>
          <p className="mt-6 max-w-xl text-lg text-text-secondary">
            Certified organic seeds, fertilizers &amp; groceries. Shipped across India.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button size="lg" asChild>
              <Link href="/shop">Shop Now</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/shop">Our Story</Link>
            </Button>
          </div>
          <p className="mt-6 inline-flex rounded-[24px] bg-accent px-4 py-2 text-sm font-medium text-text-primary">
            Free shipping above ₹499
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-surface py-6">
        <div className="mx-auto flex max-w-7xl gap-8 overflow-x-auto px-4 text-sm whitespace-nowrap text-text-secondary sm:px-6">
          <span>🌿 100% Organic Certified</span>
          <span>🚚 Pan-India Delivery</span>
          <span>↩️ Easy Returns</span>
          <span>⭐ 4.8 Rated by 2000+ customers</span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-bold text-text-primary">Shop by Category</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className="flex flex-col items-center rounded-[14px] border border-border bg-surface p-6 text-center shadow-[var(--shadow-soft)] transition-transform hover:scale-105"
            >
              <span className="text-4xl">{cat.icon ?? "🌱"}</span>
              <span className="mt-3 font-medium text-text-primary">{cat.name}</span>
              <span className="mt-1 text-xs text-text-secondary">{cat.productCount} products</span>
            </Link>
          ))}
        </div>
        {cats.length === 0 && (
          <p className="text-text-secondary">Categories coming soon. Run the seed script to populate data.</p>
        )}
      </section>

      <section className="bg-surface-subtle py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-text-primary">Our Bestsellers</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
          {bestsellers.length === 0 && (
            <div className="mt-8 text-center">
              <p className="text-text-secondary">No products yet.</p>
              <Button className="mt-4" asChild>
                <Link href="/shop">Browse Shop</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="rounded-[14px] bg-primary px-8 py-12 text-center text-white md:px-16">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Monsoon Special</h2>
          <p className="mt-2 opacity-90">20% off all seeds this week — use code SAVE10</p>
          <Button className="mt-6 bg-white text-primary hover:bg-accent-soft" asChild>
            <Link href="/shop">Shop Seeds</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
