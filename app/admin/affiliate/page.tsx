import Link from "next/link";
import { count, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { affiliateCommissions, affiliatePayouts, affiliates } from "@/lib/db/schema";

export default async function AdminAffiliateDashboardPage() {
  await requireRole(["admin"]);

  const [aTotal] = await db.select({ c: count() }).from(affiliates);
  const [aActive] = await db
    .select({ c: count() })
    .from(affiliates)
    .where(eq(affiliates.status, "active"));
  const [aPending] = await db
    .select({ c: count() })
    .from(affiliates)
    .where(eq(affiliates.status, "pending"));

  const [sumApproved] = await db
    .select({ s: sql<string>`coalesce(sum(${affiliateCommissions.commissionAmount})::text,'0')` })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.status, "approved"));

  const [sumPending] = await db
    .select({ s: sql<string>`coalesce(sum(${affiliateCommissions.commissionAmount})::text,'0')` })
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.status, "pending"));

  const [payoutQ] = await db
    .select({ c: count() })
    .from(affiliatePayouts)
    .where(eq(affiliatePayouts.status, "requested"));

  const nav = [
    { href: "/admin/affiliate/affiliates", label: "Affiliates" },
    { href: "/admin/affiliate/commissions", label: "Commissions" },
    { href: "/admin/affiliate/payouts", label: "Payouts" },
    { href: "/admin/affiliate/reports", label: "Reports" },
    { href: "/admin/affiliate/settings", label: "Settings" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Affiliate program</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Tracking, commissions, and payouts — wired to checkout, Inngest, and Razorpay payout webhooks.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {nav.map((n) => (
          <Button key={n.href} variant="outline" size="sm" asChild>
            <Link href={n.href}>{n.label}</Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Affiliates</CardTitle>
            <CardDescription>Active / pending</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold tabular-nums">{aTotal?.c ?? 0}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {aActive?.c ?? 0} active · {aPending?.c ?? 0} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Commissions</CardTitle>
            <CardDescription>Approved / pending INR</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-bold tabular-nums">
              ₹{parseFloat(sumApproved?.s ?? "0").toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Pending: ₹{parseFloat(sumPending?.s ?? "0").toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payout queue</CardTitle>
            <CardDescription>Requested</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-bold tabular-nums">{payoutQ?.c ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Operator shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button size="sm" variant="secondary" asChild>
              <Link href="/admin/affiliate/affiliates?status=pending">Review pending affiliates</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/affiliate/payouts?status=requested">Review payout requests</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
