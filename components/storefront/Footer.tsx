import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO_PATH, BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-border/60 bg-surface-subtle">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2" title={BRAND_NAME}>
              <Image
                src={BRAND_LOGO_PATH}
                alt={BRAND_NAME}
                width={180}
                height={48}
                className="h-10 w-auto max-w-[200px] object-contain object-left"
              />
            </Link>
            <p className="mt-2 max-w-sm text-sm text-text-secondary">
              Smart Commerce. Seamless Experience. Certified organic products delivered across India.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold tracking-widest text-text-secondary uppercase">Shop</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>
                <Link href="/shop" className="transition-colors duration-200 ease-premium hover:text-primary">
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/shop?isOrganic=true"
                  className="transition-colors duration-200 ease-premium hover:text-primary"
                >
                  Organic Certified
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="transition-colors duration-200 ease-premium hover:text-primary">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold tracking-widest text-text-secondary uppercase">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>
                <Link href="/orders" className="transition-colors duration-200 ease-premium hover:text-primary">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/account" className="transition-colors duration-200 ease-premium hover:text-primary">
                  My Account
                </Link>
              </li>
              <li>
                <Link
                  href="/account/profile"
                  className="transition-colors duration-200 ease-premium hover:text-primary"
                >
                  Profile & addresses
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${BRAND_SUPPORT_EMAIL}`}
                  className="transition-colors duration-200 ease-premium hover:text-primary"
                >
                  {BRAND_SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-8 text-center text-xs text-text-secondary">
          © {new Date().getFullYear()} {BRAND_NAME}. Organic. Natural. Trusted.
        </p>
      </div>
    </footer>
  );
}
