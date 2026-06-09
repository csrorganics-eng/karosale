import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { searchRankingSettings } from "@/lib/db/schema";
import { jsonOk, jsonError } from "@/lib/api-response";
import {
  GEMINI_MODEL_FALLBACK_CHAIN,
  geminiGenerateContent,
  geminiQuotaUserMessage,
  isGeminiConfigured,
  isGeminiModelNotFoundError,
  isGeminiRateLimitError,
  parseJsonFromModelText,
} from "@/lib/gemini";
import { DEFAULT_RANKING_WEIGHTS, RANKING_WEIGHT_KEYS, type RankingWeights } from "@/lib/merchandising/types";
import { mergeWeightPatch, normalizeWeightPatch } from "@/lib/merchandising/patch-weights";

const schema = z.object({
  intent: z.string().min(3).max(2000),
});

function rowToWeights(row: typeof searchRankingSettings.$inferSelect): RankingWeights {
  return {
    matchNameWeight: parseFloat(String(row.matchNameWeight)),
    matchDescWeight: parseFloat(String(row.matchDescWeight)),
    matchSkuWeight: parseFloat(String(row.matchSkuWeight)),
    salesLogCoef: parseFloat(String(row.salesLogCoef)),
    ratingCoef: parseFloat(String(row.ratingCoef)),
    reviewCountCoef: parseFloat(String(row.reviewCountCoef)),
    featuredBonus: parseFloat(String(row.featuredBonus)),
    bestsellerBonus: parseFloat(String(row.bestsellerBonus)),
    inStockBonus: parseFloat(String(row.inStockBonus)),
  };
}

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    if (!isGeminiConfigured()) {
      return jsonError("Gemini API key is not configured on the server", 503);
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const [existing] = await db.select().from(searchRankingSettings).limit(1);
    const base: RankingWeights = existing ? rowToWeights(existing) : { ...DEFAULT_RANKING_WEIGHTS };

    const prompt = `Admin intent:\n${parsed.data.intent}\n\nCurrent weights JSON:\n${JSON.stringify(base)}`;

    const res = await geminiGenerateContent({
      systemInstruction:
        "You help tune e-commerce search relevance weights (numeric merchandising). " +
        "Reply ONLY with JSON: {\"patch\":{...},\"explanation\":\"string\"}. " +
        "patch may include only these keys (all optional, numbers 0–100000): " +
        RANKING_WEIGHT_KEYS.join(", ") +
        ". Suggest small deltas from current values unless the intent clearly needs a bigger change.",
      prompt,
    });

    const raw = parseJsonFromModelText(res.response.text()) as {
      patch?: unknown;
      explanation?: unknown;
    };
    const patch = normalizeWeightPatch(raw.patch);
    const merged = mergeWeightPatch(base, patch);
    const explanation =
      typeof raw.explanation === "string" ? raw.explanation.trim() : "No explanation provided.";

    return jsonOk({
      patch,
      mergedPreview: merged,
      explanation,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    if (isGeminiRateLimitError(e)) return jsonError(geminiQuotaUserMessage(), 429);
    if (isGeminiModelNotFoundError(e)) {
      return jsonError(
        `Gemini model not found. Unset GEMINI_MODEL or use one of: ${GEMINI_MODEL_FALLBACK_CHAIN.join(", ")}.`,
        400,
      );
    }
    console.error("[POST /api/admin/search-ranking/ai-suggest]", e);
    return jsonError("Suggestion failed", 500);
  }
}
