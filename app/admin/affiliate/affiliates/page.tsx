import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { AffiliateAdminActions } from "@/components/admin/AffiliateAdminActions";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliates, users } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
] as const;

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const status = sp.status?.trim();

  const rows = await db
    .select({
      affiliate: affiliates,
      user: { name: users.name, email: users.email },
    })
    .from(affiliates)
    .innerJoin(users, eq(affiliates.userId, users.id))
    .where(status ? eq(affiliates.status, status) : sql`true`)
    .orderBy(desc(affiliates.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Affiliates</h1>
        <Link href="/admin/affiliate" className="text-sm text-primary hover:underline">
          ← Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const href =
            tab.value === "" ? "/admin/affiliate/affiliates" : `/admin/affiliate/affiliates?status=${tab.value}`;
          const active = (status ?? "") === tab.value;
          return (
            <Link
              key={tab.value || "all"}
              href={href}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-text-secondary hover:border-primary/40",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-text-secondary">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Wallet</th>
              <th className="px-3 py-2">Earned</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ affiliate, user }) => (
              <tr key={affiliate.id} className="border-t border-border/70 align-top">
                <td className="px-3 py-2">
                  <div className="font-medium">{user.name ?? "—"}</div>
                  <div className="text-xs text-text-secondary">{user.email}</div>
                </td>
                <td className="px-3 py-2 font-mono">{affiliate.username}</td>
                <td className="px-3 py-2 capitalize">{affiliate.status}</td>
                <td className="px-3 py-2 tabular-nums">₹{parseFloat(affiliate.walletBalance).toFixed(2)}</td>
                <td className="px-3 py-2 tabular-nums">₹{parseFloat(affiliate.totalEarned).toFixed(2)}</td>
                <td className="px-3 py-2">
                  <AffiliateAdminActions affiliateId={affiliate.id} status={affiliate.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
