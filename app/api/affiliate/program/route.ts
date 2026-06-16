import { db } from "@/lib/db";
import { affiliateSettings } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { jsonOk } from "@/lib/api-response";

/** Public read-only program flags for storefront UI (no secrets). */
export async function GET() {
  try {
    const [s] = await db.select().from(affiliateSettings).orderBy(asc(affiliateSettings.id)).limit(1);
    if (!s) return jsonOk({ enabled: false });
    return jsonOk({
      enabled: s.isEnabled,
      popupEnabled: s.popupEnabled,
      popupBgColor: s.popupBgColor,
      popupTextColor: s.popupTextColor,
      defaultCommissionPercent: parseFloat(String(s.defaultCommissionValue)),
    });
  } catch {
    return jsonOk({ enabled: false });
  }
}
