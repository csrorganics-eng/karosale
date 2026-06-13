import { requireRole } from "@/lib/auth";
import { HomepageBannerAdminClient } from "@/components/admin/marketing/homepage-banner-admin-client";

export default async function AdminHomepageBannerPage() {
  await requireRole(["admin"]);
  return (
    <div className="p-6">
      <HomepageBannerAdminClient />
    </div>
  );
}
