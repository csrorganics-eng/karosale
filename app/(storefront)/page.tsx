import Link from "next/link";
import { eq, desc, isNull, and } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/lib/db";
import { categories, productImages, products } from "@/lib/db/schema";
import { listActiveBundles } from "@/lib/db/queries/bundles";
import { getPersonalizedPicksWithSources } from "@/lib/db/queries/personalization";
import { enhancePersonalizedPicksWithGemini } from "@/lib/personalization/gemini-picks";
import { tryRefreshUserGeminiProfile } from "@/lib/personalization/gemini-profile";
import { isGeminiConfigured } from "@/lib/gemini";
import { ProductCard } from "@/components/storefront/ProductCard";
import { PersonalizedForYouRail } from "@/components/storefront/PersonalizedForYouRail";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { formatINR, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getHomeData(userId?: string | null) {
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
      promotionalDiscountPct: products.promotionalDiscountPct,
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

  const bundles = await listActiveBundles(4);

  let personalizedPicks: Awaited<ReturnType<typeof getPersonalizedPicksWithSources>> = [];
  if (userId) {
    const base = await getPersonalizedPicksWithSources(userId, 8);
    personalizedPicks = await enhancePersonalizedPicksWithGemini(userId, base);
    if (isGeminiConfigured()) {
      after(() => {
        void tryRefreshUserGeminiProfile(userId).catch(() => {});
      });
    }
  }

  return { cats, bestsellers, bundles, personalizedPicks };
}

export default async function HomePage() {
  const session = await auth();
  const { cats, bestsellers, bundles, personalizedPicks } = await getHomeData(session?.user?.id);

  const firstName = session?.user?.name?.split(/\s+/)[0];

  return (
    <>
      <section className="relative flex min-h-[70vh] items-center overflow-hidden md:min-h-[90vh]">
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage: `radial-gradient(ellipse 85% 65% at 12% 42%, rgb(216 86 42 / 0.09) 0%, transparent 52%),
              radial-gradient(ellipse 75% 55% at 88% 12%, rgb(142 181 160 / 0.35) 0%, transparent 48%),
              radial-gradient(ellipse 100% 80% at 50% 100%, rgb(232 241 236 / 0.9) 0%, transparent 42%)`,
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
          {firstName && (
            <p className="text-base font-medium text-primary">
              Welcome back, {firstName}! 🌿
            </p>
          )}
          <p className="text-xs font-semibold tracking-[0.22em] text-text-secondary uppercase">
            Smart Commerce. Seamless Experience.
          </p>
          <h1 className="font-display mt-5 max-w-3xl text-balance text-4xl leading-[1.08] font-bold tracking-tight text-text-primary md:text-6xl lg:text-7xl">
            Nature&apos;s Best,
            <br />
            Delivered Fresh
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
            Certified organic seeds, fertilizers &amp; groceries. Shipped across India.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button size="lg" variant="warm" asChild>
              <Link href="/shop">Shop Now</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/shop">Our Story</Link>
            </Button>
          </div>
          <p className="mt-8 inline-flex rounded-full border border-accent-warm/25 bg-accent-warm-muted/80 px-5 py-2 text-sm font-medium text-text-primary shadow-sm backdrop-blur-sm">
            Free shipping above ₹499
          </p>
        </div>
      </section>

      {session?.user?.id && personalizedPicks.length > 0 && (
        <PersonalizedForYouRail firstName={firstName} picks={personalizedPicks} />
      )}

      <section
        className={cn(
          "border-y border-border/60 bg-surface py-7",
          personalizedPicks.length > 0 && "mt-8 md:mt-10",
        )}
      >
        <div className="mx-auto flex max-w-7xl gap-10 overflow-x-auto px-4 text-xs font-medium tracking-widest text-text-secondary whitespace-nowrap uppercase sm:gap-14 sm:px-6">
          <span>100% Organic Certified</span>
          <span>Pan-India Delivery</span>
          <span>Easy Returns</span>
          <span>4.8 ★ from 2000+ customers</span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-text-primary md:text-4xl">
          Shop by Category
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className="group flex flex-col items-center rounded-[length:var(--radius-card)] border border-border/70 bg-surface p-6 text-center shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-300 ease-premium hover:-translate-y-1 hover:border-primary/25 hover:shadow-[var(--shadow-medium)]"
            >
              <span className="text-4xl transition-transform duration-300 ease-premium group-hover:scale-110">
                {cat.icon ?? "🌱"}
              </span>
              <span className="mt-3 font-medium text-text-primary">{cat.name}</span>
              <span className="mt-1 text-xs text-text-secondary">{cat.productCount} products</span>
            </Link>
          ))}
        </div>
        {cats.length === 0 && (
          <p className="text-text-secondary">Categories coming soon. Run the seed script to populate data.</p>
        )}
      </section>

      {bundles.length > 0 && (
        <section className="border-y border-border/60 bg-surface-subtle py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
              Curated bundles
            </h2>
            <p className="mt-1 text-sm text-text-secondary">Save more when you shop curated sets.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {bundles.map(({ bundle: b }) => (
                <Link
                  key={b.id}
                  href={`/bundles/${b.slug}`}
                  className="rounded-[length:var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-medium)]"
                >
                  <p className="font-semibold text-text-primary">{b.name}</p>
                  <p className="mt-2 font-mono text-lg text-primary">{formatINR(parseFloat(b.price))}</p>
                  <p className="mt-2 text-xs text-primary">View bundle →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-surface-subtle py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text-primary md:text-4xl">
            Our Bestsellers
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
        <div className="relative overflow-hidden rounded-[length:var(--radius-card)] border border-white/10 bg-gradient-to-br from-primary via-[#1a4032] to-[#0f241c] px-8 py-14 text-center shadow-[var(--shadow-medium)] md:px-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 0%, rgb(216 86 42 / 0.45) 0%, transparent 50%)",
            }}
          />
          <div className="relative text-primary-foreground">
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Monsoon Special
            </h2>
            <p className="mt-3 max-w-lg mx-auto text-sm leading-relaxed opacity-90 md:text-base">
              20% off all seeds this week — use code SAVE10
            </p>
            <Button
              className="mt-8 border border-white/20 bg-surface text-primary shadow-[var(--shadow-soft)] hover:bg-accent-soft hover:text-text-primary"
              asChild
            >
              <Link href="/shop">Shop Seeds</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
