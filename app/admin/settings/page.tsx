import Link from "next/link";
import { Megaphone, LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_SETTINGS_MARKETING_CHANNELS, ADMIN_SETTINGS_SEO } from "@/lib/admin-marketing-routes";

export default function AdminSettingsPage() {
  return (
    <div className="min-w-0 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">
          Store configuration, marketing integrations, and SEO discoverability — each area has a single home so you
          never hunt for controls.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-4xl">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base">SEO &amp; discoverability</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Live health score, catalog gaps, env checklist, and one-click links to sitemaps and the live storefront.
            </p>
          </CardHeader>
          <CardContent>
            <Link
              href={ADMIN_SETTINGS_SEO}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open SEO workspace →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base">Marketing channels</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Facebook, Instagram, and optional WhatsApp Cloud API — used when you publish from Marketing campaigns.
            </p>
          </CardHeader>
          <CardContent>
            <Link
              href={ADMIN_SETTINGS_MARKETING_CHANNELS}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Configure Meta &amp; WhatsApp →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
