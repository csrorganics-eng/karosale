# CSR Organics — Deploy to Vercel + Neon

## Security first

If your Neon password was shared in chat or email, **reset it now**:

Neon Console → Project → **Settings** → **Reset password** → copy the new pooled URL.

---

## 0. Local database (already done if you ran migrate + seed)

```bash
npm run db:migrate
npm run seed
```

Your Neon database now has all tables + QA users + 10 products.

---

## 1. Push code to GitHub

```bash
git init
git add .
git commit -m "CSR Organics Phase 1 foundation"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/csrorganics.git
git push -u origin main
```

---

## 2. Create Vercel project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Root directory: `.`
5. Build command: `npm run build` (default)
6. Install command: `npm install` (default)

Do **not** deploy yet — add environment variables first.

---

## 3. Connect Neon to Vercel (recommended)

1. Vercel project → **Storage** → **Connect Database** → **Neon**
2. Link the same Neon project you use locally
3. Vercel sets `DATABASE_URL` automatically for Production and Preview

If you connect manually, use the **pooled** connection string (host contains `-pooler`).

---

## 4. Required environment variables (Vercel)

| Variable | Production | Preview | Notes |
|----------|-------------|---------|--------|
| `DATABASE_URL` | Neon main branch pooled | Neon preview branch pooled | From Neon or Vercel integration |
| `NEXTAUTH_SECRET` | Random 32+ chars | Same or separate | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://csrorganics.com` | `https://YOUR-preview.vercel.app` | Must match deployed URL |
| `NEXT_PUBLIC_APP_URL` | Production URL | Preview URL | |
| `NEXT_PUBLIC_IS_PREVIEW` | `false` | `true` | Shows test banner |
| `RAZORPAY_KEY_ID` | Live | `rzp_test_*` | |
| `RAZORPAY_KEY_SECRET` | Live | Test secret | |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Live public | Test public | |
| `RAZORPAY_WEBHOOK_SECRET` | From Razorpay dashboard | Test webhook secret | |
| `INNGEST_EVENT_KEY` | Inngest production | Inngest dev | [app.inngest.com](https://app.inngest.com) |
| `INNGEST_SIGNING_KEY` | Inngest production | Inngest dev | |

Optional (enable features when ready):

`RESEND_API_KEY`, `INTERAKT_API_KEY`, `FAST2SMS_API_KEY`, `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `CLOUDFLARE_R2_*`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

## 4b. Apply database schema (first deploy)

From your machine (with `DATABASE_URL` in `.env.local`):

```bash
npm run db:migrate
npm run seed
```

Use the **pooled** Neon URL for the running app. If `npm run db:push` fails with connection errors, `db:migrate` uses Neon HTTP and is more reliable.

---

## 5. Seed preview database (QA)

On **Preview** only, after first deploy:

1. Vercel → Settings → Environment Variables → Preview:
   - `SEED_DATABASE=true` (only for one deploy, then remove)
2. Or run locally against preview branch:
   ```bash
   DATABASE_URL="your-preview-neon-url" npm run db:push
   DATABASE_URL="your-preview-neon-url" npm run seed
   ```

Never set `SEED_DATABASE=true` on Production.

---

## 6. Post-deploy URLs to configure

| Service | URL to register |
|---------|-----------------|
| **Razorpay webhooks** | `https://YOUR_DOMAIN/api/webhooks/razorpay` |
| **Shiprocket webhooks** | `https://YOUR_DOMAIN/api/webhooks/shiprocket` |
| **Inngest** | `https://YOUR_DOMAIN/api/inngest` (sync in Inngest dashboard) |
| **Auth.js** | `NEXTAUTH_URL` (and `AUTH_URL` if set) must match the **exact** URL you open in the browser for that environment (production domain or current preview URL). If they point at an old or deleted Vercel deployment, sign-out and OAuth redirects can show **404 DEPLOYMENT_NOT_FOUND**. The app signs out using same-origin navigation to avoid that; still keep env URLs in sync. |

### Inngest keys (common 401 on COD)

| Variable | Role |
|----------|------|
| `INNGEST_EVENT_KEY` | **Outbound** — required for `inngest.send()` (COD / Razorpay webhooks / admin actions). Copy the **Event key** from Inngest → your app → **Manage** → **Keys**. |
| `INNGEST_SIGNING_KEY` | **Inbound** — verifies requests from Inngest to your app’s `/api/inngest` handler. **Cannot** be used as the event key. |

If checkout returns **401 Event key not found**, the Event key is missing, mistyped, or the Signing key was pasted into `INNGEST_EVENT_KEY`. Redeploy after fixing env vars.

COD checkout **still completes** if Inngest fails after the order is saved; check server logs for `[inngest]` warnings/errors and fix the key so pick lists / notifications run.

---

## 7. Custom domain (csrorganics.com)

1. Vercel → Project → **Settings** → **Domains**
2. Add `csrorganics.com` and `www.csrorganics.com`
3. Update DNS at your registrar per Vercel instructions
4. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to `https://csrorganics.com`
5. Redeploy

---

## 8. Verify deployment

```bash
curl https://YOUR_DOMAIN/api/health
```

Expect: `"status":"ok","db":"connected"`

Smoke test (optional):

```bash
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN npm run smoke
```

---

## 9. QA handoff

1. Copy the **Preview** deployment URL from Vercel (branch deploy)
2. Set `NEXT_PUBLIC_IS_PREVIEW=true` on Preview
3. Share QA logins from seed (see README)
4. Use `docs/qa-checklist-phase1.md` for browser testing

---

## 10. Production release

1. QA signs off on preview
2. Merge to `main`
3. Vercel auto-deploys production
4. Confirm `SEED_DATABASE` is not set on production
5. Run smoke test against production URL
