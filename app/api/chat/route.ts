import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import {
  appendShopChatMessage,
  ensureShopChatSession,
  listRecentShopChatMessages,
} from "@/lib/db/queries/shop-chat";
import { runShopChatAssistant } from "@/lib/chat/run-shop-chat";
import {
  isGeminiConfigured,
  isGeminiModelNotFoundError,
  isGeminiRateLimitError,
  geminiQuotaUserMessage,
} from "@/lib/gemini";

const bodySchema = z.object({
  clientKey: z.string().min(8).max(80),
  message: z.string().min(1).max(4000),
});

const rate = new Map<string, number[]>();

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** In-memory per-instance limit (serverless: resets per warm instance). */
function getChatRateLimit(): { max: number; windowMs: number } {
  const windowMs = parsePositiveInt(process.env.CHAT_RATE_LIMIT_WINDOW_MS, 60_000);
  const fromEnv = process.env.CHAT_RATE_LIMIT_MAX?.trim();
  if (fromEnv) {
    return { max: parsePositiveInt(fromEnv, 40), windowMs };
  }
  const dev = process.env.NODE_ENV === "development";
  // Allow ~15+ shopper turns/minute; each turn is usually 1 generateContent (catalog search no longer doubles Gemini).
  return { max: dev ? 120 : 72, windowMs };
}

function rateLimitOk(key: string): boolean {
  const { max, windowMs } = getChatRateLimit();
  const now = Date.now();
  const arr = rate.get(key) ?? [];
  const fresh = arr.filter((t) => now - t < windowMs);
  if (fresh.length >= max) return false;
  fresh.push(now);
  rate.set(key, fresh);
  return true;
}

export async function POST(request: Request) {
  try {
    if (!isGeminiConfigured()) {
      return jsonError("Chat assistant is not configured", 503);
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const { clientKey, message } = parsed.data;
    if (!rateLimitOk(clientKey)) {
      return jsonError("Too many messages. Please wait a minute.", 429);
    }

    const session = await auth();
    const userId = session?.user?.id ?? null;
    const userEmail = session?.user?.email?.trim() || null;

    const row = await ensureShopChatSession(clientKey, userId);
    const prior = await listRecentShopChatMessages(row.id, 40);
    const priorForModel = prior
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    await appendShopChatMessage(row.id, "user", message);

    let reply: string;
    try {
      reply = await runShopChatAssistant({
        sessionId: row.id,
        userId,
        userEmail,
        message,
        priorMessages: priorForModel,
      });
    } catch (e) {
      if (isGeminiRateLimitError(e)) {
        reply = geminiQuotaUserMessage();
      } else if (isGeminiModelNotFoundError(e)) {
        reply =
          "The assistant could not load a working Gemini model. Remove GEMINI_MODEL or set gemini-2.5-flash. See https://ai.google.dev/gemini-api/docs/models";
      } else {
        throw e;
      }
    }

    await appendShopChatMessage(row.id, "assistant", reply);

    return jsonOk({ reply });
  } catch (e) {
    console.error("[POST /api/chat]", e);
    return jsonError("Chat failed", 500);
  }
}
