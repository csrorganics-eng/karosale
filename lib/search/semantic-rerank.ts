import {
  geminiGenerateContent,
  isGeminiConfigured,
  isGeminiModelNotFoundError,
  isGeminiRateLimitError,
  parseJsonFromModelText,
} from "@/lib/gemini";

export type RerankCandidate = {
  id: string;
  name: string;
  shortDescription: string | null;
};

const MAX_CANDIDATES = 72;

const SEMANTIC_TIMEOUT_DEFAULT_MS = 12_000;
const SEMANTIC_COOLDOWN_DEFAULT_MS = 45_000;

function parsePositiveIntEnv(name: string, fallback: number, max?: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  if (max != null) return Math.min(n, max);
  return n;
}

/** After a search rerank hits rate limits on all fallbacks, skip Gemini for this window (SQL/keyword order). */
let searchSemanticCooldownUntil = 0;

function searchSemanticDisabledByEnv(): boolean {
  const v = process.env.SEARCH_SEMANTIC_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function isInSearchSemanticCooldown(): boolean {
  return Date.now() < searchSemanticCooldownUntil;
}

function armSearchSemanticCooldownFromRateLimit(): void {
  const ms = parsePositiveIntEnv(
    "SEARCH_SEMANTIC_COOLDOWN_MS",
    SEMANTIC_COOLDOWN_DEFAULT_MS,
    3_600_000,
  );
  searchSemanticCooldownUntil = Date.now() + ms;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (ms <= 0) return promise;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(Object.assign(new Error("SEARCH_SEMANTIC_TIMEOUT"), { code: "SEARCH_SEMANTIC_TIMEOUT" }));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function isSemanticTimeoutError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { code?: string }).code === "SEARCH_SEMANTIC_TIMEOUT"
  );
}

function sqlOrderIds(candidates: RerankCandidate[]): string[] {
  return candidates.map((c) => c.id);
}

export async function rerankProductIdsByQuery(query: string, candidates: RerankCandidate[]): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed || candidates.length === 0) return sqlOrderIds(candidates);
  if (!isGeminiConfigured()) return sqlOrderIds(candidates);
  if (searchSemanticDisabledByEnv()) {
    console.warn("[semantic-rerank] SEARCH_SEMANTIC_DISABLED set — using SQL/keyword order.");
    return sqlOrderIds(candidates);
  }
  if (isInSearchSemanticCooldown()) {
    console.warn("[semantic-rerank] Gemini search cooldown active — using SQL/keyword order.");
    return sqlOrderIds(candidates);
  }

  const slice = candidates.slice(0, MAX_CANDIDATES);
  const lines = slice.map((c) => {
    const desc = (c.shortDescription ?? "").replace(/\s+/g, " ").slice(0, 160);
    return `${c.id}\t${c.name}\t${desc}`;
  });

  const prompt = `Shopper search: ${JSON.stringify(trimmed)}

Products (id TAB name TAB short description fragment):
${lines.join("\n")}

Return JSON: {"orderedIds":["..."]} — every product id listed above, exactly once, best match first.`;

  const timeoutMs = parsePositiveIntEnv(
    "SEARCH_SEMANTIC_TIMEOUT_MS",
    SEMANTIC_TIMEOUT_DEFAULT_MS,
    120_000,
  );

  try {
    const res = await withTimeout(
      geminiGenerateContent({
        systemInstruction:
          "You rank organic grocery e-commerce search results. Output ONLY valid JSON with key orderedIds: string[] (UUIDs). " +
          "Include every input id exactly once, best match first. No prose.",
        prompt,
      }),
      timeoutMs,
    );
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
    if (isGeminiRateLimitError(e)) {
      armSearchSemanticCooldownFromRateLimit();
      console.warn("[semantic-rerank] Gemini rate limited (search) — using SQL/keyword order; cooldown armed.");
      return sqlOrderIds(candidates);
    }
    if (isSemanticTimeoutError(e)) {
      console.warn(
        `[semantic-rerank] Gemini rerank exceeded SEARCH_SEMANTIC_TIMEOUT_MS (${timeoutMs}ms) — using SQL/keyword order.`,
      );
      return sqlOrderIds(candidates);
    }
    if (isGeminiModelNotFoundError(e)) {
      console.warn("[semantic-rerank] Gemini model not found — using SQL/keyword order.");
      return sqlOrderIds(candidates);
    }
    console.warn("[semantic-rerank] Gemini rerank failed, using SQL/keyword order:", e);
    return sqlOrderIds(candidates);
  }
}
