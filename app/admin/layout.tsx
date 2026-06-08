import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  ClipboardList,
  Sparkles,
  Megaphone,
  BarChart3,
  MessageSquareText,
} from "lucide-react";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: ClipboardList },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/admin/karma-rewards", label: "Karma Rewards", icon: Sparkles },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
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
        <nav className="flex-1 space-y-1 p-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <Link href="/" className="text-sm text-white/60 hover:text-white">
            ← Back to store
          </Link>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border bg-surface px-6">
          <p className="text-sm font-medium text-text-secondary md:hidden">{BRAND_NAME} Admin</p>
        </header>
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
