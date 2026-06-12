import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { socialConnections } from "@/lib/db/schema";

function getEncryptionKey(): Buffer {
  const raw =
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";
  if (!raw) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY or AUTH_SECRET is required for social token encryption");
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

/** AES-256-GCM — returns `iv:authTag:ciphertext` hex segments */
export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("INVALID_ENCRYPTED_TOKEN");
  const iv = Buffer.from(parts[0]!, "hex");
  const authTag = Buffer.from(parts[1]!, "hex");
  const data = Buffer.from(parts[2]!, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export type SocialProvider = "facebook" | "instagram" | "whatsapp";

export interface SocialConnectionData {
  provider: SocialProvider;
  providerAccountId: string;
  accessToken: string;
  tokenExpiresAt?: Date;
  pageId?: string;
  pageName?: string;
  igUserId?: string;
  whatsappPhoneNumberId?: string;
}

export async function upsertSocialConnection(
  userId: string,
  data: SocialConnectionData,
): Promise<void> {
  const encrypted = encryptToken(data.accessToken);
  const now = new Date();
  const [existing] = await db
    .select({ id: socialConnections.id })
    .from(socialConnections)
    .where(and(eq(socialConnections.userId, userId), eq(socialConnections.provider, data.provider)))
    .limit(1);

  if (existing) {
    await db
      .update(socialConnections)
      .set({
        providerAccountId: data.providerAccountId,
        accessToken: encrypted,
        tokenExpiresAt: data.tokenExpiresAt ?? null,
        pageId: data.pageId ?? null,
        pageName: data.pageName ?? null,
        igUserId: data.igUserId ?? null,
        whatsappPhoneNumberId: data.whatsappPhoneNumberId ?? null,
        isActive: true,
        updatedAt: now,
      })
      .where(eq(socialConnections.id, existing.id));
    return;
  }

  await db.insert(socialConnections).values({
    userId,
    provider: data.provider,
    providerAccountId: data.providerAccountId,
    accessToken: encrypted,
    tokenExpiresAt: data.tokenExpiresAt ?? null,
    pageId: data.pageId ?? null,
    pageName: data.pageName ?? null,
    igUserId: data.igUserId ?? null,
    whatsappPhoneNumberId: data.whatsappPhoneNumberId ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

export const saveSocialConnection = upsertSocialConnection;

export async function getSocialConnection(
  userId: string,
  provider: string,
): Promise<SocialConnectionData | null> {
  const [row] = await db
    .select()
    .from(socialConnections)
    .where(and(eq(socialConnections.userId, userId), eq(socialConnections.provider, provider)))
    .limit(1);
  if (!row || !row.isActive) return null;
  const accessToken = decryptToken(row.accessToken);
  return {
    provider: row.provider as SocialProvider,
    providerAccountId: row.providerAccountId,
    accessToken,
    tokenExpiresAt: row.tokenExpiresAt ?? undefined,
    pageId: row.pageId ?? undefined,
    pageName: row.pageName ?? undefined,
    igUserId: row.igUserId ?? undefined,
    whatsappPhoneNumberId: row.whatsappPhoneNumberId ?? undefined,
  };
}

export async function deleteSocialConnection(userId: string, provider: string): Promise<void> {
  await db
    .delete(socialConnections)
    .where(and(eq(socialConnections.userId, userId), eq(socialConnections.provider, provider)));
}

export async function getAllSocialConnections(userId: string): Promise<SocialConnectionData[]> {
  const rows = await db
    .select()
    .from(socialConnections)
    .where(eq(socialConnections.userId, userId));
  return rows
    .filter((r) => r.isActive)
    .map((row) => ({
      provider: row.provider as SocialProvider,
      providerAccountId: row.providerAccountId,
      accessToken: decryptToken(row.accessToken),
      tokenExpiresAt: row.tokenExpiresAt ?? undefined,
      pageId: row.pageId ?? undefined,
      pageName: row.pageName ?? undefined,
      igUserId: row.igUserId ?? undefined,
      whatsappPhoneNumberId: row.whatsappPhoneNumberId ?? undefined,
    }));
}

export interface SocialStatusSummary {
  facebook: {
    connected: boolean;
    pageName?: string;
    pageId?: string;
    expiresAt?: string;
  };
  instagram: { connected: boolean; igUserId?: string };
  whatsapp: { cloudConfigured: boolean; shareLinksAvailable: true };
}

export async function getSocialStatusSummary(userId: string): Promise<SocialStatusSummary> {
  const [fbRow] = await db
    .select({
      pageName: socialConnections.pageName,
      pageId: socialConnections.pageId,
      tokenExpiresAt: socialConnections.tokenExpiresAt,
    })
    .from(socialConnections)
    .where(and(eq(socialConnections.userId, userId), eq(socialConnections.provider, "facebook")))
    .limit(1);

  const [igRow] = await db
    .select({ igUserId: socialConnections.igUserId })
    .from(socialConnections)
    .where(and(eq(socialConnections.userId, userId), eq(socialConnections.provider, "instagram")))
    .limit(1);

  const cloudConfigured = Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() && process.env.WHATSAPP_ACCESS_TOKEN?.trim(),
  );

  return {
    facebook: {
      connected: Boolean(fbRow?.pageId),
      pageName: fbRow?.pageName ?? undefined,
      pageId: fbRow?.pageId ?? undefined,
      expiresAt: fbRow?.tokenExpiresAt?.toISOString(),
    },
    instagram: {
      connected: Boolean(igRow?.igUserId),
      igUserId: igRow?.igUserId ?? undefined,
    },
    whatsapp: { cloudConfigured, shareLinksAvailable: true },
  };
}
