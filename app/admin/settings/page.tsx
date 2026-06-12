import Link from "next/link";
import { Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_SETTINGS_MARKETING_CHANNELS } from "@/lib/admin-marketing-routes";

export default function AdminSettingsPage() {
  return (
    <div className="min-w-0 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="mt-2 text-text-secondary">Store, shipping, notifications, integrations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" aria-hidden />
              <CardTitle className="text-base">Marketing channels</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Facebook, Instagram, and optional WhatsApp Cloud API — used when you publish from
              Marketing campaigns.
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
