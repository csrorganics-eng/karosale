import { requireRole } from "@/lib/auth";
import { SeoSettingsView } from "@/components/admin/seo/seo-settings-view";
import { getSeoAuditReport } from "@/lib/seo/audit-report";
import { getSeoEnvSnapshot } from "@/lib/seo/env-snapshot";

export const dynamic = "force-dynamic";

export default async function AdminSeoSettingsPage() {
  await requireRole(["admin"]);
  const [report, env] = await Promise.all([getSeoAuditReport(), Promise.resolve(getSeoEnvSnapshot())]);

  return <SeoSettingsView report={report} env={env} />;
}
