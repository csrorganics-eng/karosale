import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function AdminAffiliateReportsPage() {
  await requireRole(["admin"]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Affiliate reports</h1>
        <Link href="/admin/affiliate" className="text-sm text-primary hover:underline">
          ← Dashboard
        </Link>
      </div>
      <p className="text-sm text-text-secondary">
        Export CSV and multi-month rollups can be added next. Commission and payout data are available from the
        Commissions and Payouts screens for now.
      </p>
    </div>
  );
}
