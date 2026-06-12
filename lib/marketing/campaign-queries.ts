import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { marketingCampaigns, products, whatsappRecipientGroups } from "@/lib/db/schema";

export type MarketingCampaignRow = typeof marketingCampaigns.$inferSelect;
export type WhatsappRecipientGroupRow = typeof whatsappRecipientGroups.$inferSelect;

export type MarketingCampaignListRow = MarketingCampaignRow & {
  productName: string | null;
};

export interface CampaignCreateInput {
  title: string;
  postText: string;
  whatsappText?: string | null;
  campaignKind?: "product" | "event";
  productId?: string | null;
  eventTitle?: string | null;
  eventDescription?: string | null;
  eventReferenceImageUrl?: string | null;
  bannerAspect?: string;
  imagePrompt?: string;
  imageUrl?: string;
  bannerImagePrompt?: string | null;
  bannerImageUrl?: string | null;
  imageRefinementPrompt?: string | null;
  /** Storefront `/shop/{slug}` (product campaigns only). */
  productPageUrl?: string | null;
  /** Landing URL for CTAs (homepage for events, product or tracking URL for products). */
  redirectUrl?: string | null;
  platforms: string[];
  createdBy: string;
}

export interface CampaignUpdateInput {
  title?: string;
  postText?: string;
  whatsappText?: string | null;
  campaignKind?: "product" | "event";
  productId?: string | null;
  eventTitle?: string | null;
  eventDescription?: string | null;
  eventReferenceImageUrl?: string | null;
  bannerAspect?: string;
  imagePrompt?: string;
  imageUrl?: string;
  bannerImagePrompt?: string | null;
  bannerImageUrl?: string | null;
  imageRefinementPrompt?: string | null;
  productPageUrl?: string | null;
  redirectUrl?: string | null;
  platforms?: string[];
  status?: string;
  publishedAt?: Date;
  facebookPostId?: string;
  instagramPostId?: string;
  whatsappRecipients?: number;
  errorLog?: string;
}

export async function createCampaign(
  input: CampaignCreateInput,
): Promise<MarketingCampaignRow> {
  const [row] = await db
    .insert(marketingCampaigns)
    .values({
      title: input.title,
      postText: input.postText,
      whatsappText:
        input.whatsappText === undefined ? null : input.whatsappText?.trim() ? input.whatsappText.trim() : null,
      campaignKind: input.campaignKind ?? "product",
      productId: input.productId ?? null,
      eventTitle: input.eventTitle ?? null,
      eventDescription: input.eventDescription ?? null,
      eventReferenceImageUrl: input.eventReferenceImageUrl ?? null,
      bannerAspect: input.bannerAspect ?? "16:9",
      imagePrompt: input.imagePrompt ?? null,
      imageUrl: input.imageUrl ?? null,
      bannerImagePrompt: input.bannerImagePrompt ?? null,
      bannerImageUrl: input.bannerImageUrl ?? null,
      imageRefinementPrompt: input.imageRefinementPrompt ?? null,
      productPageUrl:
        input.campaignKind === "event"
          ? null
          : (input.productPageUrl === undefined ? null : input.productPageUrl?.trim() || null),
      redirectUrl:
        input.redirectUrl === undefined ? null : input.redirectUrl?.trim() || null,
      platforms: input.platforms,
      createdBy: input.createdBy,
    })
    .returning();
  if (!row) throw new Error("CAMPAIGN_CREATE_FAILED");
  return row;
}

export async function getCampaignById(id: number): Promise<MarketingCampaignRow | null> {
  const [row] = await db
    .select()
    .from(marketingCampaigns)
    .where(eq(marketingCampaigns.id, id))
    .limit(1);
  return row ?? null;
}

export async function getCampaignApiBundle(
  id: number,
): Promise<{
  campaign: MarketingCampaignRow;
  product: { id: string; name: string; slug: string } | null;
} | null> {
  const campaign = await getCampaignById(id);
  if (!campaign) return null;
  if (!campaign.productId) return { campaign, product: null };
  const [p] = await db
    .select({ id: products.id, name: products.name, slug: products.slug })
    .from(products)
    .where(eq(products.id, campaign.productId))
    .limit(1);
  return { campaign, product: p ?? null };
}

export async function listCampaigns(limit = 50): Promise<MarketingCampaignListRow[]> {
  const rows = await db
    .select({
      id: marketingCampaigns.id,
      title: marketingCampaigns.title,
      postText: marketingCampaigns.postText,
      whatsappText: marketingCampaigns.whatsappText,
      campaignKind: marketingCampaigns.campaignKind,
      productId: marketingCampaigns.productId,
      eventTitle: marketingCampaigns.eventTitle,
      eventDescription: marketingCampaigns.eventDescription,
      eventReferenceImageUrl: marketingCampaigns.eventReferenceImageUrl,
      bannerAspect: marketingCampaigns.bannerAspect,
      imagePrompt: marketingCampaigns.imagePrompt,
      imageUrl: marketingCampaigns.imageUrl,
      bannerImagePrompt: marketingCampaigns.bannerImagePrompt,
      bannerImageUrl: marketingCampaigns.bannerImageUrl,
      imageRefinementPrompt: marketingCampaigns.imageRefinementPrompt,
      productPageUrl: marketingCampaigns.productPageUrl,
      redirectUrl: marketingCampaigns.redirectUrl,
      platforms: marketingCampaigns.platforms,
      status: marketingCampaigns.status,
      publishedAt: marketingCampaigns.publishedAt,
      facebookPostId: marketingCampaigns.facebookPostId,
      instagramPostId: marketingCampaigns.instagramPostId,
      whatsappRecipients: marketingCampaigns.whatsappRecipients,
      errorLog: marketingCampaigns.errorLog,
      createdBy: marketingCampaigns.createdBy,
      createdAt: marketingCampaigns.createdAt,
      updatedAt: marketingCampaigns.updatedAt,
      productName: products.name,
    })
    .from(marketingCampaigns)
    .leftJoin(products, eq(marketingCampaigns.productId, products.id))
    .orderBy(desc(marketingCampaigns.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    postText: r.postText,
    whatsappText: r.whatsappText,
    campaignKind: r.campaignKind,
    productId: r.productId,
    eventTitle: r.eventTitle,
    eventDescription: r.eventDescription,
    eventReferenceImageUrl: r.eventReferenceImageUrl,
    bannerAspect: r.bannerAspect,
    imagePrompt: r.imagePrompt,
    imageUrl: r.imageUrl,
    bannerImagePrompt: r.bannerImagePrompt,
    bannerImageUrl: r.bannerImageUrl,
    imageRefinementPrompt: r.imageRefinementPrompt,
    productPageUrl: r.productPageUrl,
    redirectUrl: r.redirectUrl,
    platforms: r.platforms,
    status: r.status,
    publishedAt: r.publishedAt,
    facebookPostId: r.facebookPostId,
    instagramPostId: r.instagramPostId,
    whatsappRecipients: r.whatsappRecipients,
    errorLog: r.errorLog,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    productName: r.productName,
  }));
}

export async function updateCampaign(id: number, input: CampaignUpdateInput): Promise<void> {
  const setObj: {
    updatedAt: Date;
    title?: string;
    postText?: string;
    whatsappText?: string | null;
    campaignKind?: string;
    productId?: string | null;
    eventTitle?: string | null;
    eventDescription?: string | null;
    eventReferenceImageUrl?: string | null;
    bannerAspect?: string;
    imagePrompt?: string | null;
    imageUrl?: string | null;
    bannerImagePrompt?: string | null;
    bannerImageUrl?: string | null;
    imageRefinementPrompt?: string | null;
    productPageUrl?: string | null;
    redirectUrl?: string | null;
    platforms?: string[];
    status?: string;
    publishedAt?: Date;
    facebookPostId?: string | null;
    instagramPostId?: string | null;
    whatsappRecipients?: number;
    errorLog?: string | null;
  } = { updatedAt: new Date() };
  if (input.title !== undefined) setObj.title = input.title;
  if (input.postText !== undefined) setObj.postText = input.postText;
  if (input.whatsappText !== undefined) {
    setObj.whatsappText = input.whatsappText?.trim() ? input.whatsappText.trim() : null;
  }
  if (input.campaignKind !== undefined) setObj.campaignKind = input.campaignKind;
  if (input.productId !== undefined) setObj.productId = input.productId ?? null;
  if (input.eventTitle !== undefined) setObj.eventTitle = input.eventTitle ?? null;
  if (input.eventDescription !== undefined) setObj.eventDescription = input.eventDescription ?? null;
  if (input.eventReferenceImageUrl !== undefined) {
    setObj.eventReferenceImageUrl = input.eventReferenceImageUrl ?? null;
  }
  if (input.bannerAspect !== undefined) setObj.bannerAspect = input.bannerAspect;
  if (input.imagePrompt !== undefined) setObj.imagePrompt = input.imagePrompt ?? null;
  if (input.imageUrl !== undefined) setObj.imageUrl = input.imageUrl ?? null;
  if (input.bannerImagePrompt !== undefined) setObj.bannerImagePrompt = input.bannerImagePrompt ?? null;
  if (input.bannerImageUrl !== undefined) setObj.bannerImageUrl = input.bannerImageUrl ?? null;
  if (input.imageRefinementPrompt !== undefined) {
    setObj.imageRefinementPrompt = input.imageRefinementPrompt ?? null;
  }
  if (input.productPageUrl !== undefined) {
    setObj.productPageUrl = input.productPageUrl ?? null;
  }
  if (input.redirectUrl !== undefined) {
    setObj.redirectUrl = input.redirectUrl ?? null;
  }
  if (input.platforms !== undefined) setObj.platforms = input.platforms;
  if (input.status !== undefined) setObj.status = input.status;
  if (input.publishedAt !== undefined) setObj.publishedAt = input.publishedAt;
  if (input.facebookPostId !== undefined) setObj.facebookPostId = input.facebookPostId ?? null;
  if (input.instagramPostId !== undefined) setObj.instagramPostId = input.instagramPostId ?? null;
  if (input.whatsappRecipients !== undefined) setObj.whatsappRecipients = input.whatsappRecipients;
  if (input.errorLog !== undefined) setObj.errorLog = input.errorLog ?? null;

  await db.update(marketingCampaigns).set(setObj).where(eq(marketingCampaigns.id, id));
}

export async function deleteCampaign(id: number): Promise<void> {
  await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id));
}

export async function createRecipientGroup(
  name: string,
  phoneNumbers: string[],
  description?: string,
): Promise<WhatsappRecipientGroupRow> {
  const [row] = await db
    .insert(whatsappRecipientGroups)
    .values({
      name,
      phoneNumbers,
      description: description ?? null,
    })
    .returning();
  if (!row) throw new Error("RECIPIENT_GROUP_CREATE_FAILED");
  return row;
}

export async function listRecipientGroups(): Promise<WhatsappRecipientGroupRow[]> {
  return db
    .select()
    .from(whatsappRecipientGroups)
    .orderBy(desc(whatsappRecipientGroups.createdAt));
}

export async function getRecipientGroup(id: number): Promise<WhatsappRecipientGroupRow | null> {
  const [row] = await db
    .select()
    .from(whatsappRecipientGroups)
    .where(eq(whatsappRecipientGroups.id, id))
    .limit(1);
  return row ?? null;
}

export async function countCampaignsByStatus(): Promise<{
  total: number;
  published: number;
  draft: number;
  failed: number;
}> {
  const grouped = await db
    .select({
      status: marketingCampaigns.status,
      c: sql<number>`cast(count(*) as int)`,
    })
    .from(marketingCampaigns)
    .groupBy(marketingCampaigns.status);

  let total = 0;
  let published = 0;
  let draft = 0;
  let failed = 0;
  for (const g of grouped) {
    const n = Number(g.c) || 0;
    total += n;
    if (g.status === "published" || g.status === "partial") published += n;
    else if (g.status === "draft") draft += n;
    else if (g.status === "failed") failed += n;
  }
  return { total, published, draft, failed };
}
