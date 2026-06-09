import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shopChatEscalations, shopChatMessages, shopChatSessions } from "@/lib/db/schema";

export async function ensureShopChatSession(clientKey: string, userId: string | null) {
  const [existing] = await db
    .select()
    .from(shopChatSessions)
    .where(eq(shopChatSessions.clientKey, clientKey))
    .limit(1);
  if (existing) {
    if (userId && !existing.userId) {
      const now = new Date();
      await db
        .update(shopChatSessions)
        .set({ userId, updatedAt: now })
        .where(eq(shopChatSessions.id, existing.id));
      return { ...existing, userId, updatedAt: now };
    }
    return existing;
  }
  const [row] = await db
    .insert(shopChatSessions)
    .values({ clientKey, userId })
    .returning();
  return row!;
}

export async function appendShopChatMessage(sessionId: string, role: string, content: string) {
  await db.insert(shopChatMessages).values({ sessionId, role, content });
  await db
    .update(shopChatSessions)
    .set({ updatedAt: new Date() })
    .where(eq(shopChatSessions.id, sessionId));
}

export async function listRecentShopChatMessages(sessionId: string, take = 24) {
  return db
    .select()
    .from(shopChatMessages)
    .where(eq(shopChatMessages.sessionId, sessionId))
    .orderBy(desc(shopChatMessages.createdAt))
    .limit(take)
    .then((rows) => rows.reverse());
}

export async function insertShopChatEscalation(params: {
  sessionId: string;
  userEmail: string | null;
  reason: string;
  lastUserMessage: string;
}) {
  const [row] = await db
    .insert(shopChatEscalations)
    .values({
      sessionId: params.sessionId,
      userEmail: params.userEmail,
      reason: params.reason,
      lastUserMessage: params.lastUserMessage,
    })
    .returning();
  return row;
}
