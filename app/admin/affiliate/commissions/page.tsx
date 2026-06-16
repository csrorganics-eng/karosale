import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliateCommissions, affiliates } from "@/lib/db/schema";

export default async function AdminAffiliateCommissionsPage() {
  await requireRole(["admin"]);
  const rows = await db
    .select({
      c: affiliateCommissions,
      username: affiliates.username,
    })
    .from(affiliateCommissions)
    .innerJoin(affiliates, eq(affiliateCommissions.affiliateId, affiliates.id))
    .orderBy(desc(affiliateCommissions.createdAt))
    .limit(150);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Commissions</h1>
        <Link href="/admin/affiliate" className="text-sm text-primary hover:underline">
          ← Dashboard
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-text-secondary">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Affiliate</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, username }) => (
              <tr key={c.id} className="border-t border-border/70">
                <td className="px-3 py-2 font-mono text-xs">{c.id}</td>
                <td className="px-3 py-2 font-mono">{username}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.orderId}</td>
                <td className="px-3 py-2">T{c.tierLevel}</td>
                <td className="px-3 py-2 tabular-nums">₹{parseFloat(c.commissionAmount).toFixed(2)}</td>
                <td className="px-3 py-2">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
