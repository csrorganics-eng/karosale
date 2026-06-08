# Phase 2 implementation status

This tracks the **Phase 2 (Growth & Retention)** scope from `karosale-master-prompt-v3.md` against what is implemented in this repo after the latest pass.

## Search ranking & A/B (merchandising)

| Area | Notes |
|------|--------|
| **Admin UI** | `/admin/merchandising` — edit global relevance weights; create/pause/delete A/B experiments with segment + variant JSON overrides. |
| **DB** | `lib/db/migrations/0001_merchandising.sql` — `search_ranking_settings` (singleton row), `ab_experiments`. Run `npx tsx scripts/migrate-neon.ts` after deploy. |
| **Ranking** | Shop `sort=relevance` and `/api/products` + typeahead `/api/products/search` order by a composite score: name/description/SKU ILIKE bonuses, ln(1+sales), rating, review count, featured/bestseller/in-stock bonuses. Weights come from admin + merged A/B overrides. |
| **A/B assignment** | Deterministic SHA-256 hash of `(experimentId + seed)` where `seed` is `userId` or `csrorganics_cart_session` cookie or `"anonymous"`. Same shopper stays on the same variant. |
| **Segments** | `all`, `guest` (not signed in), `customer` (signed in), `returning` (signed in with ≥1 order). |

## Done in codebase

| Area | Notes |
|------|--------|
| **Loyalty dashboard** | `GET /api/loyalty/summary` — balance, tier, next tier progress, tier ladder, last 50 transactions, referral link hint. `/loyalty` UI consumes it. |
| **Referral** | `GET /api/referral/stats` — invited count, friends with orders, share + WhatsApp URLs. Account page shows copy + WhatsApp. |
| **Reviews** | POST body **50–500** chars; duplicate blocked per product+order; optional images via `POST /api/reviews/upload` (R2). Order detail review form expanded. **+5 Karma** on first admin approve (`grantReviewApprovalKarmaIfNeeded`). Admin reply already existed. |
| **Subscriptions** | `GET/POST /api/subscriptions`, `PATCH /api/subscriptions/[id]` (pause / resume / cancel / skip). PDP **Subscribe & save** (`SubscribeSection`). `/subscriptions` management page. **Renewal:** Inngest `subscription-processor` creates **COD renewal orders** (tier + shipping rules), advances `next_order_date`, fires `ORDER_COD_PLACED` + `ORDER_PLACED`. **2-day reminder** WhatsApp (template `subscription_reminder` with fallback to `subscription_renewal`). |
| **Personalized home** | Logged-in **Continue shopping** from `page_views` (`lib/db/queries/personalization.ts`). `ProductViewBeacon` on PDP posts to `/api/analytics/events`. |
| **Search logging** | Already logged in `GET /api/products/search` → `search_queries`. |
| **Bundles** | `GET /api/bundles`, storefront `/bundles/[slug]`, `POST /api/bundles/[slug]/add-to-cart`. Home **Curated bundles** section. |
| **Wishlist** | **Add all to cart** (`POST /api/wishlist/add-all-to-cart`). **Share link** (`GET /api/wishlist/share-link`, signed token in `lib/wishlist-share-token.ts`), public list `GET /api/wishlist/public`, page `/wishlist/shared`. |
| **Campaigns** | Schema + admin APIs exist; **execution** is still mainly `campaign-heartbeat` (daily log). Full WhatsApp segment broadcast needs Interakt templates + product rules. |

## Still optional / follow-up (spec depth)

- **PostgreSQL full-text / trigram** search, ranking, “did you mean”, admin search analytics dashboards.
- **Review analytics** (trends, keyword clouds) and richer admin moderation UX.
- **Campaign runner** broadcasting to segments (beyond heartbeat).
- **AI demand forecast** button and **advanced analytics** pages as described in the master doc.
- **Back-in-stock** automation for wishlist (if not already covered elsewhere).

## Env

- **`WISHLIST_SHARE_SECRET`** (optional): see `.env.example`. Falls back to `NEXTAUTH_SECRET` / `AUTH_SECRET`.
