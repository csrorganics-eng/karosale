import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateSettings } from "@/lib/db/schema";
import type { AffiliateSettingsRow } from "@/lib/affiliate/types";

export async function getAffiliateSettings(): Promise<AffiliateSettingsRow | null> {
  try {
    const [row] = await db.select().from(affiliateSettings).orderBy(desc(affiliateSettings.id)).limit(1);
    return row ?? null;
  } catch (e) {
    console.warn("[affiliate] getAffiliateSettings failed (migration applied?):", e);
    return null;
  }
}
