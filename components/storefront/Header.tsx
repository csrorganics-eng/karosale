"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, ShoppingCart, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/storefront/SearchBar";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { cn } from "@/lib/utils";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?isOrganic=true", label: "Organic" },
  { href: "/loyalty", label: "Karma Rewards" },
  { href: "/account", label: "Account" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

        <div className="hidden max-w-xs flex-1 px-4 md:block">
          <SearchBar />
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
          <Button variant="ghost" size="icon" onClick={() => setCartOpen(true)} aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex" asChild>
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
