/**
 * Expo Push Notification Service (EPNS) client.
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications-custom/
 * All notifications go through https://exp.host/--/api/v2/push/send
 * Batch up to 100 messages per request.
 */

export type ExpoPushMessage = {
  /** ExponentPushToken[xxxxxx] */
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
  /** Android notification channel id */
  channelId?: string;
  /** iOS category id */
  categoryIdentifier?: string;
  ttl?: number;
  expiration?: number;
  mutableContent?: boolean;
};

export type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK_SIZE = 100;

function isValidToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token) || /^[a-zA-Z0-9_-]{20,}$/.test(token);
}

/**
 * Send push notifications via Expo. Fire-and-forget safe — logs errors, never throws.
 */
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  // Filter obviously invalid tokens
  const valid = messages.filter((m) => {
    const tokens = Array.isArray(m.to) ? m.to : [m.to];
    return tokens.some(isValidToken);
  });

  if (valid.length === 0) {
    console.warn("[push] No valid Expo tokens — nothing sent");
    return [];
  }

  const allTickets: ExpoPushTicket[] = [];

  // Send in chunks of 100
  for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
    const chunk = valid.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!res.ok) {
        console.error(`[push] HTTP ${res.status}:`, await res.text());
        continue;
      }

      const json = (await res.json()) as { data: ExpoPushTicket[] };
      allTickets.push(...json.data);

      // Log any delivery errors
      for (const ticket of json.data) {
        if (ticket.status === "error") {
          console.error("[push] Delivery error:", ticket.message, ticket.details);
        }
      }
    } catch (err) {
      console.error("[push] Network error sending push:", err);
    }
  }

  return allTickets;
}

/**
 * Look up push tokens for a user from the DB and send them a notification.
 * Convenience wrapper used by Inngest functions.
 */
export async function sendPushToUser(
  userId: string,
  message: Omit<ExpoPushMessage, "to">,
): Promise<void> {
  // Dynamically import db to avoid circular imports in edge environments
  const { db } = await import("@/lib/db");
  const { pushTokens } = await import("@/lib/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const tokens = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));

  if (tokens.length === 0) return;

  await sendExpoPush(tokens.map((t) => ({ ...message, to: t.token })));
}

/**
 * Send a push notification to all users with admin/vendor/packer roles
 * who have an active push token registered (i.e. have the mobile app installed).
 *
 * Used for operational alerts: new orders, cancellations, low stock, payments, etc.
 *
 * @param message  Notification payload (without `to`)
 * @param roles    Which roles to target. Defaults to admin + vendor + packer.
 */
export async function sendPushToAdmins(
  message: Omit<ExpoPushMessage, "to">,
  roles: string[] = ["admin", "vendor", "packer"],
): Promise<void> {
  const { db } = await import("@/lib/db");
  const { pushTokens, users } = await import("@/lib/db/schema");
  const { eq, and, inArray } = await import("drizzle-orm");

  const rows = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .innerJoin(users, eq(pushTokens.userId, users.id))
    .where(
      and(
        eq(pushTokens.isActive, true),
        inArray(users.role, roles),
      ),
    );

  if (rows.length === 0) return;

  await sendExpoPush(rows.map((r) => ({ ...message, to: r.token })));
}
