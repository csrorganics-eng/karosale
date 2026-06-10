/**
 * Multi-provider OpenAI-compatible chat router: Groq → Cerebras → Gemini (OpenAI compat) fallback.
 * Not used for semantic rerank or personalization (those remain Gemini-native in `lib/gemini.ts`).
 */
import OpenAI from "openai";

export type AiMessage = OpenAI.Chat.ChatCompletionMessageParam;
export type AiTool = OpenAI.Chat.ChatCompletionTool;

export type AiToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type AiRouterResult = {
  content: string | null;
  toolCalls: AiToolCall[] | null;
  providerUsed: string;
};

export const AI_ROUTER_ALL_PROVIDERS_EXHAUSTED = "AI_ROUTER_ALL_PROVIDERS_EXHAUSTED";

function getGeminiOpenAiKey(): string | undefined {
  for (const name of ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_AI_API_KEY"] as const) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return undefined;
}

/** Chat availability: Groq or Cerebras required (Gemini-only is not enough for high-RPM chat). */
export function isAiRouterConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim() || process.env.CEREBRAS_API_KEY?.trim());
}

/** Single-turn completions (e.g. admin copy): any router provider including Gemini OpenAI-compat. */
export function isAiRouterOrGeminiConfigured(): boolean {
  return isAiRouterConfigured() || Boolean(getGeminiOpenAiKey());
}

export function routerQuotaUserMessage(): string {
  return (
    "I'm temporarily unavailable due to high demand — all AI providers are at capacity. " +
    "Please try again in a minute. If this persists, our team is aware and working on it."
  );
}

export function isAiRouterExhausted(err: unknown): boolean {
  return err instanceof Error && err.message === AI_ROUTER_ALL_PROVIDERS_EXHAUSTED;
}

/** Same behavior as `parseJsonFromModelText` in `lib/gemini.ts` — kept here so admin copy avoids importing Gemini. */
export function parseJsonFromAssistantText(raw: string): unknown {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence?.[1]) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t) as unknown;
}

function httpStatusFromError(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status?: number }).status;
    if (typeof s === "number" && Number.isFinite(s)) return s;
  }
  return undefined;
}

function estimateMessageChars(m: AiMessage): number {
  if (m.role === "system" || m.role === "user") {
    const c = m.content;
    if (typeof c === "string") return c.length;
    if (Array.isArray(c)) {
      return c.reduce((sum, part) => {
        if (typeof part === "object" && part !== null && "text" in part) {
          return sum + String((part as { text?: string }).text ?? "").length;
        }
        return sum;
      }, 0);
    }
    return 0;
  }
  if (m.role === "assistant") {
    let n = 0;
    if (typeof m.content === "string" && m.content.length > 0) n += m.content.length;
    const calls = "tool_calls" in m ? m.tool_calls : undefined;
    if (calls) {
      for (const tc of calls) {
        if (tc.type === "function") {
          n += tc.function.name.length + tc.function.arguments.length;
        }
      }
    }
    return n;
  }
  if (m.role === "tool") {
    return typeof m.content === "string" ? m.content.length : 0;
  }
  return 0;
}

function estimateTokensFromMessages(messages: AiMessage[]): number {
  const chars = messages.reduce((sum, m) => sum + estimateMessageChars(m), 0);
  return Math.ceil(chars / 3);
}

/** Every `assistant` message with `tool_calls` must be immediately followed by matching `tool` messages. */
function isValidOpenAiMessageSequence(msgs: AiMessage[]): boolean {
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (!m) return false;
    if (m.role === "assistant") {
      const calls = "tool_calls" in m ? m.tool_calls : undefined;
      if (calls && calls.length > 0) {
        let j = i + 1;
        for (const tc of calls) {
          if (tc.type !== "function") continue;
          const next = msgs[j];
          if (!next || next.role !== "tool" || !("tool_call_id" in next)) return false;
          if (next.tool_call_id !== tc.id) return false;
          j += 1;
        }
        i = j - 1;
      }
    }
  }
  return true;
}

/**
 * Cerebras free tier ~8K context — trim oldest messages after `system` while keeping
 * a valid OpenAI message sequence, at least the last 4 non-system messages when possible,
 * and estimated tokens ≤ 6000 when possible.
 */
export function trimMessagesForCerebras(messages: AiMessage[]): AiMessage[] {
  if (messages.length === 0) return messages;
  const first = messages[0];
  const hasSystem = first?.role === "system";
  const system: AiMessage[] = hasSystem && first ? [first] : [];
  const rest = hasSystem && first ? messages.slice(1) : [...messages];
  if (rest.length === 0) return system;

  const minTail = Math.min(4, rest.length);
  let start = rest.length - minTail;
  while (start > 0 && !isValidOpenAiMessageSequence(rest.slice(start))) {
    start -= 1;
  }
  while (start > 0) {
    const nextStart = start - 1;
    const candidate = rest.slice(nextStart);
    if (!isValidOpenAiMessageSequence(candidate)) break;
    const trial = [...system, ...candidate];
    if (estimateTokensFromMessages(trial) <= 6000) {
      start = nextStart;
    } else {
      break;
    }
  }
  return [...system, ...rest.slice(start)];
}

type ProviderSpec = {
  name: string;
  apiKey: string;
  baseURL: string;
  model: string;
  trimForContext: boolean;
};

function buildProviderList(): ProviderSpec[] {
  const out: ProviderSpec[] = [];

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    out.push({
      name: "groq",
      apiKey: groqKey,
      baseURL: process.env.GROQ_BASE_URL?.trim() || "https://api.groq.com/openai/v1",
      model: process.env.GROQ_CHAT_MODEL?.trim() || "llama-3.3-70b-versatile",
      trimForContext: false,
    });
  }

  const cerebrasKey = process.env.CEREBRAS_API_KEY?.trim();
  if (cerebrasKey) {
    out.push({
      name: "cerebras",
      apiKey: cerebrasKey,
      baseURL: process.env.CEREBRAS_BASE_URL?.trim() || "https://api.cerebras.ai/v1",
      model: process.env.CEREBRAS_CHAT_MODEL?.trim() || "llama-4-scout",
      trimForContext: true,
    });
  }

  const geminiKey = getGeminiOpenAiKey();
  if (geminiKey) {
    out.push({
      name: "gemini-openai",
      apiKey: geminiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
      trimForContext: false,
    });
  }

  return out;
}

function mapToolCallsFromMessage(
  message: OpenAI.Chat.ChatCompletionMessage,
): AiToolCall[] | null {
  const raw = message.tool_calls;
  if (!raw || raw.length === 0) return null;
  const mapped: AiToolCall[] = [];
  for (const tc of raw) {
    if (tc.type !== "function") continue;
    mapped.push({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments ?? "{}",
    });
  }
  return mapped.length > 0 ? mapped : null;
}

export async function routerChatCompletion(
  messages: AiMessage[],
  tools?: AiTool[],
  options?: { maxTokens?: number },
): Promise<AiRouterResult> {
  const providers = buildProviderList();
  if (providers.length === 0) {
    throw new Error(AI_ROUTER_ALL_PROVIDERS_EXHAUSTED);
  }

  const maxTokens = options?.maxTokens ?? 1024;
  let lastError: unknown;

  for (const p of providers) {
    const client = new OpenAI({
      apiKey: p.apiKey,
      baseURL: p.baseURL,
      dangerouslyAllowBrowser: false,
    });
    const payloadMessages = p.trimForContext ? trimMessagesForCerebras(messages) : messages;

    try {
      const completion = await client.chat.completions.create({
        model: p.model,
        messages: payloadMessages,
        ...(tools && tools.length > 0
          ? {
              tools,
              tool_choice: "auto" as const,
            }
          : {}),
        max_tokens: maxTokens,
      });

      const choice = completion.choices[0];
      const msg = choice?.message;
      if (!msg) {
        console.warn(`[ai-router] ${p.name} returned no message choice`);
        continue;
      }

      const toolCalls = mapToolCallsFromMessage(msg);
      const content = typeof msg.content === "string" ? msg.content : null;

      return {
        content,
        toolCalls,
        providerUsed: p.name,
      };
    } catch (e) {
      lastError = e;
      const status = httpStatusFromError(e);
      if (status === 429 || status === 503) {
        console.warn(`[ai-router] ${p.name} unavailable (${status}), trying next provider…`);
        continue;
      }
      console.error(`[ai-router] ${p.name} request failed`, e);
      continue;
    }
  }

  if (lastError != null) {
    console.error("[ai-router] All providers failed; last error:", lastError);
  }
  throw new Error(AI_ROUTER_ALL_PROVIDERS_EXHAUSTED);
}
