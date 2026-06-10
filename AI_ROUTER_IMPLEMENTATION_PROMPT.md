# AI Router Implementation Prompt
## CSR Organics — Multi-Provider Chat Router

---

## CONTEXT & GOAL

This codebase is a Next.js 15 App Router e-commerce platform (CSR Organics / Karosale). It currently uses Google Gemini exclusively for all AI features: shop chat, semantic search rerank, personalization profile building, and admin product copy.

**The problem:** Gemini free tier has 10 RPM, causing 429 errors when 2+ users chat simultaneously.

**The solution:** Route shop chat through Groq (primary, 30 RPM) → Cerebras (fallback, 30 RPM, 1M tokens/day) → Gemini (last resort). Keep Gemini exclusively for semantic rerank and personalization (these are infrequent long-context calls that Gemini's 1M context window is uniquely suited for). Admin product copy routes through Groq → Gemini fallback.

Both Groq and Cerebras are OpenAI-API-compatible. The implementation uses the `openai` npm package with a `baseURL` override — no new heavy SDKs needed.

---

## REQUIRED ENV VARS (already added to `.env.local` and Vercel)

```
GROQ_API_KEY=gsk_...
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_CHAT_MODEL=llama-3.3-70b-versatile

CEREBRAS_API_KEY=csk_...
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1
CEREBRAS_CHAT_MODEL=llama-4-scout

# Existing — keep unchanged, now used ONLY for rerank + personalization
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash

# Existing — keep unchanged, SEO descriptions only
OPENAI_API_KEY=sk-...
```

---

## IMPLEMENTATION TASKS

### TASK 1 — Create `lib/ai-router.ts`

Create a new file `lib/ai-router.ts`. This module provides an OpenAI-compatible multi-provider chat completion function used by shop chat and admin copy. It must NOT be used for semantic rerank or personalization (those stay Gemini-only).

**Requirements:**

```typescript
// lib/ai-router.ts
// Multi-provider OpenAI-compatible chat router: Groq → Cerebras → Gemini fallback

import OpenAI from "openai";

// Provider configuration resolved from env at module load
// Each provider is optional — skip if key missing
// Groq: baseURL=GROQ_BASE_URL, apiKey=GROQ_API_KEY, model=GROQ_CHAT_MODEL
// Cerebras: baseURL=CEREBRAS_BASE_URL, apiKey=CEREBRAS_API_KEY, model=CEREBRAS_CHAT_MODEL
// Gemini-OpenAI-compat: baseURL=https://generativelanguage.googleapis.com/v1beta/openai/,
//   apiKey=GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_AI_API_KEY),
//   model=GEMINI_MODEL (default "gemini-2.5-flash")

// Types:
// AiMessage = OpenAI.Chat.ChatCompletionMessageParam
// AiTool = OpenAI.Chat.ChatCompletionTool  (type: "function", function: { name, description, parameters })
// AiToolCall = { id: string; name: string; arguments: string }
// AiRouterResult = { content: string | null; toolCalls: AiToolCall[] | null; providerUsed: string }

// Cerebras has an 8K context limit on free tier.
// Add a helper: trimMessagesForCerebras(messages: AiMessage[]): AiMessage[]
//   — keep the first message if it is role=system (as system prompt)
//   — keep the last N user/assistant turns so total estimated tokens stay under 6000
//   — estimate tokens as: sum of all message content string lengths / 3 (rough char-to-token ratio)
//   — always keep at minimum the system message + last 4 messages regardless of estimate

// Main export:
// async function routerChatCompletion(
//   messages: AiMessage[],
//   tools?: AiTool[],
//   options?: { maxTokens?: number }
// ): Promise<AiRouterResult>
//
// Behavior:
// 1. Build provider list in order: [groq, cerebras, gemini] — skip any with missing key
// 2. For each provider:
//    a. If provider is cerebras: apply trimMessagesForCerebras before sending
//    b. Call openaiClient.chat.completions.create({
//         model, messages (or trimmed), tools (if provided), max_tokens: options?.maxTokens ?? 1024,
//         tool_choice: tools?.length ? "auto" : undefined
//       })
//    c. On success: extract content and tool_calls from choices[0].message
//       - toolCalls: map each tool_call to { id, name: tool_call.function.name, arguments: tool_call.function.arguments }
//       - return { content, toolCalls, providerUsed: provider.name }
//    d. On error with status 429 or 503: log warn, continue to next provider
//    e. On other errors: log error, continue to next provider (treat as degraded, not fatal)
// 3. If all providers exhausted: throw new Error("AI_ROUTER_ALL_PROVIDERS_EXHAUSTED")
//    — callers catch this and return a user-friendly message

// Export: routerChatCompletion (named), AiMessage, AiTool, AiToolCall, AiRouterResult (types)
// Export: isAiRouterExhausted(err: unknown): boolean — checks err.message === "AI_ROUTER_ALL_PROVIDERS_EXHAUSTED"
```

**Exact implementation notes:**
- Use `new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: false })` for each provider. Instantiate clients lazily inside the function (not at module top level) so missing env vars at build time don't crash the module.
- Groq and Cerebras are natively OpenAI-compatible. The Gemini OpenAI-compat endpoint is `https://generativelanguage.googleapis.com/v1beta/openai/` — this works for basic chat but does NOT support the same tool call format reliably; use it as last resort.
- Do NOT import anything from `lib/gemini.ts` in this file. This module is completely independent.
- TypeScript strict: no `any` casts, explicit return types.

---

### TASK 2 — Rewrite `lib/chat/run-shop-chat.ts`

This file currently drives the shop chat loop using `geminiGenerateContent` from `lib/gemini.ts` with Gemini-native function calling format.

**Rewrite it to use `routerChatCompletion` from `lib/ai-router.ts`.**

**Current behavior to preserve:**
- Accepts: `{ messages: prior chat history, userId?: string, systemPrompt: string }`
- Runs a tool-use loop up to `CHAT_MAX_TOOL_ROUNDS` (default 6, from env `CHAT_MAX_TOOL_ROUNDS`)
- Tools: `search_catalog`, `get_product_summary`, `list_my_recent_orders`, `escalate_to_human`
- Tool implementations are DB/search calls — these do NOT change
- Returns: `string` (the assistant's final text reply)
- On quota exhaustion: return `quotaUserMessage()` string (not throw)

**What changes:**
1. Replace `geminiGenerateContent` with `routerChatCompletion`
2. Translate tool declarations from Gemini format (`functionDeclarations: [{ name, description, parameters }]`) to OpenAI format (`tools: [{ type: "function", function: { name, description, parameters } }]`)
3. Replace Gemini response parsing (`.candidates[0].content.parts`) with OpenAI response parsing (`.content` and `.toolCalls` from `AiRouterResult`)
4. Replace Gemini tool call dispatch (reading `functionCall.name` + `functionCall.args`) with OpenAI tool call dispatch (reading `toolCall.name` + `JSON.parse(toolCall.arguments)`)
5. Build the conversation as `AiMessage[]` (OpenAI format) instead of Gemini `Content[]`
6. On `isAiRouterExhausted` error: return a user-friendly string — use `routerQuotaUserMessage()` (see Task 3)
7. Remove all imports from `lib/gemini.ts` from this file

**Message history format:**
- Convert prior chat history (from DB, which is stored as `{ role: "user"|"assistant", content: string }`) to `AiMessage[]` directly — these types are compatible
- Prepend the system prompt as `{ role: "system", content: systemPrompt }`
- During the loop: append assistant message (with tool_calls if present) then tool result messages as `{ role: "tool", tool_call_id, content: JSON.stringify(toolResult) }`

**Tool loop logic (OpenAI format):**
```
loop (round = 0; round < maxRounds):
  result = await routerChatCompletion(messages, tools)
  append result as assistant message to messages
  if result.toolCalls is null or empty: break (final text reply)
  for each toolCall in result.toolCalls:
    output = await dispatchTool(toolCall.name, JSON.parse(toolCall.arguments))
    append { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(output) } to messages
  // continue loop with tool results appended
if no text after maxRounds: return "I wasn't able to complete that. Please try again."
```

**Do NOT change:**
- Tool implementation functions (the actual DB/search logic)
- Function signatures visible to `app/api/chat/route.ts`
- Rate limiting logic (stays in the API route, not here)

---

### TASK 3 — Add `routerQuotaUserMessage()` to `lib/ai-router.ts`

Add this exported function to `lib/ai-router.ts`:

```typescript
export function routerQuotaUserMessage(): string {
  return (
    "I'm temporarily unavailable due to high demand — all AI providers are at capacity. " +
    "Please try again in a minute. If this persists, our team is aware and working on it."
  );
}
```

---

### TASK 4 — Update `app/api/chat/route.ts`

The POST handler currently:
1. Checks `isGeminiConfigured()` and returns 503 if false
2. Calls `runShopChatAssistant(...)` which internally uses Gemini

**Changes required:**

1. Replace the `isGeminiConfigured()` check with `isAiRouterConfigured()` — a new function to add in `lib/ai-router.ts`:
   ```typescript
   // Returns true if at least one provider (Groq or Cerebras) has an API key configured
   export function isAiRouterConfigured(): boolean {
     return !!(process.env.GROQ_API_KEY || process.env.CEREBRAS_API_KEY);
   }
   ```
   The route returns 503 with `{ error: "Chat assistant is not configured" }` if `!isAiRouterConfigured()`.

2. The GET handler for `/api/chat/status` currently returns `{ enabled: isGeminiConfigured() }`. Change it to `{ enabled: isAiRouterConfigured() }`.

3. Import `isAiRouterConfigured` from `lib/ai-router.ts` instead of `isGeminiConfigured` from `lib/gemini.ts`. Remove the `isGeminiConfigured` import if it is only used for the chat route check.

**Do NOT change:**
- Rate limiting logic
- Request parsing / Zod validation
- DB persistence calls (`ensureShopChatSession`, `appendShopChatMessage`, etc.)
- Error handling structure (still return 500 for unexpected errors, still return 200 with quota message text for quota exhaustion)

---

### TASK 5 — Update `app/api/admin/products/ai-copy/route.ts`

This route currently calls `generateProductCopyWithGemini` for short product copy.

**Change:** Route it through `routerChatCompletion` instead.

The function `generateProductCopyWithGemini` in `lib/products/gemini-copy.ts` (or similar path) builds a prompt and calls Gemini. Either:
- Option A: Create a new `generateProductCopyWithRouter` function in the same file that uses `routerChatCompletion` with the same prompt, and call that from the route handler
- Option B (preferred if the existing function is simple): Replace the `geminiGenerateContent` call inside `generateProductCopyWithGemini` with `routerChatCompletion`

The prompt for product copy is a single-turn completion (no tools needed). Call `routerChatCompletion(messages)` with no `tools` argument.

On `isAiRouterExhausted`: return 429 with `{ error: routerQuotaUserMessage() }`.

Keep the `isGeminiConfigured()` fallback check only if Gemini is needed as last resort here — but given admin is low-volume, routing through Groq→Cerebras→Gemini is fine.

---

### TASK 6 — Keep these files COMPLETELY UNCHANGED

- `lib/gemini.ts` — no modifications. It continues to serve:
  - `lib/search/semantic-rerank.ts` (semantic rerank)
  - `lib/personalization/gemini-profile.ts` (profile building)
  - `lib/personalization/gemini-picks.ts` (picks rerank)
  - `app/api/admin/search-ranking/ai-suggest/route.ts` (ranking weights)
- `app/api/admin/products/generate-description/route.ts` — stays OpenAI `gpt-4o`, no change
- All Inngest functions — no change
- All DB/search/loyalty/checkout/order logic — no change
- All auth/session logic — no change

---

### TASK 7 — Install required package (if not already present)

Check `package.json`. If `openai` is not already a dependency, run:
```bash
npm install openai
```
The `openai` package is used with `baseURL` override for both Groq and Cerebras — no provider-specific SDK needed.

Do NOT install `groq-sdk`, `@ai-sdk/groq`, or `@ai-sdk/cerebras` — the `openai` package with `baseURL` override is sufficient and simpler.

---

## INVARIANTS — MUST HOLD AFTER IMPLEMENTATION

1. `lib/gemini.ts` is imported ONLY from: semantic-rerank, personalization files, admin search-ranking suggest, and admin ai-copy (if Gemini is last resort there). It must NOT be imported from `run-shop-chat.ts` or `ai-router.ts`.

2. `lib/ai-router.ts` is imported ONLY from: `run-shop-chat.ts`, `app/api/chat/route.ts`, and admin product copy route/function.

3. The shop chat API route (`app/api/chat/route.ts`) returns:
   - `503` when no AI router provider is configured
   - `429` when the client-side rate limit is exceeded (unchanged)
   - `200` with `{ reply: string }` for all AI responses including quota exhaustion (quota message as reply text)
   - `500` for unexpected server errors

4. The Cerebras message trimming MUST apply only for Cerebras calls, not Groq or Gemini.

5. All existing env var names for Gemini (`GEMINI_API_KEY`, `GEMINI_MODEL`, etc.) remain unchanged — the Gemini module reads the same vars it always did.

6. TypeScript must compile with zero errors (`tsc --noEmit`). Do not use `@ts-ignore` or `as any` to silence type errors — fix them properly.

7. No secrets are logged. Provider names and error codes may be logged (console.warn/error) but never API keys.

8. The shop chat status endpoint (`GET /api/chat/status`) returns `{ enabled: true }` when at least one of `GROQ_API_KEY` or `CEREBRAS_API_KEY` is set in env.

---

## FILE CHANGE SUMMARY

| File | Action |
|------|--------|
| `lib/ai-router.ts` | CREATE — new multi-provider router |
| `lib/chat/run-shop-chat.ts` | REWRITE — replace Gemini with routerChatCompletion |
| `app/api/chat/route.ts` | UPDATE — swap isGeminiConfigured → isAiRouterConfigured |
| `lib/products/gemini-copy.ts` (or equivalent) | UPDATE — use routerChatCompletion for short copy |
| `app/api/admin/products/ai-copy/route.ts` | UPDATE — handle AI router errors |
| `lib/gemini.ts` | NO CHANGE |
| All other files | NO CHANGE |

---

## VERIFICATION STEPS

After implementation, verify:

1. `tsc --noEmit` passes with zero errors
2. `grep -r "from.*lib/gemini" lib/chat/` returns nothing (chat no longer imports gemini)
3. `grep -r "from.*lib/ai-router" lib/search/` returns nothing (search still uses gemini directly)
4. `grep -r "routerChatCompletion" .` shows hits only in: `ai-router.ts`, `run-shop-chat.ts`, and the admin copy file
5. Manual test: with only `GROQ_API_KEY` set (remove Cerebras key temporarily), chat works
6. Manual test: with `GROQ_API_KEY` unset and only `CEREBRAS_API_KEY` set, chat works
7. Manual test: `GET /api/chat/status` returns `{ enabled: true }` when either key is set
8. Semantic search rerank still calls Gemini (check `lib/search/semantic-rerank.ts` is unchanged)
