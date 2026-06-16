# Production readiness — what is left

This document lists **gaps and operational steps** before treating the storefront, SEO, Razorpay checkout, and affiliate program as **fully production-ready**. Implemented features are summarized only where needed for context.

**Related docs:** [DEPLOY.md](./DEPLOY.md) · [AFFILIATE.md](./AFFILIATE.md) · [RAZORPAY-CHECKOUT.md](./RAZORPAY-CHECKOUT.md) · [SEO-IMPLEMENTATION.md](./SEO-IMPLEMENTATION.md) · [PHASE2-STATUS.md](./PHASE2-STATUS.md)

---

## P0 — Blockers for real money / legal risk

### Affiliate payouts (merchant → affiliate)

| Gap | Why it matters |
|-----|----------------|
| **No self-service API/UI to save bank / UPI on `affiliates`** | `POST /api/affiliate/payout/request` requires `bankAccountNumber` + `bankIfsc` (+ name) **or** `upiId` on the affiliate row. There is no authenticated route + account screen that updates these columns today (ops would edit DB or build a one-off). |
| **No end-to-end admin (or ops) flow for RazorpayX** | `lib/affiliate/razorpay-payout.ts` implements `createRazorpayContact`, `createFundAccount`, `initiateRazorpayPayout`, but **admin UI/API** to: approve payout amount → create/persist Razorpay contact & fund account IDs → call `initiateRazorpayPayout` → store `razorpay_payout_id` is **not** wired as a single guided flow. Webhook at `/api/affiliate/webhook/razorpay` needs that ID to reconcile reliably. |
| **RazorpayX account setup** | Payout keys (`RAZORPAY_PAYOUT_*`), [RazorpayX](https://razorpay.com/docs/x/) activation, source account `RAZORPAY_PAYOUT_ACCOUNT_NUMBER`, and a **separate** [payout webhook](https://razorpay.com/docs/webhooks/) secret (`RAZORPAY_PAYOUT_WEBHOOK_SECRET`) on `https://YOUR_DOMAIN/api/affiliate/webhook/razorpay`. |

### Legal & policy

| Gap | Why it matters |
|-----|----------------|
| **Published affiliate program terms** | Registration references accepting terms; host a real policy page (e.g. `/legal/affiliate-program`) and link it from register + footer. |
| **Privacy / cookies** | Affiliate uses HTTP-only cookie `csro_affiliate_ref`; disclose in cookie policy if required in your jurisdiction. |

---

## P1 — Strongly recommended before launch

### Inngest & background reliability

| Item | Action |
|------|--------|
| **`INNGEST_EVENT_KEY`** | Required for `inngest.send()` (COD checkout, Razorpay `payment.captured` path, `verify-payment`, order status). See [DEPLOY.md § Inngest](./DEPLOY.md). [Inngest dashboard](https://app.inngest.com/) → app → Keys. |
| **`INNGEST_SIGNING_KEY`** | Inbound verification for `/api/inngest` — must not be swapped with the event key. |
| **Event coverage smoke test** | After deploy: place Razorpay test order, mark delivered, confirm affiliate commission path if program enabled. |

### Razorpay checkout (already largely implemented)

| Item | Action |
|------|--------|
| **Webhook URL** | `https://YOUR_DOMAIN/api/webhooks/razorpay` with events `payment.captured`, `payment.failed`, `payment.refunded`. Details: [RAZORPAY-CHECKOUT.md](./RAZORPAY-CHECKOUT.md). |
| **`RAZORPAY_WEBHOOK_SECRET`** | Must match the **webhook signing secret** in the dashboard (not `RAZORPAY_KEY_SECRET`). |
| **Health** | `GET /api/health` exposes `hasRazorpayWebhookSecret` — use after deploy to confirm env injection. |
| **Local webhook testing** | Razorpay cannot POST to `localhost`; use a tunnel or test webhooks only on staging. |

### SEO & canonical URLs

| Item | Action |
|------|--------|
| **`NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_APP_URL`** | Set to the **public https** origin so sitemaps, OG URLs, and JSON-LD stay correct. See `lib/seo/site-config.ts`. |
| **Search Console** | [Google Search Console](https://search.google.com/search-console) — verify property, submit `sitemap.xml`. |
| **Large catalogs** | If URL count approaches **50k**, implement Next.js [sitemap index / `generateSitemaps`](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap); `app/sitemap.ts` currently logs a warning. |

### Email (Resend)

| Item | Action |
|------|--------|
| **Verified sending domain** | [Resend Domains](https://resend.com/domains) — required for customers other than your Resend-account email when using test `from`. |
| **`ADMIN_AFFILIATE_NOTIFICATION_EMAIL`** | Ops inbox for new applications + payout requests (optional but recommended). |

---

## P2 — Affiliate & admin product gaps

| Area | Current state | Suggested follow-up |
|------|----------------|---------------------|
| **Admin affiliate reports** | `/admin/affiliate/reports` is a placeholder | CSV export, date-range filters, or BI export. |
| **Commission approval queue** | Commissions are written as **`approved`** in the engine when triggered | If you need finance sign-off, add `pending` + admin approve + wallet credit split (schema/workflow change). |
| **Product exclusions UI** | `affiliate_settings.excluded_product_ids` exists | Admin UI to manage exclusions vs SQL-only. |
| **Registration / upline edge cases** | Implemented with DB constraints | Document support process (username changes, rejected re-application). |

---

## P2 — SEO / marketing depth (optional)

See [SEO-IMPLEMENTATION.md](./SEO-IMPLEMENTATION.md) and [PHASE2-STATUS.md](./PHASE2-STATUS.md) for merchandising, campaigns, and spec-level optional work (e.g. full-text search, campaign broadcast).

---

## Pre-launch checklist (copy into a ticket)

- [ ] `npm run db:migrate` on production DB; confirm `affiliates` and related tables exist.
- [ ] All env vars from `.env.example` set on Vercel (or host); no secrets in client bundles except `NEXT_PUBLIC_*`.
- [ ] `AUTH_URL` / `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` match the live browser origin.
- [ ] Razorpay **live** keys + **checkout** webhook secret + subscribed events.
- [ ] RazorpayX **payout** keys + payout webhook + `RAZORPAY_PAYOUT_ACCOUNT_NUMBER` (if paying affiliates via Razorpay).
- [ ] Inngest production app synced; Event + Signing keys set.
- [ ] Resend domain verified; transactional emails smoke-tested.
- [ ] Affiliate: legal page live; **payout path** either built (P0) or explicitly “manual ops” with a runbook.
- [ ] `npm run smoke` (or manual script) against production URL after first deploy.
- [ ] Monitoring (e.g. Vercel logs, optional Sentry) and on-call for payment webhook failures.

---

## Summary

| Stream | Production-ready? |
|--------|-------------------|
| **Storefront + Razorpay checkout + payment webhooks** | **Yes**, after env + dashboard + Inngest configuration per docs above. |
| **SEO baseline (metadata, sitemap, robots, param stripping, affiliate before canonical)** | **Yes**, after correct public URL + Search Console ops. |
| **Affiliate tracking + commissions + admin affiliate lifecycle** | **Yes**, for attribution and in-app commissions **if** migrations and Inngest are live. |
| **Affiliate withdrawals (RazorpayX + self-service bank/UPI + admin payout orchestration)** | **No** — P0 engineering + RazorpayX setup required. |

*Last updated to reflect codebase and docs in this repository; re-review after major merges.*
