import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliatePayouts, affiliates, users } from "@/lib/db/schema";

export default async function AdminAffiliatePayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const status = sp.status?.trim();

  const rows = await db
    .select({
      p: affiliatePayouts,
      username: affiliates.username,
      email: users.email,
    })
    .from(affiliatePayouts)
    .innerJoin(affiliates, eq(affiliatePayouts.affiliateId, affiliates.id))
    .innerJoin(users, eq(affiliates.userId, users.id))
    .where(status ? eq(affiliatePayouts.status, status) : sql`true`)
    .orderBy(desc(affiliatePayouts.requestedAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Payouts</h1>
        <Link href="/admin/affiliate" className="text-sm text-primary hover:underline">
          ← Dashboard
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-text-secondary">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Affiliate</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Method</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, username, email }) => (
              <tr key={p.id} className="border-t border-border/70">
                <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                <td className="px-3 py-2">
                  <div className="font-mono">{username}</div>
                  <div className="text-xs text-text-secondary">{email}</div>
                </td>
                <td className="px-3 py-2 tabular-nums">₹{parseFloat(p.requestedAmount).toFixed(2)}</td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">{p.payoutMethod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
