# Functional specification

**Scope:** Behavior as implemented in this repository (Next.js App Router, `app/`, `lib/`).  
**Pair with:** [PRD](./PRD.md) · [End-to-end flows](./END-TO-END-FLOWS.md)

---

## 1. System overview

| Layer | Responsibility |
|-------|------------------|
| **UI** | `app/(storefront)/`, `app/admin/`, `app/(packer)/`, shared `components/` |
| **API** | `app/api/**/route.ts` — JSON handlers, webhooks, auth |
| **Domain** | `lib/` — auth, DB queries, payments, email, Gemini, search, chat, loyalty, Shiprocket, Inngest emitters, PDFs |
| **Data** | `lib/db/schema.ts` + migrations / `db:push` workflow |

Responses typically use `jsonOk` / `jsonError` from `lib/api-response.ts`.

---

## 2. Authentication & authorization

### 2.1 Mechanisms (NextAuth)

- Email/password (seeded QA users documented in `README.md`).
- Magic link email when **Resend** is configured.
- Google OAuth when server `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (or `GOOGLE_CLIENT_*`) and optional `NEXT_PUBLIC_GOOGLE_SIGNIN_ENABLED` for button visibility.

### 2.2 Roles

- **`customer`** (default shopper).
- **`admin`** — `requireRole(["admin"])` on admin APIs and admin layout patterns.
- **`packer`** — pick list access (and admin may also open packer links from account page).

### 2.3 Session usage

- Server components and `auth()` in route handlers obtain `session.user.id`, `email`, `role`.
- Shop chat attaches `userId` when logged in for order listing tool and session persistence in DB.

---

## 3. Storefront functions

### 3.1 Catalog & PDP

- Products loaded from DB; merchandising weights / offers resolved via `lib/merchandising/`.
- Product detail supports analytics beacon where `ProductViewBeacon` is used.
- Bundles: dedicated routes under `app/(storefront)/bundles/` and `app/api/bundles/`.

### 3.2 Search

- **Primary retrieval:** SQL / keyword matching (ILIKE on name, descriptions, SKU, meta keywords — see `README.md` seed notes).
- **Optional semantic ordering:** `lib/search/semantic-rerank.ts` calls `geminiGenerateContent` **without** chat’s extra rate-limit retries; on failure, timeout, or cooldown → **preserve SQL order**.
- Env: `SEARCH_SEMANTIC_TIMEOUT_MS`, `SEARCH_SEMANTIC_COOLDOWN_MS`, `SEARCH_SEMANTIC_DISABLED`.
- **Shop chat** `search_catalog` tool calls `searchProducts(..., { skipSemanticRerank: true })` to avoid double Gemini usage.

### 3.3 Cart & checkout

- `app/api/cart` — line items, coupons (`/api/cart/coupon`).
- Checkout pages and `app/api/orders` + `verify-payment` for Razorpay completion.
- COD path applies loyalty/karma rules as implemented in checkout server logic (tier discounts, karma slider behavior per `README.md`).

### 3.4 Orders & tracking

- List and detail under `app/(storefront)/orders/`.
- Public-style tracking `app/(storefront)/track/[awb]/` when AWB exists.

### 3.5 Wishlist

- `GET/POST/PATCH/DELETE` `app/api/wishlist` for authenticated users.
- `app/api/wishlist/merge` merges guest storage after login.
- Share link flows under wishlist share API routes.

### 3.6 Loyalty (“Karma”)

- Summary/balance APIs under `app/api/loyalty/`.
- Storefront `/loyalty` page; admin karma tier management.

### 3.7 Referrals

- `app/r/[code]/route.ts` sets referral cookie.
- `POST /api/referral/claim` links `referred_by` after authentication.

### 3.8 Subscriptions

- Customer UI under account links; CRUD-style API under `app/api/subscriptions` and `[id]`.

### 3.9 Reviews

- `app/api/reviews` for submission; admin moderation at `/admin/reviews`.

### 3.10 Personalization

- `lib/personalization/gemini-profile.ts` — if Gemini configured and profile stale (~7 days), rebuild `users.geminiPersonalizationProfile` from recent order lines + product page views (JSON from model).
- `lib/personalization/gemini-picks.ts` — if profile has `summary`, may rerank personalized pick cards using same semantic rerank pipeline (inherits cooldown / disabled flags).

### 3.11 Shop chat

- **Endpoint:** `POST /api/chat` body `{ clientKey, message }` (Zod validated lengths).
- **Status:** `GET` or relevant `app/api/chat/status` returns `{ enabled: isGeminiConfigured() }`.
- **Preconditions:** Returns `503` if Gemini API key missing.
- **Rate limit:** In-memory map keyed by `clientKey`; `CHAT_RATE_LIMIT_MAX` / `CHAT_RATE_LIMIT_WINDOW_MS` or defaults (dev 120/min, prod 72/min per key per instance).
- **Persistence:** `ensureShopChatSession`, `appendShopChatMessage`, `listRecentShopChatMessages` in `lib/db/queries/shop-chat.ts`.
- **Assistant:** `lib/chat/run-shop-chat.ts` — `geminiGenerateContent` with tools, max rounds from `CHAT_MAX_TOOL_ROUNDS` (default 6), `retryOnceOnRateLimit: true` for multi-pass fallback + backoff (`GEMINI_RATE_LIMIT_EXTRA_RETRIES`).
- **Errors:** 429 from Gemini → assistant text from `geminiQuotaUserMessage()`; 404 model → specific copy; other errors → `500` “Chat failed”.

**Tools (declared to Gemini):**

| Tool | Function |
|------|----------|
| `search_catalog` | Keyword `searchProducts` (no semantic rerank), up to 6 hits |
| `get_product_summary` | Slug lookup; returns price, stock, short text, category |
| `list_my_recent_orders` | DB query when `userId` present; otherwise tool result instructs model to ask for sign-in |
| `escalate_to_human` | Inserts escalation row + email via Resend when `CHAT_ESCALATION_EMAIL` (and Resend) configured |

---

## 4. Admin functions

Navigation is defined in `lib/admin-nav.ts`:

| Section | Purpose (functional) |
|---------|----------------------|
| Dashboard | KPIs via `app/api/admin/dashboard` |
| Orders | List, detail, ship, packaging tag/PDF, picklist batch |
| Products | List, create, edit; bulk JSON import |
| Inventory | Stock-focused operations |
| Reviews | Moderation queue |
| Karma Rewards | Loyalty tier admin |
| Marketing | Campaigns |
| Search & A/B | Merchandising, experiments, search ranking |
| Analytics | Snapshot dashboard |
| Customers | Directory + detail patterns |
| Settings | Store configuration |

### 4.1 AI — admin

- **`POST /api/admin/products/ai-copy`** — Gemini short copy via `generateProductCopyWithGemini`; 503 if not configured; 429 returns `geminiQuotaUserMessage()` text as error body; 404 model lists fallback chain hint.
- **`POST /api/admin/products/generate-description`** — **OpenAI** `gpt-4o` JSON fields (long HTML description, meta) — requires `OPENAI_API_KEY`, not Gemini.
- **`POST /api/admin/search-ranking/ai-suggest`** — Gemini suggestion for ranking weights (admin-only).

---

## 5. Packer functions

- `app/(packer)/packer/picklist` — operational pick list (data from admin orders picklist API where linked).

---

## 6. Webhooks & background processing

### 6.1 HTTP webhooks

- **Razorpay** — payment events (see `app/api/webhooks/razorpay` if present; payment verification also via `orders/verify-payment`).
- **Shiprocket** — `app/api/webhooks/shiprocket/route.ts` updates order/shipment state per implementation.

### 6.2 Inngest

- Endpoint `app/api/inngest/route.ts` registers functions under `lib/inngest/functions/` (e.g. loyalty expiry, campaign heartbeat, low stock, order status changed, review request, subscription processor).  
- **Requirement:** Inngest dev server or cloud scheduling + signing secrets per env.

---

## 7. Google Gemini module (`lib/gemini.ts`)

### 7.1 Configuration

- API key: first non-empty of `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_AI_API_KEY`.
- Model: `GEMINI_MODEL` or default `gemini-2.5-flash`.
- **Fallback chain (after preferred):** `gemini-2.5-flash-lite`, `gemini-2.0-flash`, `gemini-1.5-flash` (404 skips model).
- **Working model cache:** `geminiWorkingModelId` remembers last success; reordered first on subsequent calls; cleared on 404/429 per model and when all models rate-limited.

### 7.2 Error classification

- `isGeminiModelNotFoundError` — 404 / unsupported model strings.
- `isGeminiRateLimitError` — HTTP 429/503 and message heuristics (quota, `resource_exhausted`, etc.).

### 7.3 `geminiGenerateContent(input)`

- If `retryOnceOnRateLimit === true` (shop chat): up to `1 + clamp(GEMINI_RATE_LIMIT_EXTRA_RETRIES, 0..5)` **full chain attempts**; between attempts: `resetGeminiWorkingModelCache()`, exponential backoff capped at 30s.
- Otherwise: single `geminiGenerateContentOnce` pass.

### 7.4 User-facing quota copy

- `geminiQuotaUserMessage()` — references last tried model, minute vs daily caps, midnight PT, AI Studio / billing, link to rate-limit docs.

---

## 8. Non-functional requirements (as implemented)

| NFR | Implementation notes |
|-----|----------------------|
| Security | Secrets in server env only; `requireRole` on privileged routes |
| Privacy | Chat sessions stored server-side; escalation may include shopper email |
| Performance | Semantic rerank timeout; chat tool loop bounded by `CHAT_MAX_TOOL_ROUNDS` |
| Observability | `console.warn` / `console.error` patterns in API routes; PostHog optional |

---

## 9. Environment reference

Authoritative list: **`.env.example`**. Critical groups: `DATABASE_URL`, auth secrets/URLs, `NEXT_PUBLIC_APP_URL`, Razorpay, Resend, Gemini, OpenAI (description only), Shiprocket, Fast2SMS, R2 (if used), Inngest, business/tax fields, chat and search tuning variables above.

---

## 10. Out of scope for this spec

Line-by-line field validation for every Zod schema; exhaustive Drizzle table listing — refer to `lib/db/schema.ts` and individual route files when extending features.
