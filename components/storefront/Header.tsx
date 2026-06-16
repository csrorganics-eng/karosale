"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Menu, ShoppingCart, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/storefront/SearchBar";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { cn } from "@/lib/utils";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";
import { CART_UPDATED_EVENT, fetchCartItemCount } from "@/lib/cart-events";

const coreNav = [
  { href: "/shop", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/blog", label: "Journal" },
  { href: "/shop?isOrganic=true", label: "Organic" },
  { href: "/loyalty", label: "Karma Rewards" },
];

export function Header() {
  const { status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);

  /** Account hub is the User icon only (same destination as the old “Account” link). */
  const tailNav =
    status === "authenticated" ? [{ href: "/account/profile", label: "Profile" }] : [];

  const navLinks = [...coreNav, ...tailNav];

  const syncCartBadge = useCallback(() => {
    void fetchCartItemCount().then(setCartItemCount);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    syncCartBadge();
    window.addEventListener(CART_UPDATED_EVENT, syncCartBadge);
    return () => window.removeEventListener(CART_UPDATED_EVENT, syncCartBadge);
  }, [syncCartBadge, status]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ease-premium",
        scrolled
          ? "border-b border-border/50 bg-surface/88 shadow-[var(--shadow-soft)] backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" title={BRAND_NAME}>
          <Image
            src={BRAND_LOGO_PATH}
            alt={BRAND_NAME}
            width={160}
            height={44}
            className="h-9 w-auto max-w-[160px] object-contain object-left"
            priority
          />
        </Link>

        <div className="hidden max-w-md flex-1 px-4 md:block">
          <Suspense fallback={<div className="h-10 w-full rounded-md bg-accent-soft/80" aria-hidden />}>
            <SearchBar />
          </Suspense>
        </div>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text-secondary transition-colors duration-200 ease-premium hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCartOpen(true)}
            aria-label={cartItemCount > 0 ? `Cart, ${cartItemCount} items` : "Cart"}
            className="relative"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/account" aria-label="Account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {mobileOpen && (
        <nav className="border-t border-border/60 bg-surface/98 px-4 py-4 backdrop-blur-md md:hidden">
          <div className="mb-4">
            <Suspense fallback={<div className="h-10 w-full rounded-md bg-accent-soft/80" aria-hidden />}>
              <SearchBar onFullResultsNavigate={() => setMobileOpen(false)} />
            </Suspense>
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-3 text-base font-medium text-text-primary"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
