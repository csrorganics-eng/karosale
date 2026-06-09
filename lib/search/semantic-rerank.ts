import { geminiGenerateContent, isGeminiConfigured, parseJsonFromModelText } from "@/lib/gemini";

export type RerankCandidate = {
  id: string;
  name: string;
  shortDescription: string | null;
};

const MAX_CANDIDATES = 72;

export async function rerankProductIdsByQuery(query: string, candidates: RerankCandidate[]): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed || candidates.length === 0) return candidates.map((c) => c.id);
  if (!isGeminiConfigured()) return candidates.map((c) => c.id);

  const slice = candidates.slice(0, MAX_CANDIDATES);
  const lines = slice.map((c) => {
    const desc = (c.shortDescription ?? "").replace(/\s+/g, " ").slice(0, 160);
    return `${c.id}\t${c.name}\t${desc}`;
  });

  const prompt = `Shopper search: ${JSON.stringify(trimmed)}

Products (id TAB name TAB short description fragment):
${lines.join("\n")}

Return JSON: {"orderedIds":["..."]} — every product id listed above, exactly once, best match first.`;

  try {
    const res = await geminiGenerateContent({
      systemInstruction:
        "You rank organic grocery e-commerce search results. Output ONLY valid JSON with key orderedIds: string[] (UUIDs). " +
        "Include every input id exactly once, best match first. No prose.",
      prompt,
    });
    const text = res.response.text();
    const parsed = parseJsonFromModelText(text) as { orderedIds?: unknown };
    const ids = Array.isArray(parsed.orderedIds)
      ? parsed.orderedIds.filter((x): x is string => typeof x === "string")
      : [];
    const allowed = new Set(slice.map((c) => c.id));
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const id of ids) {
      if (!allowed.has(id) || seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
    for (const c of slice) {
      if (!seen.has(c.id)) ordered.push(c.id);
    }
    return ordered;
  } catch (e) {
    console.warn("[semantic-rerank] Gemini rerank failed, using SQL order:", e);
    return candidates.map((c) => c.id);
  }
}
