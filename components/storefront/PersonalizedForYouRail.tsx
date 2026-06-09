import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Button } from "@/components/ui/button";
import type { PersonalizedPick } from "@/lib/db/queries/personalization";
import { cn } from "@/lib/utils";

export function PersonalizedForYouRail({
  firstName,
  picks,
}: {
  firstName?: string | null;
  picks: PersonalizedPick[];
}) {
  if (picks.length === 0) return null;

  const hasRecent = picks.some((p) => p.source === "recent");
  const hasAffinity = picks.some((p) => p.source === "affinity");

  const sub =
    hasRecent && hasAffinity
      ? "A blend of what you’ve browsed and categories from your orders — ready to add to cart."
      : hasRecent
        ? "Jump back into products you were exploring."
        : "Discover more from the aisles you already shop.";

  const title = firstName
    ? `Hand-picked for you, ${firstName}`
    : "Hand-picked for you";

  return (
    <section
      className="relative z-20 mx-auto max-w-7xl px-4 pb-1 sm:px-6 md:-mt-14 md:pb-2"
      aria-labelledby="personalized-heading"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.35rem] border border-primary/10",
          "bg-gradient-to-br from-surface via-[#f4faf6] to-[#e8f0ec]",
          "shadow-[0_28px_90px_-28px_rgba(15,36,28,0.42),0_0_0_1px_rgba(30,77,58,0.06)_inset]",
        )}
      >
        <div
          className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full opacity-50"
          style={{
            background: "radial-gradient(circle at center, rgb(216 86 42 / 0.08), transparent 68%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full opacity-60"
          style={{
            background: "radial-gradient(circle at center, rgb(30 77 58 / 0.14), transparent 70%)",
          }}
        />

        <div className="relative px-5 pb-8 pt-7 md:px-10 md:pb-10 md:pt-9">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-8">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Your edit
              </p>
              <h2
                id="personalized-heading"
                className="font-display mt-2 text-balance text-2xl font-bold tracking-tight text-text-primary md:text-[1.75rem] md:leading-snug lg:text-3xl"
              >
                {title}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary md:text-[0.9375rem]">
                {sub}
              </p>
            </div>
            <Button
              variant="outline"
              size="default"
              className="h-11 shrink-0 self-start border-primary/25 bg-surface/90 px-5 text-sm font-semibold shadow-sm backdrop-blur-sm transition-colors hover:bg-accent-soft md:self-auto"
              asChild
            >
              <Link href="/shop" className="inline-flex items-center gap-2">
                Full catalog
                <ArrowUpRight className="h-4 w-4 opacity-80" aria-hidden />
              </Link>
            </Button>
          </div>

          <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] md:grid md:snap-none md:grid-cols-2 md:overflow-visible lg:grid-cols-4 lg:gap-5">
            {picks.map(({ card, source }) => (
              <div
                key={card.id}
                className="w-[min(42vw,16.5rem)] shrink-0 snap-start md:w-auto md:min-w-0"
              >
                <div className="relative">
                  {source === "recent" ? (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-soft)]">
                      Recently viewed
                    </span>
                  ) : (
                    <span className="absolute left-2 top-2 z-10 rounded-full border border-primary/15 bg-surface/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary shadow-sm backdrop-blur-sm">
                      Inspired by you
                    </span>
                  )}
                  <ProductCard {...card} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
