import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { seoTranslations } from "@/lib/seo/translations";

export const metadata: Metadata = {
  title: "Page not found",
  description: "We could not find that page. Browse the shop or return home.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-primary">404</p>
      <h1 className="font-display mt-2 text-3xl font-bold text-text-primary">Page not found</h1>
      <p className="mt-3 text-sm text-text-secondary">
        The link may be broken or the product may have moved. Try the shop or go back home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/shop">{seoTranslations.en.shopTitle}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
