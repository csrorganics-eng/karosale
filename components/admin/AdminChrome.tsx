"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";
import { ADMIN_NAV_ITEMS, getAdminSectionTitle } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function NavLinks({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string | null;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={cn("space-y-1", className)}>
      {ADMIN_NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-white/15 font-medium text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = getAdminSectionTitle(pathname);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen max-w-[100vw] overflow-x-hidden bg-background">
      <aside className="hidden w-60 shrink-0 flex-col bg-[var(--admin-sidebar)] text-white md:flex">
        <div className="border-b border-white/10 p-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2" title={BRAND_NAME}>
            <Image
              src={BRAND_LOGO_PATH}
              alt={BRAND_NAME}
              width={140}
              height={40}
              className="h-8 w-auto max-w-[140px] object-contain object-left brightness-0 invert"
            />
          </Link>
          <p className="mt-1 text-xs text-white/60">Admin</p>
        </div>
        <NavLinks pathname={pathname} className="flex-1 p-4" />
        <div className="border-t border-white/10 p-4">
          <Link href="/" className="text-sm text-white/60 hover:text-white">
            ← Back to store
          </Link>
        </div>
      </aside>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col bg-[var(--admin-sidebar)] text-white shadow-xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <span className="text-sm font-medium text-white/90">Menu</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-white/10 p-3">
              <Link
                href="/"
                className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                ← Back to store
              </Link>
            </div>
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">{title}</p>
            <p className="truncate text-xs text-text-secondary md:hidden">{BRAND_NAME}</p>
          </div>
          <Link
            href="/"
            className="hidden shrink-0 text-sm text-primary hover:underline sm:inline md:hidden"
          >
            Store
          </Link>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
