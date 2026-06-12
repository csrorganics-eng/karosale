import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getSocialStatusSummary } from "@/lib/marketing/social-token-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isWhatsAppCloudConfigured } from "@/lib/marketing/whatsapp-publisher";
import { ADMIN_SETTINGS_MARKETING_CHANNELS_FB_START } from "@/lib/admin-marketing-routes";

type Search = { success?: string; error?: string };

export default async function MarketingChannelsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await requireRole(["admin"]);
  const sp = await searchParams;
  const social = await getSocialStatusSummary(session.user.id);
  const cloud = isWhatsAppCloudConfigured();

  return (
    <div className="min-w-0 max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-text-secondary">
          <Link href="/admin/settings" className="text-primary underline-offset-4 hover:underline">
            Settings
          </Link>
          <span className="mx-1.5 text-muted-foreground">/</span>
          <span className="text-foreground">Marketing channels</span>
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">Marketing channels</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Connect Facebook and Instagram for publishing, and optionally WhatsApp Cloud API. Create and
          review campaigns under{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href="/admin/marketing">
            Marketing
          </Link>{" "}
          first, then publish when ready.
        </p>
      </div>

      {sp.success ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          Facebook connected successfully. You can{" "}
          <Link className="underline" href="/admin/marketing/new">
            create a campaign
          </Link>{" "}
          or return to{" "}
          <Link className="underline" href="/admin/marketing">
            Marketing
          </Link>
          .
        </p>
      ) : null}
      {sp.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {sp.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facebook &amp; Instagram</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-text-secondary">
            {social.facebook.connected ? (
              <>
                Connected to <strong>{social.facebook.pageName ?? "your Page"}</strong>. Instagram:{" "}
                {social.instagram.connected ? "linked ✓" : "not linked to this Page yet."}
              </>
            ) : (
              "Connect your Facebook account to publish to your Facebook Page and linked Instagram Business account in one step."
            )}
          </p>

          {!social.facebook.connected ? (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-text-secondary">
              <p className="font-medium text-foreground">Setup required (one-time)</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Create a free Facebook App at developers.facebook.com</li>
                <li>Add &quot;Facebook Login&quot; and &quot;Instagram Graph API&quot; products</li>
                <li>
                  Add your redirect URI:{" "}
                  <code className="break-all rounded bg-background px-1">
                    {process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
                      process.env.AUTH_URL?.replace(/\/$/, "") ||
                      "(set NEXT_PUBLIC_APP_URL)"}
                    /api/admin/marketing/social/connect/facebook/callback
                  </code>
                </li>
                <li>Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in your environment</li>
                <li>
                  For production: submit for App Review (pages_manage_posts, instagram_content_publish).
                  Development mode works for your own accounts immediately.
                </li>
              </ol>
            </div>
          ) : null}

          <Button asChild>
            <a href={ADMIN_SETTINGS_MARKETING_CHANNELS_FB_START}>Connect Facebook account</a>
          </Button>
          <p className="text-xs text-text-secondary">
            Permissions: pages_manage_posts, instagram_content_publish, pages_read_engagement,
            business_management. In Development mode, only app admins and test users can connect.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-secondary">
          <p>
            <strong className="text-foreground">Share links</strong> — Always available with no setup.
            Every campaign can open WhatsApp with a pre-filled message via a wa.me link (free, works on
            mobile and desktop).
          </p>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
            <p className="font-medium text-foreground">Optional: WhatsApp Business Cloud API</p>
            <p className="mt-1">
              Automated bulk sending is a paid Meta product (marketing templates are not free). Configure{" "}
              <code className="rounded bg-background px-1">WHATSAPP_PHONE_NUMBER_ID</code> and{" "}
              <code className="rounded bg-background px-1">WHATSAPP_ACCESS_TOKEN</code> only if you intend
              to use Cloud sends; otherwise rely on share links only.
            </p>
            <p className="mt-2">
              Status:{" "}
              <strong className="text-foreground">
                {cloud ? "Cloud API env vars present" : "Not configured (share links active)"}
              </strong>
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin/settings">Back to Settings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
