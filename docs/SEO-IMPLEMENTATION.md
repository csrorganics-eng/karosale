# SEO implementation (CSR Organics / Karosale)

This document summarizes what was implemented from `karosale_seo_cursor_prompt.md` and intentional deviations.

## Implemented

- **Central SEO library** under `lib/seo/` (`site-config`, `utils`, `translations`, `metadata`, `structured-data`, `breadcrumbs`, `url-normalize`).
- **JSON-LD** via `components/seo/JsonLd.tsx` + `schema-dts` types; Organization + WebSite on all pages from root layout; homepage adds ItemList + LocalBusiness; PDP adds Product (+ optional Review nodes); category PDP adds CollectionPage; blog adds Article + FAQPage.
- **Dynamic metadata** on home, shop (incl. search mode), product (`/shop/[slug]`), category (`/categories/[slug]`), brand (`/brands/[slug]`), bundle, blog index & article, search redirect page.
- **Routes aligned to this codebase** (not the prompt’s hypothetical `/products/...`):
  - Products remain at **`/shop/[slug]`** (existing redirects kept).
  - Categories use **`/categories/[slug]`** (canonical listing pages in addition to `/shop?category=`).
  - Brands use **`/brands`** and **`/brands/[slug]`** (backed by `vendors`).
  - Search canonical entry point **`/search?q=`** redirects to **`/shop?q=`**.
- **`app/sitemap.ts`**: static + products + categories + brands + blog posts, `revalidate = 3600`, `alternates.languages` placeholders (`en`, `en-IN`, `hi-IN`, `x-default` all point at the same URL until Hindi routes exist).
- **`app/sitemap-images.xml/route.ts`**: image sitemap for product images.
- **`app/robots.ts`**: expanded rules, sitemap + image sitemap references.
- **`app/og/route.tsx`**: dynamic OG card (`next/og`). Product/campaign images are **not** painted as remote CSS backgrounds (Satori limitations); metadata still passes `image` for future extension.
- **`app/opengraph-image.tsx` / `app/twitter-image.tsx`**: static fallback OG/Twitter images.
- **`app/manifest.ts`**: PWA manifest.
- **`middleware.ts`**: global matcher for **UTM / tracking param stripping**, lowercase paths, trailing slash trim, `page=1` removal; **skips `/api/razorpay/*`**. Admin/packer auth preserved.
- **`next.config.ts`**: security headers unchanged; image `avif`+`webp`, `minimumCacheTTL`, extra redirects, `/og` cache header.
- **API**: `GET /api/seo/audit?secret=`, `POST /api/sitemap-ping` (Bearer `DEPLOY_WEBHOOK_SECRET`).
- **Admin SEO hub** (Settings): **`/admin/settings/seo`** — score, catalog checks (missing images/meta, thin categories, duplicate titles), env checklist (no secret values), sitemap/robots links, and deep links into product/category admin. Entry point from **`/admin/settings`** (“SEO & discoverability”).
- **Analytics**: `components/seo/Analytics.tsx` (GTM + Clarity when env set).
- **Resource hints**: `components/seo/ResourceHints.tsx` (R2, fonts, Razorpay, Shiprocket).
- **404 / error / loading**: `app/not-found.tsx`, `app/error.tsx`, `app/(storefront)/loading.tsx`.

## Deviations / follow-ups

1. **`next-intl` + `/hi` tree** — Not introduced (would require moving the entire storefront under `[locale]`). `lib/seo/translations.ts` holds Hindi copy for future use; `alternates.languages` currently point all locales to the same URL.
2. **`experimental.optimizeCss`** — Removed after build: Next 15 expects optional `critters` package; add `critters` and re-enable if desired.
3. **Sitemap index split at 5,000 URLs** — Logged warning only; implement `generateSitemaps` when the catalog grows.
4. **`CanonicalHead.tsx`** — Spec asked for a `<link rel="canonical">` component; App Router canonicals are applied via **`generateMetadata` / `alternates.canonical`**. The file exports `withCanonical` + a no-op `CanonicalHead` placeholder.
5. **OG route product image** — Background image from arbitrary R2 URLs is not rendered inside `@vercel/og`/`next/og` here (reliability); branded gradient + typography only.

## Env vars

See `.env.example` **SEO & Analytics** section.
