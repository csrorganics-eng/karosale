import { redirect } from "next/navigation";
import { ADMIN_SETTINGS_MARKETING_CHANNELS } from "@/lib/admin-marketing-routes";

/** Legacy URL — channel setup now lives under Settings. */
export default function MarketingConnectLegacyRedirect() {
  redirect(ADMIN_SETTINGS_MARKETING_CHANNELS);
}
