# Affiliate program

## Apply migration

If Postgres reports **`relation "affiliates" does not exist`** (or similar for other `affiliate_*` tables), the affiliate migration has not been applied to the database your app uses. From the project root, with `DATABASE_URL` set (same as Next.js / `.env.local`):

```bash
npm run db:migrate
```

That runs `scripts/migrate-neon.ts`, which applies any pending files under `lib/db/migrations/` (including `0012_affiliate.sql`). You can also use `npm run db:push` per your Neon workflow. SQL is mirrored at `lib/db/affiliate-schema.sql` for documentation.

## Tracking URLs

- Global: `/af/{username}` → sets cookie, redirects home.
- Product: `/share/{product-slug}/{username}` → sets cookie, redirects to `/shop/{slug}`.
- Query: `?ref={username}` → cookie + redirect strips `ref` (handled before SEO canonical pass in `middleware.ts`).

## Commissions

`lib/affiliate/engine.ts` — `triggerAffiliateCommissionFromOrderLifecycle` is invoked from Inngest (`affiliate-order-commission`) and from `order-status-changed` when an order is **delivered**. Trigger mode is controlled by `affiliate_settings.commission_trigger` (`order_placed` | `order_paid` | `order_complete`). **COD** orders fire `order_paid` alongside `order_placed` when placed so `order_paid` can still credit without a gateway capture.

## Checkout

Optional `affiliateUsername` on `POST /api/orders` (cart UI stores `sessionStorage.affiliate_username_override`). Cookie `csro_affiliate_ref` is an HMAC-sealed payload (Edge-safe).

## Admin & account

- Admin: `/admin/affiliate` (+ affiliates, commissions, payouts, reports, settings).
- Account: `/account/affiliate`, `/register`, `/links`.

## Affiliate application review

On **Admin → Affiliate → Affiliates** (`/admin/affiliate/affiliates`), use the status tabs (e.g. **Pending**) and row actions:

| Action | Allowed from | Effect |
|--------|----------------|--------|
| **Approve** | `pending` | Sets `active`, `approved_at`, `approved_by_admin_id`; optional email via Resend. |
| **Reject** | `pending` | Sets `rejected`, stores reason in `notes`. |
| **Suspend** | `active` | Sets `suspended`; optional `notes` replaces `notes` if provided. |
| **Reactivate** | `suspended` | Sets `active` again. |

API: `PATCH /api/admin/affiliate/affiliates/{id}` with body `{ "action": "approve" }`, `{ "action": "reject", "reason"?: "..." }`, `{ "action": "suspend", "notes"?: "..." }`, or `{ "action": "reactivate" }` (admin session required).

Only **`active`** affiliates earn commissions and appear in tracking resolution (`lib/affiliate/engine.ts`, `middleware-track.ts`).

## QA seed accounts (`npm run seed`)

After migrations, `npm run seed` creates two affiliate-linked customers (same password) plus clicks, a delivered order attributed to the active affiliate (buyer = main QA customer), one **approved** commission, wallet totals aligned, a global tracking URL row, and a **requested** payout (`admin_notes` = `SEED_QA_PAYOUT_REQUEST`).

| Account | Password | Affiliate username | Notes |
|---------|----------|--------------------|--------|
| `affiliate.qa@csrorganics.com` | `AffiliateQA@123` | **qaaffseed** | `active` — use `/af/qaaffseed`, `/account/affiliate`, admin payouts queue |
| `affiliate.pending@csrorganics.com` | `AffiliateQA@123` | **qaaffpend** | `pending`, upline = `qaaffseed` — use admin **Approve** flow |

Buyer for the attributed order is **`qa.tester@csrorganics.com`** (existing QA customer). Seed order note: `SEED_DATA_AFF_ORDER_01`.
