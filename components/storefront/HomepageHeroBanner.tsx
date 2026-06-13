import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SiteHomepageBannerPublic } from "@/lib/db/queries/site-homepage-banner";
import { cn } from "@/lib/utils";

type Props = { banner: SiteHomepageBannerPublic };

function BannerShell({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href) return <div className="block">{children}</div>;
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} className="group block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2">
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
    >
      {children}
    </a>
  );
}

/**
 * Optional storefront strip — only mounted when `banner` is returned from DB.
 * Fixed aspect + object-cover avoids CLS; omits entirely when disabled (no spacer).
 */
export function HomepageHeroBanner({ banner }: Props) {
  const alt =
    [banner.headline, banner.subheadline].filter(Boolean).join(" — ") || "Featured announcement";
  const hasCopy = Boolean(banner.headline?.trim() || banner.subheadline?.trim());
  const hasLink = Boolean(banner.linkHref?.trim());

  return (
    <section className="border-b border-border/50 bg-gradient-to-b from-surface-subtle/80 via-background to-background">
      <div className="mx-auto max-w-7xl px-4 pb-2 pt-5 sm:px-6 sm:pt-7">
        <BannerShell href={banner.linkHref}>
          <figure
            className={cn(
              "relative isolate overflow-hidden rounded-2xl border border-border/60",
              "shadow-[0_1px_0_rgb(0_0_0_/0.04),0_18px_44px_-24px_rgb(0_0_0_/0.35)]",
              "ring-1 ring-black/[0.04] dark:ring-white/[0.06]",
              "transition-[transform,box-shadow,border-color] duration-500 ease-premium",
              hasLink &&
                "group-hover:border-primary/20 group-hover:shadow-[0_20px_50px_-28px_rgb(0_0_0_/0.45)]",
            )}
          >
            <div className="relative aspect-[21/9] w-full max-h-[min(42vw,22rem)] min-h-[8.5rem] bg-muted sm:max-h-[min(36vw,20rem)] md:max-h-[min(32vw,19rem)]">
              <Image
                src={banner.imageUrl}
                alt={alt}
                fill
                priority
                unoptimized={banner.imageUrl.startsWith("http://")}
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover object-center"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.42] via-black/[0.05] to-transparent"
                aria-hidden
              />
              {hasCopy ? (
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-7">
                  <div className="max-w-2xl rounded-xl border border-white/10 bg-black/25 px-4 py-3 shadow-inner backdrop-blur-md sm:px-5 sm:py-4">
                    {banner.headline?.trim() ? (
                      <p className="font-display text-lg font-semibold tracking-tight text-white drop-shadow-sm sm:text-xl md:text-2xl">
                        {banner.headline.trim()}
                      </p>
                    ) : null}
                    {banner.subheadline?.trim() ? (
                      <p className="mt-1 text-sm leading-relaxed text-white/90 drop-shadow-sm sm:text-base">
                        {banner.subheadline.trim()}
                      </p>
                    ) : null}
                  </div>
                </figcaption>
              ) : null}
            </div>
          </figure>
        </BannerShell>
      </div>
    </section>
  );
}
