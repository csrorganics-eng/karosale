import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { generateProductCopyWithGemini } from "@/lib/admin/gemini-product-copy";
import {
  GEMINI_MODEL_FALLBACK_CHAIN,
  geminiQuotaUserMessage,
  isGeminiConfigured,
  isGeminiModelNotFoundError,
  isGeminiRateLimitError,
} from "@/lib/gemini";

const schema = z.object({
  name: z.string().min(2).max(255),
  category: z.string().min(1).max(255),
  features: z.array(z.string().max(200)).max(24).optional().default([]),
});

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    if (!isGeminiConfigured()) {
      return jsonError("GEMINI_API_KEY is not configured", 503);
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const copy = await generateProductCopyWithGemini(parsed.data);
    return jsonOk({ copy });
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
    console.error("[POST /api/admin/products/ai-copy]", e);
    return jsonError(e instanceof Error ? e.message : "Generation failed", 500);
  }
}
