import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { generateProductCopyWithRouter } from "@/lib/admin/gemini-product-copy";
import { isAiRouterExhausted, isAiRouterOrGeminiConfigured, routerQuotaUserMessage } from "@/lib/ai-router";

const schema = z.object({
  name: z.string().min(2).max(255),
  category: z.string().min(1).max(255),
  features: z.array(z.string().max(200)).max(24).optional().default([]),
});

export async function POST(request: Request) {
  try {
    await requireRole(["admin"]);
    if (!isAiRouterOrGeminiConfigured()) {
      return jsonError("No AI provider is configured (set GROQ_API_KEY, CEREBRAS_API_KEY, or GEMINI_API_KEY)", 503);
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const copy = await generateProductCopyWithRouter(parsed.data);
    return jsonOk({ copy });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    if (isAiRouterExhausted(e)) {
      return jsonError(routerQuotaUserMessage(), 429);
    }
    console.error("[POST /api/admin/products/ai-copy]", e);
    return jsonError(e instanceof Error ? e.message : "Generation failed", 500);
  }
}
