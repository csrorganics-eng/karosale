# Pollinations keys for Marketing images

Marketing campaign images are generated with **Pollinations** (`https://gen.pollinations.ai`, image API). Your **text** AI keys (Groq, Gemini, etc.) are separate.

Pollinations has indicated that **publishable keys (`pk_`) are deprecated**. This app does **not** use `NEXT_PUBLIC_*` Pollinations keys or `?key=` on Pollinations URLs. Instead it uses:

1. **`POLLINATIONS_API_KEY`** — a **secret** key (`sk_`) on the server only, sent as `Authorization: Bearer …` to `gen.pollinations.ai`.
2. **HMAC-signed URLs on your own origin** — `GET /api/marketing/public-image?…` so the **browser** (`<img src>`) and **Instagram** (`image_url`) can load images **without** embedding any Pollinations key. Meta’s servers call your public HTTPS URL; your route verifies `sig` + `exp`, then fetches Flux with the secret key.

Signing uses **`AUTH_SECRET` or `NEXTAUTH_SECRET`** (the same secret Auth.js uses). Keep it stable in production or existing signed links break.

Signed preview URLs must use the **same public origin** the browser uses (e.g. `https://your-domain.com`). The server builds that origin from, in order: **`x-forwarded-host` + `x-forwarded-proto`** (Vercel, nginx, etc.), then **`NEXT_PUBLIC_APP_URL`** / **`NEXTAUTH_URL`** / **`AUTH_URL`**, then **`VERCEL_URL`**, then the request URL. For local dev (`localhost` / `127.0.0.1`), the request URL is used so previews match how you open the app.

---


## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| **`POLLINATIONS_API_KEY`** | Server only | `Bearer` token for `gen.pollinations.ai`. |
| **`AUTH_SECRET` or `NEXTAUTH_SECRET`** | Server only | HMAC for signed marketing image URLs. |

Do **not** put `sk_` in any `NEXT_PUBLIC_` variable.

---

## Step-by-step

### 1. Open the Pollinations key dashboard

Go to **[https://enter.pollinations.ai](https://enter.pollinations.ai)** and sign in.

### 2. Create or copy a **secret** key (`sk_…`)

Use a key marked as **secret** (prefix `sk_`).

### 3. Add to `.env.local`

```env
POLLINATIONS_API_KEY=sk_your_secret_key_here
AUTH_SECRET=your_existing_auth_secret
```

(If you already use NextAuth / Auth.js, `NEXTAUTH_SECRET` alone is enough for signing.)

### 4. Restart the dev server

```bash
npm run dev
```

### 5. Try Marketing

Go to **Admin → Marketing → New campaign**, generate content, and confirm the image preview loads.

---

## How images are fetched from Pollinations

The server calls **`POST https://gen.pollinations.ai/v1/images/generations`** (Flux, `response_format: b64_json`) with your **`sk_`** key. When a **catalog product** has an **HTTPS** primary image on a **trusted host** (R2, Cloudflare, your `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_MEDIA_URL` host, or entries in **`MARKETING_REF_IMAGE_HOSTS`**), that URL is passed to Pollinations as an **`image`** reference so the marketing render stays anchored to the real packshot. If the reference request fails, the server retries **text-only** generation so you still get an image. If a requested `width`×`height` is rejected, the server retries once with **`1024x1024`**.

If previews fail while env looks correct, watch the dev terminal for **`[fetchGenPollinationsImage]`** (HTTP status and Pollinations error text). Typical causes: invalid or rotated **`sk_`**, key not allowed to use **Flux**, or account / pollen limits on Pollinations.

---

## Signed URLs and TTL

Preview and stored `imageUrl` values look like:

`https://your-domain.com/api/marketing/public-image?v=2&e=…&p=…&w=…&h=…&s=…&sig=…` (and optional `ref=` with the product image URL when using packshot-guided generation).

- **`e`** — Unix expiry time (default **72 hours** from when the URL was built).
- **`sig`** — HMAC over the parameters (including optional reference image URL) so only your server can mint valid links.

After expiry, the image URL returns **403**. Regenerate the image in the admin UI to get a new signed URL before publishing or if Instagram fetch fails on an old draft.

---

## Instagram and Facebook

- **Instagram** uses `image_url` as a plain **GET** from the public internet. Your signed **`/api/marketing/public-image`** URL satisfies that: no cookies, no Pollinations key in the query for Pollinations itself.
- **Facebook** photo upload: the server downloads bytes via **`fetchImageAsBuffer`**; same-origin signed URLs are fetched without extra headers; direct `gen.pollinations.ai` URLs still use `Bearer` when applicable.

---

## More help

- Pollinations API hub: [https://gen.pollinations.ai/docs](https://gen.pollinations.ai/docs)  
- Keys / account: [https://enter.pollinations.ai](https://enter.pollinations.ai)  
- Project env template: `.env.example` (search for `POLLINATIONS`)
