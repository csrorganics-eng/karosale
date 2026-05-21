# Karosale

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
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `http://localhost:3000`

3. **Database**
   ```bash
   # If db:push fails (TCP), use HTTP migrate (recommended for Neon):
   npm run db:migrate
   npm run seed
   ```
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
| Customer | qa.tester@karosale.com  | QATester@123  |
| Admin    | admin.qa@karosale.com   | AdminQA@123   |
| Packer   | packer.qa@karosale.com  | PackerQA@123  |

Coupons: `TESTSHIP`, `SAVE10`

## Project structure

- `app/(storefront)/` — Customer shop
- `app/(admin)/` — Admin back office
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

## Services required for full functionality

See `.env.example` for the complete list. Critical path:

- **Neon** — database
- **Razorpay** — payments (test keys for preview)
- **Resend** — email
- **Interakt** — WhatsApp
- **Fast2SMS** — OTP SMS
- **Cloudflare R2** — media & packaging tags
- **Inngest** — automations
- **Shiprocket** — shipping (admin fulfill flow)
