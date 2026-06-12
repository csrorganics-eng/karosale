import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { getCampaignById, getRecipientGroup, updateCampaign } from "@/lib/marketing/campaign-queries";
import { publishToFacebookPage } from "@/lib/marketing/facebook-publisher";
import { publishToInstagram } from "@/lib/marketing/instagram-publisher";
import {
  generateWhatsAppShareLink,
  isWhatsAppCloudConfigured,
  sendBulkWhatsApp,
} from "@/lib/marketing/whatsapp-publisher";
import { composeWhatsAppMarketingMessage, appendDestinationUrlsToCaption } from "@/lib/marketing/marketing-message-composition";
import { getSocialConnection } from "@/lib/marketing/social-token-store";

const bodySchema = z.object({
  platforms: z.array(z.enum(["facebook", "instagram", "whatsapp"])).min(1),
  whatsappCloudGroupId: z.number().int().positive().optional(),
});

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isTokenExpired(expiresAt: Date | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now() + 60_000;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(["admin"]);
    const userId = session.user.id;
    const { id: raw } = await context.params;
    const id = parseId(raw);
    if (id == null) return jsonError("Invalid id", 400);

    const campaign = await getCampaignById(id);
    if (!campaign) return jsonError("Not found", 404);

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid body", 400, parsed.error.flatten());

    const platforms = new Set(parsed.data.platforms);
    const results: {
      facebook?: { success: boolean; postId?: string; error?: string };
      instagram?: { success: boolean; postId?: string; error?: string };
      whatsapp?: { success: boolean; shareLink: string; cloudSent?: number; error?: string };
    } = {};

    const errors: string[] = [];
    let facebookPostId: string | undefined;
    let instagramPostId: string | undefined;
    let whatsappRecipients = 0;

    const captionForMeta = appendDestinationUrlsToCaption(campaign.postText, {
      redirectUrl: campaign.redirectUrl,
      productPageUrl: campaign.productPageUrl,
    });

    if (platforms.has("facebook")) {
      const conn = await getSocialConnection(userId, "facebook");
      if (!conn?.pageId) {
        const msg = "Connect Facebook first: Settings → Marketing channels.";
        results.facebook = { success: false, error: msg };
        errors.push(`facebook: ${msg}`);
      } else if (isTokenExpired(conn.tokenExpiresAt)) {
        const msg = "Facebook session expired — reconnect your account.";
        results.facebook = { success: false, error: msg };
        errors.push(`facebook: ${msg}`);
      } else {
        try {
          const r = await publishToFacebookPage({
            pageId: conn.pageId,
            pageAccessToken: conn.accessToken,
            message: captionForMeta,
            imageUrl: campaign.imageUrl ?? undefined,
          });
          facebookPostId = r.postId;
          results.facebook = { success: true, postId: r.postId };
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Facebook publish failed";
          results.facebook = { success: false, error: msg };
          errors.push(`facebook: ${msg}`);
        }
      }
    }

    if (platforms.has("instagram")) {
      if (!campaign.imageUrl) {
        const msg = "Instagram requires an image. Generate one first.";
        results.instagram = { success: false, error: msg };
        errors.push(`instagram: ${msg}`);
      } else {
        const conn = await getSocialConnection(userId, "instagram");
        if (!conn?.igUserId) {
          const msg = "Link Instagram to your Facebook Page, then reconnect under Settings → Marketing channels.";
          results.instagram = { success: false, error: msg };
          errors.push(`instagram: ${msg}`);
        } else if (isTokenExpired(conn.tokenExpiresAt)) {
          const msg = "Instagram session expired — reconnect your account.";
          results.instagram = { success: false, error: msg };
          errors.push(`instagram: ${msg}`);
        } else {
          try {
            const r = await publishToInstagram({
              igUserId: conn.igUserId,
              pageAccessToken: conn.accessToken,
              caption: captionForMeta,
              imageUrl: campaign.imageUrl,
            });
            instagramPostId = r.postId;
            results.instagram = { success: true, postId: r.postId };
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Instagram publish failed";
            results.instagram = { success: false, error: msg };
            errors.push(`instagram: ${msg}`);
          }
        }
      }
    }

    if (platforms.has("whatsapp")) {
      const waBase = (campaign.whatsappText?.trim() || campaign.postText).trim();
      const waMessage = composeWhatsAppMarketingMessage({
        body: waBase,
        imageUrl: campaign.imageUrl,
        redirectUrl: campaign.redirectUrl,
        productPageUrl: campaign.productPageUrl,
      });
      const share = generateWhatsAppShareLink(waMessage);
      let cloudSent: number | undefined;
      let waError: string | undefined;
      if (isWhatsAppCloudConfigured() && parsed.data.whatsappCloudGroupId != null) {
        const group = await getRecipientGroup(parsed.data.whatsappCloudGroupId);
        if (group && group.phoneNumbers.length > 0) {
          try {
            const bulk = await sendBulkWhatsApp(group.phoneNumbers, waMessage);
            cloudSent = bulk.sent;
            whatsappRecipients = bulk.sent;
            if (bulk.failed > 0) {
              waError = `${bulk.failed} Cloud API recipient(s) failed (share link still works).`;
            }
          } catch (e) {
            waError = e instanceof Error ? e.message : "WhatsApp Cloud send failed";
          }
        }
      }
      results.whatsapp = {
        success: true,
        shareLink: share.url,
        cloudSent,
        error: waError,
      };
    }

    const nonWa = parsed.data.platforms.filter((p) => p !== "whatsapp");
    const fbIgOk =
      nonWa.length === 0 ||
      nonWa.every((p) => {
        const r = results[p as "facebook" | "instagram"];
        return Boolean(r && "success" in r && r.success);
      });
    const allOk = fbIgOk;

    let status: "published" | "partial" | "failed";
    if (allOk) status = "published";
    else if (nonWa.some((p) => results[p as "facebook" | "instagram"]?.success)) status = "partial";
    else status = "failed";

    const errorLog = errors.length > 0 ? errors.join("\n") : null;

    await updateCampaign(id, {
      status,
      publishedAt: new Date(),
      facebookPostId,
      instagramPostId,
      whatsappRecipients,
      errorLog: errorLog ?? undefined,
    });

    const updated = await getCampaignById(id);
    return jsonOk({
      success: allOk,
      results,
      campaign: updated,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return jsonError("Forbidden", 403);
    if (e instanceof Error && e.message === "Unauthorized") return jsonError("Unauthorized", 401);
    console.error("[POST /api/admin/marketing/campaigns/[id]/publish]", e);
    return jsonError("Publish failed", 500);
  }
}
