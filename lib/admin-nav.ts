import type { LucideIcon } from "lucide-react";
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
  SlidersHorizontal,
  Share2,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Single source of truth for admin sidebar + mobile menu. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: ClipboardList },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/admin/karma-rewards", label: "Karma Rewards", icon: Sparkles },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/affiliate", label: "Affiliate", icon: Share2 },
  { href: "/admin/merchandising", label: "Search & A/B", icon: SlidersHorizontal },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** Longest-prefix match so `/admin/orders/…` maps to Orders, not Dashboard. */
export function getAdminSectionTitle(pathname: string | null): string {
  if (!pathname) return "Admin";
  const sorted = [...ADMIN_NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);
  for (const item of sorted) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.label;
    }
  }
  return "Admin";
}
