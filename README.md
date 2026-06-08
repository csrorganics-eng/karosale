# CSR Organics (csrorganics)

Organic products marketplace for India — Next.js 15, Neon PostgreSQL, Drizzle ORM, Vercel.

**Brand:** Smart Commerce. Seamless Experience.

## Quick start (developer)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   ```bash
   cp .env.example .env.local
   ```
   Fill at minimum:
   - `DATABASE_URL` — Neon pooled connection string
   - `AUTH_SECRET` (or `NEXTAUTH_SECRET`) — `openssl rand -base64 32`
   - `AUTH_URL` and `NEXTAUTH_URL` — `http://localhost:3000` (must match the URL you use in the browser; on Vercel use your deployment URL)
   - `NEXT_PUBLIC_APP_URL` — same origin as above (used in magic-link emails for the logo)

   **QA sign-in** (after `npm run seed`): `admin.qa@csrorganics.com` / `AdminQA@123` (admin), `qa.tester@csrorganics.com` / `QATester@123` (customer). If you previously seeded `@karosale.com` emails, run `npm run seed` again to migrate passwords and emails.

   **Google OAuth:** set server-side `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (or `GOOGLE_CLIENT_*`). In Google Cloud Console add redirect URI `http://localhost:3000/api/auth/callback/google`. To show **Continue with Google** on the sign-in page, set `NEXT_PUBLIC_GOOGLE_SIGNIN_ENABLED=true` in `.env.local` (it stays hidden until then).

   **Magic link:** set `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` (or `onboarding@resend.dev` for Resend’s test domain). Requires `DATABASE_URL` so verification tokens can be stored.

3. **Database**
   ```bash
   # If db:push fails (TCP), use HTTP migrate (recommended for Neon):
   npm run db:migrate
   npm run seed
   ```
   `npm run seed` and `npm run db:migrate` load **`.env.local`** then **`.env`** automatically (same as you use for `npm run dev`). Ensure `DATABASE_URL` is set in one of those files.

   **Note:** Use the **pooled** URL in `.env.local` for the app. For `drizzle-kit push` only, use Neon’s **direct** (non-`-pooler`) URL from the console.

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

5. **Inngest (background jobs, optional locally)**
   ```bash
   npm run inngest:dev
   ```

## QA test accounts (after seed)

| Role     | Email                   | Password      |
|----------|-------------------------|---------------|
| Customer | qa.tester@csrorganics.com  | QATester@123  |
| Admin    | admin.qa@csrorganics.com   | AdminQA@123   |
| Packer   | packer.qa@csrorganics.com  | PackerQA@123  |

Coupons: `TESTSHIP`, `SAVE10`, `WELCOME50` (referral welcome)

## Project structure

- `app/(storefront)/` — Customer shop
- `app/admin/` — Admin back office
- `app/(packer)/` — Warehouse pick list
- `app/api/` — Route handlers
- `lib/db/` — Drizzle schema & queries
- `lib/inngest/` — Background jobs

## Deployment (Vercel + Neon)

1. Connect repo to Vercel
2. Add Neon integration → `DATABASE_URL`
3. Set all env vars from `.env.example`
4. Preview: `NEXT_PUBLIC_IS_PREVIEW=true`, Razorpay test keys
5. Production: merge to `main` after QA sign-off

## Scripts

| Command           | Description              |
|-------------------|--------------------------|
| `npm run dev`     | Development server       |
| `npm run build`   | Production build         |
| `npm run db:push` | Push schema to Neon      |
| `npm run seed`    | Seed test data           |
| `npm run smoke`   | Post-deploy smoke tests  |

## Phase 1 & 2 (production-oriented)

- **Checkout:** Tier discounts (from `loyalty_tiers`), coupon revalidation, karma slider (COD deducts immediately; Razorpay deducts after `verify-payment`).
- **Referrals:** Visit `/r/{REFERRAL_CODE}` to set a cookie; after sign-in, `POST /api/referral/claim` links `referred_by`. Seeded coupon `WELCOME50` (flat ₹50) for referral programs.
- **Auth:** Google OAuth loads only when `GOOGLE_CLIENT_ID` / `SECRET` are set. Email magic link uses Resend when `RESEND_API_KEY` is set.
- **Admin:** Reviews moderation (`/admin/reviews`), campaigns (`/admin/marketing`), analytics snapshot (`/admin/analytics`), product bulk JSON import (`POST /api/admin/products/bulk-import` with `{ rows: [...] }`).
- **Wishlist:** Logged-in users use `/api/wishlist`; guests use `localStorage` and merge on login.
- **Inngest:** Added `loyalty-expire` (monthly) and `campaign-heartbeat` (daily).
- **Schema:** New `campaigns` table — run `npm run db:push` or your migration flow after pulling.

## Services required for full functionality

See `.env.example` for the complete list. Critical path:

- **Neon** — database
- **Razorpay** — payments (test keys for preview)
- **PostHog** — product analytics (`NEXT_PUBLIC_POSTHOG_KEY`, optional `NEXT_PUBLIC_POSTHOG_HOST`)
- **Business / tax** — seller on invoices & packing: `BUSINESS_*` in `.env.example` (defaults: GRSOrganics + Kerala placeholder + sample GSTIN)
- **Resend** — email
- **Interakt** — WhatsApp
- **Fast2SMS** — OTP SMS
- **Cloudflare R2** — media & packaging tags
- **Inngest** — automations
- **Shiprocket** — shipping (admin fulfill flow)
