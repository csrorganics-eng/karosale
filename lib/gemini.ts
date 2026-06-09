import type { Content, GenerateContentResult, Tool } from "@google/generative-ai";
import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from "@google/generative-ai";

let client: GoogleGenerativeAI | null = null;

/** Default when `GEMINI_MODEL` is unset (2.0 / 1.5 names often 404 on current v1beta). */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
] as const;

let geminiWorkingModelId: string | null = null;

export function resetGeminiWorkingModelCache(): void {
  geminiWorkingModelId = null;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
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
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
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
  | { systemInstruction?: string; prompt: string }
  | { systemInstruction?: string; contents: Content[]; tools?: Tool[] };

function isPromptInput(x: GeminiGenerateInput): x is { systemInstruction?: string; prompt: string } {
  return "prompt" in x && typeof (x as { prompt?: unknown }).prompt === "string";
}

export async function geminiGenerateContent(input: GeminiGenerateInput): Promise<GenerateContentResult> {
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
      throw e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("No Gemini model could be reached. Check GEMINI_MODEL and https://ai.google.dev/gemini-api/docs/models");
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
