import type { Content, GenerateContentResult, Tool } from "@google/generative-ai";
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

/**
 * Default when `GEMINI_MODEL` is unset.
 * `gemini-2.5-flash` — best quality/speed balance for shop chat and tools.
 * On 429/503 we fall back through `GEMINI_MODEL_FALLBACK_CHAIN` (often `flash-lite` has headroom).
 */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/** Tried after the preferred model; 404 or rate-limit triggers next entry. */
export const GEMINI_MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

let geminiWorkingModelId: string | null = null;

export function resetGeminiWorkingModelCache(): void {
  geminiWorkingModelId = null;
}

/** First non-empty value wins (Vercel / local naming varies). */
export function getGeminiApiKey(): string | undefined {
  for (const name of ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_AI_API_KEY"] as const) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return undefined;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function getGeminiEffectiveModelName(): string {
  return geminiWorkingModelId ?? getGeminiModelName();
}

export function buildGeminiModelCandidateIds(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const out: string[] = [];
  if (preferred) out.push(preferred);
  else out.push(DEFAULT_GEMINI_MODEL);
  for (const m of GEMINI_MODEL_FALLBACK_CHAIN) {
    if (!out.includes(m)) out.push(m);
  }
  return out;
}

function orderedModelIdsForRequest(): string[] {
  const base = buildGeminiModelCandidateIds();
  if (geminiWorkingModelId && base.includes(geminiWorkingModelId)) {
    return [geminiWorkingModelId, ...base.filter((id) => id !== geminiWorkingModelId)];
  }
  return base;
}

export function isGeminiModelNotFoundError(error: unknown): boolean {
  if (error instanceof GoogleGenerativeAIFetchError && error.status === 404) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return /not found for API version|is not supported for generateContent|\[404 Not Found\]/i.test(msg);
}

export function isGeminiRateLimitError(error: unknown): boolean {
  if (error instanceof GoogleGenerativeAIFetchError) {
    const s = error.status;
    if (s === 429 || s === 503) return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  if (/429|Too Many Requests/i.test(msg)) return true;
  if (/quota exceeded|resource_exhausted|rate limit|GenerateRequestsPerDay|free_tier/i.test(msg))
    return true;
  return false;
}

export function geminiQuotaUserMessage(): string {
  const model = getGeminiEffectiveModelName();
  return (
    "Google Gemini is temporarily unavailable (rate limit or quota). " +
    `Active model id: ${model}. Wait a minute and try again, or set GEMINI_MODEL to another supported Flash id ` +
    "(e.g. gemini-2.5-flash-lite). See https://ai.dev/rate-limit and https://ai.google.dev/gemini-api/docs/models"
  );
}

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error(
        "Gemini API key not configured (set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY on the server).",
      );
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export function getGeminiGenerativeModel(options?: { model?: string; systemInstruction?: string }) {
  const gen = getClient();
  return gen.getGenerativeModel({
    model: options?.model ?? getGeminiModelName(),
    ...(options?.systemInstruction
      ? { systemInstruction: { role: "system", parts: [{ text: options.systemInstruction }] } }
      : {}),
  });
}

export type GeminiGenerateInput =
  | { systemInstruction?: string; prompt: string; retryOnceOnRateLimit?: boolean }
  | { systemInstruction?: string; contents: Content[]; tools?: Tool[]; retryOnceOnRateLimit?: boolean };

function isPromptInput(x: GeminiGenerateInput): x is { systemInstruction?: string; prompt: string } {
  return "prompt" in x && typeof (x as { prompt?: unknown }).prompt === "string";
}

async function geminiGenerateContentOnce(input: GeminiGenerateInput): Promise<GenerateContentResult> {
  const systemInstruction = input.systemInstruction;
  const genRequest = isPromptInput(input)
    ? { contents: [{ role: "user", parts: [{ text: input.prompt }] }] as Content[] }
    : {
        contents: input.contents,
        ...(input.tools && input.tools.length > 0 ? { tools: input.tools } : {}),
      };

  const ids = orderedModelIdsForRequest();
  let lastErr: unknown;
  for (const modelId of ids) {
    const model = getGeminiGenerativeModel({ model: modelId, systemInstruction });
    try {
      const res = await model.generateContent(genRequest);
      geminiWorkingModelId = modelId;
      return res;
    } catch (e) {
      lastErr = e;
      if (isGeminiModelNotFoundError(e)) {
        if (geminiWorkingModelId === modelId) geminiWorkingModelId = null;
        console.warn(`[gemini] Model "${modelId}" unavailable (404), trying next fallback…`);
        continue;
      }
      if (isGeminiRateLimitError(e)) {
        if (geminiWorkingModelId === modelId) geminiWorkingModelId = null;
        console.warn(`[gemini] Model "${modelId}" rate limited or overloaded, trying next fallback…`);
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("No Gemini model could be reached. Check GEMINI_MODEL and https://ai.google.dev/gemini-api/docs/models");
}

export async function geminiGenerateContent(input: GeminiGenerateInput): Promise<GenerateContentResult> {
  try {
    return await geminiGenerateContentOnce(input);
  } catch (e) {
    if (input.retryOnceOnRateLimit === true && isGeminiRateLimitError(e)) {
      console.warn("[gemini] All model fallbacks rate-limited; waiting 2.2s and retrying once…");
      await new Promise((r) => setTimeout(r, 2200));
      return geminiGenerateContentOnce(input);
    }
    throw e;
  }
}

export function parseJsonFromModelText(raw: string): unknown {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence?.[1]) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t) as unknown;
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const res = await geminiGenerateContent({ prompt });
  return res.response.text();
}
