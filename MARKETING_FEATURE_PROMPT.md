# AI Marketing Content Studio — Cursor Implementation Prompt
## CSR Organics / Karosale — Facebook · Instagram · WhatsApp Publisher

---

## CONTEXT & GOAL

This codebase is a Next.js 15 App Router e-commerce platform (CSR Organics / Karosale) for organic products in India. The stack is: Next.js 15, Neon PostgreSQL, Drizzle ORM, Vercel, Tailwind CSS, shadcn/ui components, NextAuth, Inngest background jobs.

Existing AI infrastructure:
- `lib/ai-router.ts` — multi-provider chat router (Groq → Cerebras → Gemini OpenAI-compat)
- `lib/gemini.ts` — Google Gemini SDK for long-context tasks
- Admin section lives under `app/admin/` with role-based access via `requireRole(["admin"])`
- Shared UI components in `components/ui/` (shadcn/ui — Button, Card, Dialog, Input, Textarea, Select, Badge, Tabs, etc.)
- API responses use `jsonOk` / `jsonError` from `lib/api-response.ts`

**The feature to build:** A complete AI Marketing Content Studio inside the existing admin panel at `/admin/marketing`. This feature lets admins:
1. Generate marketing post text + promotional image using AI (free tier only)
2. Preview and edit the content before publishing
3. Publish directly to Facebook Page and Instagram Business account via Meta Graph API
4. Share to WhatsApp via `wa.me` deep-link (zero-API, works on free tier forever) with optional WhatsApp Business Cloud API integration for bulk sending when configured
5. Keep a history log of all published/sent campaigns in the database

**Constraint: 100% free tier.** Every service used must be available on a free plan with no billing required for normal usage volumes (a small organic brand posting 1–5 times per week).

---

## FREE-TIER SERVICE OVERVIEW

### Content Generation (AI Text)
- **Primary:** `lib/ai-router.ts` (already exists) — routes through Groq (free, 30 RPM) → Cerebras (free, 1M tokens/day) → Gemini (free, 15 RPM)
- No new AI service needed for text generation

### Image Generation (Free, No Key Required)
- **Pollinations.ai** — completely free, no API key, no sign-up required
- Image URL pattern: `https://image.pollinations.ai/prompt/{encoded-prompt}?width=1080&height=1080&model=flux&nologo=true`
- Returns a JPEG directly — use as `<img src>` or download as Buffer for upload to Meta
- This is the primary image generation path

### Facebook & Instagram Publishing
- **Meta Graph API** — free forever for publishing to Pages/Business accounts you own
- Auth: OAuth 2.0 — admin connects their Facebook account once, gets a long-lived Page Access Token stored in DB
- Facebook post: `POST https://graph.facebook.com/v21.0/{page-id}/feed`
- Instagram post (requires image URL): `POST https://graph.facebook.com/v21.0/{ig-user-id}/media` then `POST .../media_publish`
- Rate limit: 200 calls/hour per user token (sufficient for 1-5 posts/week)
- **Requires:** Facebook App (free to create at developers.facebook.com), App Review for `pages_manage_posts` + `instagram_basic` + `instagram_content_publish` permissions
- **Important:** Facebook App Review is required for production but the app works in Development Mode for testing with the admin's own accounts — document this clearly in the UI

### WhatsApp (Two approaches, both free)
#### Approach A — wa.me Share Link (Zero API, always free)
- URL: `https://wa.me/?text={encoded-text}` — opens WhatsApp on any device with pre-filled message
- No API key, no approval, works instantly
- User must tap send manually (limitation accepted for free tier)
- Great for sharing to personal contacts / groups

#### Approach B — WhatsApp Business Cloud API (Meta, optional enhancement)
- **Important pricing update (November 2024):** Meta removed the 1,000 free service conversations/month tier. Marketing template messages are **always paid** (per-message fees vary by country, ~$0.011/conversation in India). There is no ongoing free marketing messaging tier.
- **What IS free:** A 72-hour conversation window when customers initiate contact via Click-to-WhatsApp ads or Facebook Page buttons.
- Requires: Meta Business Account + WhatsApp Business Account + phone number verification + credit card on file for production messaging
- API: `POST https://graph.facebook.com/v21.0/{phone-number-id}/messages`
- For marketing templates: must submit for Meta approval (minutes to 24h), then each send costs money
- **Implementation strategy:** Build the wa.me primary path (always free). The Cloud API path is an optional, future-facing integration. If `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` are not configured, the system works perfectly via wa.me links only.
- **For this free-tier feature:** wa.me share links are the complete WhatsApp solution. The Cloud API code path is scaffolded but clearly marked as "optional paid upgrade" in the UI.

---

## DATABASE SCHEMA CHANGES

Add to `lib/db/schema.ts` (Drizzle ORM, PostgreSQL):

```typescript
// Marketing campaigns (enhanced from any existing campaigns table, or new)
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  postText: text("post_text").notNull(),
  imagePrompt: text("image_prompt"),
  imageUrl: text("image_url"), // Pollinations URL or uploaded URL
  platforms: text("platforms").array().notNull().default(sql`'{}'::text[]`), // ["facebook","instagram","whatsapp"]
  status: text("status").notNull().default("draft"), // draft | published | partial | failed
  publishedAt: timestamp("published_at"),
  facebookPostId: text("facebook_post_id"),
  instagramPostId: text("instagram_post_id"),
  whatsappRecipients: integer("whatsapp_recipients").default(0),
  errorLog: text("error_log"),
  createdBy: text("created_by").notNull(), // userId
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Social media connections (OAuth tokens per admin)
export const socialConnections = pgTable("social_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(), // "facebook" | "instagram" | "whatsapp"
  providerAccountId: text("provider_account_id").notNull(),
  accessToken: text("access_token").notNull(), // encrypted at rest
  tokenExpiresAt: timestamp("token_expires_at"),
  pageId: text("page_id"), // Facebook Page ID
  pageName: text("page_name"),
  igUserId: text("ig_user_id"), // Instagram Business User ID
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uniqueProviderUser: unique().on(t.userId, t.provider),
}));

// WhatsApp recipient groups (for optional Cloud API path)
export const whatsappRecipientGroups = pgTable("whatsapp_recipient_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phoneNumbers: text("phone_numbers").array().notNull().default(sql`'{}'::text[]`), // E.164 format
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

Run `db:push` after schema changes. No migration file needed for this project's workflow.

---

## ENV VARS TO ADD TO `.env.example` AND `.env.local`

```bash
# Meta / Facebook App (free — create at developers.facebook.com)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# WhatsApp Business Cloud API (optional — free 1000 conversations/month)
# Leave empty to use wa.me share links only
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=

# Pollinations.ai — NO KEY NEEDED (completely free, public API)
# Image generation base URL (no env var needed, hardcoded is fine)
```

---

## FILE STRUCTURE TO CREATE

```
app/
  admin/
    marketing/
      page.tsx                          ← Marketing hub (list campaigns + stats)
      new/
        page.tsx                        ← Create new campaign (AI generator + editor)
      [id]/
        page.tsx                        ← Campaign detail / edit / publish
      connect/
        page.tsx                        ← Social media OAuth connection manager

app/
  api/
    admin/
      marketing/
        campaigns/
          route.ts                      ← GET list, POST create
          [id]/
            route.ts                    ← GET detail, PATCH update, DELETE
            publish/
              route.ts                  ← POST publish to selected platforms
        generate/
          route.ts                      ← POST generate text + image via AI
        social/
          connect/
            facebook/
              route.ts                  ← GET initiate OAuth, GET callback
          disconnect/
            route.ts                    ← POST disconnect provider
          status/
            route.ts                    ← GET connected accounts status
        whatsapp/
          groups/
            route.ts                    ← GET list, POST create recipient groups
          send/
            route.ts                    ← POST send via Cloud API (if configured)

lib/
  marketing/
    ai-content-generator.ts             ← Text generation via ai-router.ts
    image-generator.ts                  ← Pollinations.ai image generation
    facebook-publisher.ts               ← Facebook Graph API publisher
    instagram-publisher.ts              ← Instagram Graph API publisher
    whatsapp-publisher.ts               ← wa.me links + optional Cloud API
    social-token-store.ts               ← Encrypted token storage/retrieval
    campaign-queries.ts                 ← Drizzle queries for campaigns
```

---

## IMPLEMENTATION — DETAILED SPECIFICATIONS

---

### `lib/marketing/ai-content-generator.ts`

```typescript
import { routerChatCompletion } from "@/lib/ai-router";

export interface MarketingContentRequest {
  productName?: string;
  productDescription?: string;
  campaignGoal: "sale" | "launch" | "awareness" | "seasonal" | "custom";
  tone: "professional" | "friendly" | "festive" | "urgent";
  language: "english" | "hindi" | "hinglish";
  brandName: string; // from process.env.NEXT_PUBLIC_BUSINESS_NAME or BUSINESS_NAME
  customInstructions?: string;
}

export interface MarketingContentResult {
  postText: string;
  hashtags: string[];
  imagePrompt: string; // optimized prompt for Pollinations.ai
  whatsappText: string; // shorter version for WhatsApp (no hashtags, conversational)
}

// generateMarketingContent
// Calls routerChatCompletion with a structured prompt.
// System prompt instructs the model to respond ONLY with valid JSON matching MarketingContentResult.
// Parse response JSON. If parse fails, retry once. If second failure, throw Error("CONTENT_GENERATION_FAILED").
// Export as named async function.

export async function generateMarketingContent(
  req: MarketingContentRequest
): Promise<MarketingContentResult>
```

**Prompt template to use inside the function:**

```
System: You are an expert digital marketing copywriter for an organic products brand in India.
You ALWAYS respond with ONLY valid JSON, no markdown, no explanation.
JSON schema: { "postText": string, "hashtags": string[], "imagePrompt": string, "whatsappText": string }

Rules:
- postText: engaging social media post, 2-4 sentences, include emojis naturally
- hashtags: 5-10 relevant hashtags without # prefix (add # in postText)
- imagePrompt: detailed prompt for AI image generation — describe the scene, colors, mood, product placement. Include "organic", "natural", "indian aesthetic" cues. Optimized for Flux image model.
- whatsappText: conversational shorter version, ends with a question or CTA, no hashtags

User: Create marketing content for:
Brand: {brandName}
Product: {productName || "our organic products range"}
Goal: {campaignGoal}
Tone: {tone}
Language: {language}
{customInstructions ? "Extra instructions: " + customInstructions : ""}
```

---

### `lib/marketing/image-generator.ts`

```typescript
export interface ImageGenerationOptions {
  prompt: string;
  width?: number;  // default 1080
  height?: number; // default 1080
  aspectRatio?: "square" | "portrait" | "landscape"; // maps to preset dimensions
}

export interface GeneratedImage {
  url: string;        // Pollinations.ai URL (direct use as img src)
  downloadUrl: string; // same URL — Pollinations returns image directly
  prompt: string;     // the prompt used (after enhancement)
}

// buildSignedMarketingImageUrl(origin, prompt, width, height, seed?, ttlSec?) — HMAC-signed same-origin URL to GET /api/marketing/public-image (server uses POLLINATIONS_API_KEY / sk_; no deprecated pk_ in the browser).
// Admin UI calls POST /api/admin/marketing/image-url to obtain a fresh signed URL (including random seed for “regenerate”).

// enhancePromptForOrganic(prompt: string): string
// Appends: ", high quality photography, vibrant colors, clean background, professional product shot, warm natural lighting" if not already containing "photography" or "professional"

// generateMarketingImage(options: ImageGenerationOptions): Promise<GeneratedImage>
// Validates prompt length (max 500 chars after enhancement)
// Returns the GeneratedImage object immediately — Pollinations is synchronous via URL
// Does NOT make a fetch call here — image loads lazily in browser/on upload
// For server-side upload (Instagram requires image upload), export a separate:

// fetchImageAsBuffer(url: string): Promise<Buffer>
// Uses native fetch to download the image from Pollinations URL
// Sets User-Agent header: "CSROrganics-MarketingBot/1.0"
// Returns Buffer. Throws if status !== 200.
```

---

### `lib/marketing/social-token-store.ts`

```typescript
// Handles encrypted storage and retrieval of OAuth tokens in the social_connections table.
// Uses AES-256-GCM encryption with key from SOCIAL_TOKEN_ENCRYPTION_KEY env var.
// If SOCIAL_TOKEN_ENCRYPTION_KEY is not set, fall back to AUTH_SECRET (which is always set).

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { socialConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// encryptToken(token: string): string — AES-256-GCM, returns "iv:authTag:ciphertext" hex string
// decryptToken(encrypted: string): string — reverses above

export interface SocialConnectionData {
  provider: "facebook" | "instagram" | "whatsapp";
  providerAccountId: string;
  accessToken: string; // will be encrypted before storage
  tokenExpiresAt?: Date;
  pageId?: string;
  pageName?: string;
  igUserId?: string;
  whatsappPhoneNumberId?: string;
}

// upsertSocialConnection(userId: string, data: SocialConnectionData): Promise<void>
// saveSocialConnection(userId: string, data: SocialConnectionData): Promise<void>  [alias]
// getSocialConnection(userId: string, provider: string): Promise<SocialConnectionData | null>
//   — decrypts token before returning
// deleteSocialConnection(userId: string, provider: string): Promise<void>
// getAllSocialConnections(userId: string): Promise<SocialConnectionData[]>
```

---

### `lib/marketing/facebook-publisher.ts`

```typescript
// Facebook Graph API v21.0 publisher

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export interface FacebookPublishOptions {
  pageId: string;
  pageAccessToken: string;
  message: string;
  imageUrl?: string; // If provided, publishes as photo post; otherwise text post
}

export interface FacebookPublishResult {
  postId: string;
  success: true;
}

// publishToFacebookPage(options: FacebookPublishOptions): Promise<FacebookPublishResult>
//
// Logic:
// If imageUrl provided:
//   1. Fetch image as Buffer using fetchImageAsBuffer from image-generator.ts
//   2. Upload to FB: POST /v21.0/{pageId}/photos with multipart form: source=<buffer>, caption=<message>, published=true
//   3. Extract post_id from response
// Else:
//   1. POST /v21.0/{pageId}/feed with { message, access_token: pageAccessToken }
//   2. Extract id from response
//
// On HTTP error: parse FB error response { error: { message, code } }, throw Error with code+message
// On network error: throw with descriptive message

// exchangeForLongLivedToken(shortToken: string): Promise<{ accessToken: string; expiresAt: Date }>
// POST https://graph.facebook.com/oauth/access_token
// params: grant_type=fb_exchange_token, client_id=FACEBOOK_APP_ID, client_secret=FACEBOOK_APP_SECRET, fb_exchange_token=shortToken
// Long-lived tokens last ~60 days. Store in DB.

// getPagesList(userAccessToken: string): Promise<Array<{ id: string; name: string; access_token: string }>>
// GET /v21.0/me/accounts — returns pages the user manages
```

---

### `lib/marketing/instagram-publisher.ts`

```typescript
// Instagram Graph API publisher (via Facebook Graph API)
// Requires: Instagram Business/Creator account linked to Facebook Page

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export interface InstagramPublishOptions {
  igUserId: string;
  pageAccessToken: string; // Facebook Page token (works for IG via same app)
  caption: string;
  imageUrl: string; // Instagram REQUIRES an image — must be publicly accessible URL
}

export interface InstagramPublishResult {
  postId: string;
  success: true;
}

// publishToInstagram(options: InstagramPublishOptions): Promise<InstagramPublishResult>
//
// Instagram Graph API requires 2-step publish:
// Step 1: Create media container
//   POST /v21.0/{igUserId}/media
//   body: { image_url: <publicly accessible URL>, caption, access_token }
//   Note: Pollinations URLs ARE publicly accessible — use them directly
//   Response: { id: containerId }
//
// Step 2: Publish the container
//   POST /v21.0/{igUserId}/media_publish
//   body: { creation_id: containerId, access_token }
//   Response: { id: postId }
//
// Poll for container status between steps (max 10s, check every 2s):
//   GET /v21.0/{containerId}?fields=status_code&access_token=...
//   Wait until status_code === "FINISHED" before publishing
//   If status_code === "ERROR" after timeout: throw with descriptive error
//
// getLinkedInstagramAccount(pageId: string, pageAccessToken: string): Promise<{ igUserId: string; username: string } | null>
//   GET /v21.0/{pageId}?fields=instagram_business_account&access_token=...
//   Returns igUserId if linked, null if not
```

---

### `lib/marketing/whatsapp-publisher.ts`

```typescript
// WhatsApp publisher: wa.me links (primary, always free) + Cloud API (optional)

export interface WhatsAppShareLink {
  url: string;        // wa.me link for sharing
  mobileUrl: string;  // intent://send?... for mobile deep link
  text: string;       // the message text
}

// generateWhatsAppShareLink(text: string): WhatsAppShareLink
// url: `https://wa.me/?text=${encodeURIComponent(text)}`
// mobileUrl: same — wa.me works universally

// For Cloud API (optional, when WHATSAPP_PHONE_NUMBER_ID is configured):

export interface WhatsAppCloudApiOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string;         // E.164 format: +919876543210
  message: string;
}

export interface WhatsAppSendResult {
  messageId: string;
  success: true;
  to: string;
}

// sendWhatsAppMessage(options: WhatsAppCloudApiOptions): Promise<WhatsAppSendResult>
// POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
// body: {
//   messaging_product: "whatsapp",
//   to: options.to,
//   type: "text",
//   text: { body: options.message }
// }
// Headers: Authorization: Bearer {accessToken}, Content-Type: application/json
//
// isWhatsAppCloudConfigured(): boolean
// Returns !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN)
//
// sendBulkWhatsApp(recipients: string[], message: string): Promise<{ sent: number; failed: number; errors: string[] }>
// Iterates recipients, calls sendWhatsAppMessage for each
// Rate limit: add 200ms delay between sends to stay within Meta rate limits
// Collects results, returns summary
```

---

### `lib/marketing/campaign-queries.ts`

```typescript
// All Drizzle ORM queries for marketing_campaigns and whatsapp_recipient_groups

import { db } from "@/lib/db";
import { marketingCampaigns, whatsappRecipientGroups } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export interface CampaignCreateInput {
  title: string;
  postText: string;
  imagePrompt?: string;
  imageUrl?: string;
  platforms: string[];
  createdBy: string;
}

export interface CampaignUpdateInput {
  title?: string;
  postText?: string;
  imagePrompt?: string;
  imageUrl?: string;
  platforms?: string[];
  status?: string;
  publishedAt?: Date;
  facebookPostId?: string;
  instagramPostId?: string;
  whatsappRecipients?: number;
  errorLog?: string;
}

// createCampaign(input: CampaignCreateInput): Promise<typeof marketingCampaigns.$inferSelect>
// getCampaignById(id: number): Promise<typeof marketingCampaigns.$inferSelect | null>
// listCampaigns(limit?: number): Promise<Array<typeof marketingCampaigns.$inferSelect>>
// updateCampaign(id: number, input: CampaignUpdateInput): Promise<void>
// deleteCampaign(id: number): Promise<void>
// createRecipientGroup(name: string, phoneNumbers: string[], description?: string): Promise<...>
// listRecipientGroups(): Promise<Array<...>>
// getRecipientGroup(id: number): Promise<... | null>
```

---

## API ROUTES — DETAILED SPECIFICATIONS

---

### `app/api/admin/marketing/generate/route.ts`

```typescript
// POST /api/admin/marketing/generate
// Generates marketing text content and image prompt using AI
// Auth: requireRole(["admin"])

import { requireRole } from "@/lib/auth-helpers"; // or equivalent pattern in this codebase
import { generateMarketingContent } from "@/lib/marketing/ai-content-generator";
import { buildSignedMarketingImageUrl } from "@/lib/marketing/image-generator";
import { jsonOk, jsonError } from "@/lib/api-response";

// Request body (Zod validated):
// {
//   productName?: string (max 100)
//   productDescription?: string (max 500)
//   campaignGoal: "sale" | "launch" | "awareness" | "seasonal" | "custom"
//   tone: "professional" | "friendly" | "festive" | "urgent"
//   language: "english" | "hindi" | "hinglish"
//   customInstructions?: string (max 200)
// }

// Response:
// {
//   postText: string
//   hashtags: string[]
//   imagePrompt: string
//   imageUrl: string      ← Pollinations URL ready for <img src>
//   whatsappText: string
// }

// On AI router exhausted: return 503 with { error: "AI service temporarily unavailable. Please try again in a minute." }
// On validation error: 400
// On unexpected error: 500
```

---

### `app/api/admin/marketing/campaigns/route.ts`

```typescript
// GET  /api/admin/marketing/campaigns — list campaigns (last 50, desc by createdAt)
// POST /api/admin/marketing/campaigns — create campaign
// Auth: requireRole(["admin"])

// POST body (Zod):
// { title: string, postText: string, imagePrompt?: string, imageUrl?: string, platforms: string[] }

// GET response: { campaigns: CampaignRow[] }
// POST response: { campaign: CampaignRow }
```

---

### `app/api/admin/marketing/campaigns/[id]/route.ts`

```typescript
// GET    /api/admin/marketing/campaigns/[id] — get single campaign
// PATCH  /api/admin/marketing/campaigns/[id] — update (all fields optional)
// DELETE /api/admin/marketing/campaigns/[id] — delete
// Auth: requireRole(["admin"])
```

---

### `app/api/admin/marketing/campaigns/[id]/publish/route.ts`

```typescript
// POST /api/admin/marketing/campaigns/[id]/publish
// Publishes a campaign to selected platforms
// Auth: requireRole(["admin"])

// Request body:
// { platforms: ("facebook" | "instagram" | "whatsapp")[] }

// Logic:
// 1. Load campaign by id — return 404 if not found
// 2. Load social connections for current user (session.user.id)
// 3. For each platform in platforms array:
//    facebook:
//      - Check connection exists and token not expired
//      - Call publishToFacebookPage({ pageId, pageAccessToken: decryptToken(conn.accessToken), message: campaign.postText, imageUrl: campaign.imageUrl })
//      - On success: record facebookPostId
//      - On error: record in errorLog, mark partial failure
//    instagram:
//      - Check connection, igUserId
//      - Campaign MUST have imageUrl (Instagram requires image)
//      - If no imageUrl: record error "Instagram requires an image. Generate one first."
//      - Call publishToInstagram(...)
//      - On success: record instagramPostId
//    whatsapp:
//      - If isWhatsAppCloudConfigured(): use Cloud API with default recipient group OR just log as "shared"
//      - Always return wa.me shareLink in response regardless
//
// 4. Update campaign: status="published"|"partial"|"failed", publishedAt=now(), facebookPostId, instagramPostId, errorLog
// 5. Return:
// {
//   success: boolean
//   results: {
//     facebook?: { success: boolean; postId?: string; error?: string }
//     instagram?: { success: boolean; postId?: string; error?: string }
//     whatsapp?: { success: boolean; shareLink: string; cloudSent?: number; error?: string }
//   }
//   campaign: UpdatedCampaignRow
// }
```

---

### `app/api/admin/marketing/social/connect/facebook/route.ts`

```typescript
// GET /api/admin/marketing/social/connect/facebook
//   — Redirects to Facebook OAuth dialog
//   — OAuth URL: https://www.facebook.com/v21.0/dialog/oauth
//   — scope: pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management
//   — redirect_uri: {NEXT_PUBLIC_APP_URL}/api/admin/marketing/social/connect/facebook/callback
//   — state: JWT-signed { userId, timestamp } to prevent CSRF

// GET /api/admin/marketing/social/connect/facebook?code={code}&state={state}
//   (Facebook redirects here with code param — same route handles both)
//   — Verify state
//   — Exchange code for short-lived token: POST https://graph.facebook.com/v21.0/oauth/access_token
//   — Exchange for long-lived token: exchangeForLongLivedToken(shortToken)
//   — Fetch pages list: getPagesList(longLivedToken)
//   — If pages found: save first page (or let user choose — see UI)
//   — Fetch Instagram account linked to page: getLinkedInstagramAccount(...)
//   — Save connection: upsertSocialConnection for facebook (and instagram if found)
//   — Redirect to /admin/marketing/connect?success=true

// Route must detect whether "code" query param is present to determine if it's the callback
```

---

### `app/api/admin/marketing/social/status/route.ts`

```typescript
// GET /api/admin/marketing/social/status
// Returns connection status for all social platforms

// Response:
// {
//   facebook: { connected: boolean; pageName?: string; pageId?: string; expiresAt?: string }
//   instagram: { connected: boolean; igUserId?: string }
//   whatsapp: { cloudConfigured: boolean; shareLinksAvailable: true }
// }
```

---

## UI PAGES — DETAILED SPECIFICATIONS

### General UI requirements
- Use existing shadcn/ui components (Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Separator, Label)
- Match the existing admin layout: import `AdminLayout` or use the admin shell that wraps `app/admin/` pages
- Use `useToast` (or sonner `toast`) for notifications — match whatever toasting pattern exists in this codebase
- All pages are Server Components at the top level with Client Component islands for interactive parts
- Responsive: mobile-first, works on mobile for quick content sharing

---

### `app/admin/marketing/page.tsx` — Marketing Hub

**Server Component** that fetches recent campaigns and connection status.

Layout:
```
[Marketing Content Studio]                    [+ New Campaign]

[Stats Row]
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Total Posts  │  │  Published   │  │   Drafts     │  │   Failed     │
│     24       │  │     20       │  │     3        │  │     1        │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

[Connected Accounts]
┌─────────────────────────────────────────────────────────────────────┐
│  Facebook  ● Connected — "CSR Organics Page"    [Reconnect]         │
│  Instagram ● Connected — via Facebook           [Reconnect]         │
│  WhatsApp  ● Share links: Always available      [Setup Cloud API]   │
└─────────────────────────────────────────────────────────────────────┘

[Recent Campaigns]
┌────────────────────────────────────────────────────────────────────────────┐
│ Campaign Title    │ Platforms          │ Status      │ Date       │ Actions │
│ Diwali Sale 2024  │ FB IG WA           │ Published   │ Nov 1      │ View    │
│ Turmeric Launch   │ FB IG              │ Draft       │ Nov 3      │ Edit    │
└────────────────────────────────────────────────────────────────────────────┘
```

Client islands:
- `CampaignStatsCards` — shows counts from campaigns list
- `SocialConnectionStatus` — shows connection status with connect/reconnect buttons
- `CampaignsTable` — sortable list with action buttons

---

### `app/admin/marketing/new/page.tsx` — Create Campaign (AI Generator)

This is a **Client Component** page (heavy interaction). All state managed with `useState`.

**Three-step wizard UI:**

```
Step 1: Generate     Step 2: Preview & Edit     Step 3: Publish
  ●──────────────────────○────────────────────────○

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: AI Content Generator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product / Campaign (optional)
[___________________________]

Goal:  [Sale ▾]    Tone:  [Festive ▾]    Language: [Hinglish ▾]

Extra Instructions (optional)
[___________________________________]

[✨ Generate Content]   ← Button, shows spinner during generation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: Preview & Edit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Post Preview — Social Card]              [Image Preview]
┌──────────────────────────────────┐      ┌────────────────────┐
│ CSR Organics                     │      │                    │
│ [Post text here with emojis...]  │      │  [Generated Image] │
│ #organic #health #india          │      │  1080×1080         │
└──────────────────────────────────┘      │                    │
                                          └────────────────────┘
                                          [🔄 Regenerate Image]

Edit Post Text:
[Textarea — editable, pre-filled with generated text]
Characters: 240/500

Edit Image Prompt:
[Input — editable]

WhatsApp Message Preview:
[Textarea — editable, pre-filled with whatsappText]

Hashtags: #organic  #health  #india  [+ add]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: Publish
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Select Platforms:
☑ Facebook  — Post to "CSR Organics Page"
☑ Instagram — Post via linked account  
☑ WhatsApp  — Share link (opens WhatsApp with pre-filled message)

[💾 Save as Draft]           [🚀 Publish Now]
```

**Behavior:**
- Step 1 → Step 2: After clicking Generate, call `POST /api/admin/marketing/generate`, populate all fields, auto-advance to Step 2 with a smooth transition
- Image appears using `<img src={pollinationsUrl} />` — lazy loads directly from Pollinations CDN (no server download needed for preview)
- "Regenerate Image" button appends random seed to URL to get a variation
- Step 2 → Step 3: Click "Next" or "Publish" button — auto-saves draft to DB first
- Step 3 Publish: call `POST /api/admin/marketing/campaigns/[id]/publish`, show per-platform status indicators, then show success with share links
- WhatsApp share link opens in new tab when clicked for instant sharing
- After publish: redirect to `/admin/marketing` with success toast

**Loading states:**
- Generate button: spinner + "Generating…" text
- Image: skeleton placeholder while loading
- Publish button: spinner + "Publishing…" text with per-platform progress

---

### `app/admin/marketing/connect/page.tsx` — Social Media Connections

```
[Social Media Connections]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Facebook & Instagram
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Facebook Logo]  [Not Connected]

Connect your Facebook account to publish to your Facebook Page
and linked Instagram Business account in one step.

[🔗 Connect Facebook Account]  ← OAuth button

Permissions requested:
• pages_manage_posts (post to your Pages)
• instagram_content_publish (post to Instagram)
• pages_read_engagement (read page info)

Note: Your Facebook App must be in Live mode for customers to
connect. In Development mode, only test users and app admins can connect.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WhatsApp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ WhatsApp Share Links — Always available, no setup needed

Share pre-filled messages to WhatsApp contacts directly from
any campaign. Works on mobile and desktop instantly.

[Optional] WhatsApp Business Cloud API
For automated bulk sending (Free: 1,000 messages/month):
• Configure WHATSAPP_PHONE_NUMBER_ID in environment settings
• Configure WHATSAPP_ACCESS_TOKEN in environment settings

Status: {cloudConfigured ? "✅ Cloud API Connected" : "⚙️ Not configured (share links active)"}
```

---

### Add to Admin Navigation (`lib/admin-nav.ts`)

The existing admin nav defines sections. Find the Marketing entry and update its href/children to include the new pages. If Marketing section already exists (campaigns), ensure the new Studio link is added. Follow the exact pattern/structure of existing nav items in that file.

---

## INTEGRATION REQUIREMENTS — CROSS-CUTTING

### Authentication pattern
Every API route must follow the existing admin authentication pattern. Look at existing admin routes like `app/api/admin/products/ai-copy/route.ts` for the exact `requireRole(["admin"])` usage and apply identically.

### Error handling
- All API routes: use `jsonOk` / `jsonError` from `lib/api-response.ts`
- TypeScript strict — no `any` casts
- Never log API keys or access tokens
- Catch-all try/catch at route level with `500` fallback

### Token security
- Access tokens stored encrypted in DB (AES-256-GCM via `social-token-store.ts`)
- Tokens never returned to client in API responses (mask or omit from GET responses)
- Token expiry check before each publish — if expired, return actionable error prompting reconnect

### Facebook App setup (documented in UI)
The Connect page must include inline instructions for app review because this is a common blocker. Show the following note when NOT connected:
```
Setup Required (one-time):
1. Create a free Facebook App at developers.facebook.com
2. Add "Facebook Login" and "Instagram Graph API" products
3. Add your domain to Valid OAuth Redirect URIs
4. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in your environment
5. For production: submit for App Review (pages_manage_posts, instagram_content_publish)
   — Development mode works for your own accounts immediately
```

---

## INVARIANTS — MUST HOLD AFTER IMPLEMENTATION

1. **TypeScript compiles with zero errors** (`tsc --noEmit`). No `@ts-ignore`, no `as any`.

2. **No API keys exposed to client.** FACEBOOK_APP_SECRET, WHATSAPP_ACCESS_TOKEN, and DB-stored tokens must never appear in client-side code or API responses.

3. **Pollinations.ai requires no API key.** Never add an API key or env var for Pollinations.

4. **wa.me share links work without any configuration.** The WhatsApp share functionality must be available even when no Social connections are set up and WHATSAPP_* env vars are missing.

5. **Graceful degradation at every step:**
   - No Facebook connection → publish button disables Facebook, shows "Connect Facebook first"
   - No Instagram (not linked to page) → shows "Link Instagram to your Facebook Page"
   - No image → Instagram publish blocked with explanation; Facebook text-only works
   - AI router exhausted → generate button shows friendly error, does not crash

6. **Existing codebase is untouched.** Do NOT modify:
   - `lib/gemini.ts`
   - `lib/ai-router.ts`
   - `lib/chat/run-shop-chat.ts`
   - Any existing Inngest functions
   - Any existing storefront or checkout code
   - Any existing admin pages outside of `lib/admin-nav.ts`

7. **Database:** Only add new tables. Never alter or drop existing tables.

8. **Drizzle schema changes** must add new tables to the bottom of `lib/db/schema.ts` following the existing pattern (pgTable, serial primary key, etc.) and export them.

9. **All server actions / API routes** must use proper Next.js 15 App Router patterns. No `getServerSideProps` or Pages Router patterns.

10. **Mobile-friendly publish:** The wa.me share link flow must work seamlessly on mobile — `https://wa.me/?text=...` opens the native WhatsApp app with pre-filled message.

---

## VERIFICATION CHECKLIST

After implementation, verify each item:

**TypeScript:**
- [ ] `tsc --noEmit` passes with zero errors
- [ ] No `any` types added
- [ ] All new exported functions have explicit return types

**API routes:**
- [ ] `POST /api/admin/marketing/generate` returns `{ postText, hashtags, imageUrl, whatsappText }`
- [ ] `GET /api/admin/marketing/social/status` returns connection statuses without exposing tokens
- [ ] `POST /api/admin/marketing/campaigns/[id]/publish` returns per-platform results
- [ ] All routes return 401/403 for non-admin access
- [ ] 404 for missing campaigns

**Database:**
- [ ] `marketing_campaigns` table created
- [ ] `social_connections` table created
- [ ] `whatsapp_recipient_groups` table created
- [ ] Schema exported correctly from `lib/db/schema.ts`

**UI flows:**
- [ ] `/admin/marketing` loads with stats and campaign list
- [ ] `/admin/marketing/new` three-step wizard works end-to-end
- [ ] Generated image displays from Pollinations URL
- [ ] WhatsApp share link opens wa.me in new tab
- [ ] `/admin/marketing/connect` shows correct connection status
- [ ] Facebook OAuth redirect works (when FACEBOOK_APP_ID is set)

**Security:**
- [ ] Access tokens encrypted in DB
- [ ] No tokens in client-facing API responses
- [ ] requireRole enforced on all admin routes

**Free tier compliance:**
- [ ] Pollinations.ai image generation requires no API key
- [ ] AI text generation uses existing `lib/ai-router.ts` (Groq/Cerebras/Gemini free tiers)
- [ ] WhatsApp share links work with zero configuration
- [ ] Facebook/Instagram posting uses Graph API (free for page owners)

---

## PACKAGE DEPENDENCIES

Check `package.json` before installing. Only install if not already present:

```bash
# No new packages should be needed if the following are already present:
# - openai (already required by lib/ai-router.ts)
# - drizzle-orm (already present)
# - Next.js 15 built-in fetch (no node-fetch needed)
```

If `jsonwebtoken` is not present (needed for OAuth state CSRF token):
```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

If `sharp` or image processing is needed for Instagram (only if Pollinations direct URL doesn't work for IG):
```bash
# Do NOT install unless Instagram API rejects Pollinations URLs
# Try direct URL first — it should work as Instagram accepts any public HTTPS image URL
```

---

## FINAL NOTE ON QUALITY

Write this as if it is going into a production codebase for a real brand. The code should be:
- Clean, readable, with zero dead code
- Consistent with the existing codebase patterns (look at existing admin routes, components, and types before writing new ones)
- Server-side secrets always stay server-side
- User-facing error messages are friendly and actionable, not technical
- Loading states on every async operation
- The three-step wizard should feel smooth and professional — this is the admin's daily tool

The goal is a seamless experience: admin opens `/admin/marketing/new`, fills in what the campaign is about (or even leaves it blank for general organic products content), clicks Generate, reviews the beautiful AI-generated content and image, edits if needed, picks platforms, and publishes — all within 2 minutes and with zero friction.
