import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isGeminiConfigured } from "@/lib/gemini";
import { rerankProductIdsByQuery } from "@/lib/search/semantic-rerank";
import type { PersonalizedPick } from "@/lib/db/queries/personalization";

export async function enhancePersonalizedPicksWithGemini(
  userId: string,
  picks: PersonalizedPick[],
): Promise<PersonalizedPick[]> {
  if (picks.length < 2 || !isGeminiConfigured()) return picks;

  const [row] = await db
    .select({ profile: users.geminiPersonalizationProfile })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const prof = row?.profile as { summary?: string } | null | undefined;
  const summary = typeof prof?.summary === "string" ? prof.summary.trim() : "";
  if (!summary) return picks;

  const candidates = picks.map((p) => ({
    id: p.card.id,
    name: p.card.name,
    shortDescription: null as string | null,
  }));
  try {
    const orderedIds = await rerankProductIdsByQuery(
      `Personalized recommendations. Shopper profile: ${summary}`,
      candidates,
    );
    const map = new Map(picks.map((p) => [p.card.id, p]));
    const out = orderedIds.map((id) => map.get(id)).filter(Boolean) as PersonalizedPick[];
    return out.length > 0 ? out : picks;
  } catch {
    return picks;
  }
}
