# Karosale / CSR Organics — Production-Grade SEO Master Prompt
# Platform: Next.js 15 · Vercel · Neon PostgreSQL · Karosale B2B2C Organic E-commerce (India)

---

## ROLE & MANDATE

You are a Senior Full-Stack Engineer and SEO Architect specialising in Next.js App Router e-commerce platforms. Your task is to implement a **complete, production-grade, world-class SEO system** for **Karosale (csrorganics.com)** — an Indian B2B2C organic e-commerce marketplace connecting organic farmers, domestic MSMEs, and global dropship suppliers to Indian consumers.

Before writing a single line of code, you must:
1. Run `find . -type f -name "*.ts" -o -name "*.tsx" | head -80` to understand the current project structure.
2. Read `package.json` to confirm Next.js version, installed dependencies, and scripts.
3. Read `next.config.ts` (or `.js`) to understand current redirects, headers, and image domains.
4. Check `app/layout.tsx` for the root layout structure.
5. Scan `app/` directory tree to understand all existing routes.
6. Read any existing `sitemap.ts`, `robots.ts`, or metadata exports.
7. Check `lib/` and `utils/` for database helpers and existing utility patterns.
8. Read `.env.example` or `.env.local` to understand available environment variables.

**Only after completing this audit** may you begin implementation. Document every finding before proceeding.

---

## PROJECT CONTEXT

- **Domain:** csrorganics.com
- **Stack:** Next.js 15 (App Router), Neon PostgreSQL (pgvector), Vercel, Inngest, Razorpay, Cloudflare R2, Resend, Interakt
- **Market:** India (Hindi + English bilingual SEO required)
- **Categories:** Organic food, ayurvedic products, farm-fresh produce, MSME artisan goods
- **Target users:** Health-conscious urban Indian consumers, B2B buyers, CSR-mandated corporates
- **AI:** Three-provider routing (Groq primary, Cerebras fallback, Gemini long-context)
- **Monetisation:** Razorpay (COD + Route multi-party), Shiprocket/Delhivery fulfillment

---

## DELIVERABLES — COMPLETE SEO IMPLEMENTATION

Implement ALL of the following. No stubs. No TODOs. Every file must be production-ready.

---

### 1. ROOT METADATA & SITE-WIDE SEO FOUNDATION

**File: `app/layout.tsx`**

Implement the `Metadata` export with:
- `metadataBase` set to `new URL('https://csrorganics.com')`
- Full `openGraph` object: type `website`, locale `en_IN`, siteName, default image with dimensions
- Full `twitter` object: card `summary_large_image`, site handle, creator
- `robots` object: index true, follow true, googleBot with imageIndex, maxSnippet -1, maxImagePreview 'large', maxVideoPreview -1
- `alternates.canonical` for root
- `verification` object: Google Search Console, Bing Webmaster Tools (use `NEXT_PUBLIC_GSC_VERIFICATION` and `NEXT_PUBLIC_BING_VERIFICATION` env vars)
- `authors`, `creator`, `publisher` fields
- Default `keywords` array covering organic food India, ayurvedic products, farm-fresh, MSME artisan

**File: `lib/seo/metadata.ts`** — Central metadata factory:

```typescript
// Must export these typed functions:
export function generateProductMetadata(product: Product): Metadata
export function generateCategoryMetadata(category: Category): Metadata  
export function generateBrandMetadata(brand: Brand): Metadata
export function generateBlogMetadata(post: BlogPost): Metadata
export function generateSearchMetadata(query: string, count: number): Metadata
export function buildCanonicalUrl(path: string): string
export function buildAlternateUrls(path: string, locales: string[]): AlternatesMetadata
```

Each function must produce fully populated `title`, `description`, `keywords`, `openGraph`, `twitter`, `alternates.canonical`, and `robots` fields. Titles follow the pattern: `{Page Title} | Karosale — Organic India`. Descriptions must be 150–160 characters, rich with primary keywords, and unique per page type.

---

### 2. DYNAMIC METADATA PER ROUTE

Implement `generateMetadata()` async functions for every dynamic route:

**`app/products/[slug]/page.tsx`**
- Fetch product from DB using slug
- Return metadata with: product name + brand + category in title, ingredient-rich description, product image as OG image (1200×630 crop from Cloudflare R2), canonical URL, price in structured data prep
- If product not found → return `notFound()` canonical metadata with noindex

**`app/categories/[slug]/page.tsx`**
- Category name + "Buy Online India" pattern title
- Description covering sub-categories and product count
- Breadcrumb-aware canonical

**`app/brands/[slug]/page.tsx`**
- Brand name + certification highlights in description
- Brand logo as OG image

**`app/search/page.tsx`**
- Dynamic title: `"{query}" — Organic Products Search | Karosale`
- noindex when query is empty or results < 3
- canonical with `?q=` param stripped of page/filter params

**`app/blog/[slug]/page.tsx`**
- Article OG type
- `publishedTime`, `modifiedTime`, `authors`, `tags` in openGraph
- JSON-LD Article schema inline

---

### 3. JSON-LD STRUCTURED DATA — COMPLETE SCHEMA LIBRARY

**File: `lib/seo/structured-data.ts`**

Implement typed generators for ALL of the following schemas. Each function must return a valid `WithContext<T>` object from `schema-dts` (install if not present):

```typescript
export function generateOrganizationSchema(): WithContext<Organization>
export function generateWebSiteSchema(): WithContext<WebSite>  // includes SearchAction for sitelinks searchbox
export function generateProductSchema(product: Product, reviews: Review[]): WithContext<Product>
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): WithContext<BreadcrumbList>
export function generateArticleSchema(post: BlogPost, author: Author): WithContext<Article>
export function generateFAQSchema(faqs: FAQ[]): WithContext<FAQPage>
export function generateLocalBusinessSchema(): WithContext<LocalBusiness>  // for physical pickup points
export function generateItemListSchema(products: Product[], listName: string): WithContext<ItemList>
export function generateCollectionPageSchema(category: Category, products: Product[]): WithContext<CollectionPage>
```

**File: `components/seo/JsonLd.tsx`** — Reusable component:
```tsx
// Renders <script type="application/ld+json"> safely with dangerouslySetInnerHTML
// Accepts any schema object, serializes with JSON.stringify
// Must be server component, no 'use client'
```

Inject schemas into pages:
- Root layout: Organization + WebSite
- Product pages: Product + BreadcrumbList (conditionally FAQPage if FAQs exist)
- Category pages: CollectionPage + BreadcrumbList + ItemList
- Blog pages: Article + BreadcrumbList + FAQPage
- Homepage: WebSite + ItemList (featured products) + LocalBusiness

**Product Schema must include:**
- `offers` with `price`, `priceCurrency: "INR"`, `availability`, `url`, `seller`
- `aggregateRating` (only when review count ≥ 3)
- `brand`, `manufacturer`, `countryOfOrigin: "IN"`
- `additionalProperty` array for organic certifications (NPOP, USDA Organic, etc.)
- `image` array (all product images from R2)
- `sku`, `mpn`, `gtin13` where available

---

### 4. SITEMAP — DYNAMIC + MULTI-SECTION

**File: `app/sitemap.ts`** (Next.js 15 MetadataRoute.Sitemap)

Generate a multi-section sitemap covering:

```typescript
// Static high-priority pages
const staticPages = ['/', '/about', '/contact', '/blog', '/categories', '/brands', '/sustainability']

// Dynamic from DB (use Neon connection):
// - All active products (changeFrequency: 'daily', priority: 0.8)
// - All active categories (changeFrequency: 'weekly', priority: 0.9)
// - All active brands (changeFrequency: 'weekly', priority: 0.7)
// - All published blog posts (changeFrequency: 'monthly', priority: 0.6)
```

Requirements:
- Split into sitemap index if total URLs > 5,000 (implement `app/sitemap/[type]/route.ts` pattern)
- Include `lastModified` from DB `updated_at` timestamps
- Include `alternates.languages` for `en` and `hi` locales on all pages
- Add image sitemaps for product images (Google image sitemap extension)
- Revalidate with `export const revalidate = 3600` (1 hour)
- Handle DB errors gracefully — return static pages only on failure, log error

**File: `app/sitemap-images.xml/route.ts`** — Image sitemap for Google:
- Fetch all active product images from DB
- Generate valid Google image sitemap XML
- Include `<image:title>`, `<image:caption>` with alt text

---

### 5. ROBOTS.TXT

**File: `app/robots.ts`** (Next.js 15 MetadataRoute.Robots)

```typescript
// Must include:
// - Allow all for Googlebot, Bingbot, DuckDuckBot
// - Disallow: /api/, /admin/, /checkout/, /account/, /cart, /_next/
// - Disallow: ?sort=*, ?page=* (prevent crawling of paginated/sorted URLs unless canonical is set)
// - Sitemap URL pointing to https://csrorganics.com/sitemap.xml
// - Crawl-delay: 1 for general bots
```

---

### 6. CANONICAL URL MANAGEMENT

**File: `components/seo/CanonicalHead.tsx`** — Safety net component (server component):
- Accepts `path` prop
- Renders `<link rel="canonical">` via Next.js `<link>` (not raw HTML)
- Normalises trailing slashes, lowercases, strips tracking params (`utm_*`, `ref`, `fbclid`, `gclid`)

**Param canonicalisation in `middleware.ts`:**
- Strip `utm_*`, `fbclid`, `gclid`, `ref` from all incoming URLs via 301 redirect
- Normalise `?page=1` → canonical without page param
- Lowercase all paths
- Remove trailing slashes (or add — pick ONE convention and enforce it)
- Do NOT touch Razorpay callback URLs (`/api/razorpay/*`)

---

### 7. OPEN GRAPH IMAGE GENERATION

**File: `app/og/route.tsx`** — Dynamic OG image endpoint using `@vercel/og`:

```typescript
// Query params: ?title=&description=&image=&type=product|category|blog|default
// Renders a branded Karosale OG image card:
// - Green organic aesthetic matching brand
// - Product/category image as background with overlay
// - Karosale logo top-left
// - Title in large bold sans-serif
// - Short description below
// - "csrorganics.com" badge bottom-right
// - Organic certification badges if product has them
// - Cache-Control: public, max-age=86400, s-maxage=86400
```

Use this endpoint in all `generateMetadata()` functions:
```typescript
openGraph: {
  images: [{
    url: `/og?title=${encodeURIComponent(title)}&type=product&image=${encodeURIComponent(imageUrl)}`,
    width: 1200,
    height: 630,
    alt: title,
  }]
}
```

---

### 8. INTERNATIONALIZATION SEO (Hindi + English)

**File: `app/[locale]/layout.tsx`** — If not already using i18n routing, implement:

Using `next-intl` (install if not present):
- Route structure: `/` for English, `/hi/` for Hindi
- `hreflang` alternate tags in all metadata via `alternates.languages`
- `lang` attribute on `<html>` element
- Hindi translations for all meta titles and descriptions
- `x-default` hreflang pointing to English

**File: `lib/seo/translations.ts`:**
```typescript
export const seoTranslations = {
  en: {
    siteName: 'Karosale — Organic India',
    homeTitle: 'Buy Organic Products Online India | Certified Organic Food & Wellness',
    homeDescription: 'Shop 1000+ certified organic products...',
    // ... all static page translations
  },
  hi: {
    siteName: 'करोसेल — ऑर्गेनिक इंडिया',
    homeTitle: 'ऑर्गेनिक उत्पाद ऑनलाइन खरीदें | प्रमाणित जैविक भोजन',
    homeDescription: '1000+ प्रमाणित जैविक उत्पाद...',
  }
}
```

---

### 9. PERFORMANCE SEO — CORE WEB VITALS

**File: `components/seo/ResourceHints.tsx`** — Server component, inject into root layout:
```tsx
// Preconnect to critical origins:
// - Cloudflare R2 bucket domain
// - Google Fonts (if used)
// - Razorpay JS
// DNS prefetch for: analytics, Shiprocket tracking CDN
// Preload: LCP hero image on homepage (accept imageUrl prop)
```

**Image optimisation rules** — enforce in a project-wide lint check or comment in `next.config.ts`:
- All `<img>` → `<Image>` from `next/image`
- `sizes` prop required on all product images
- `priority` prop on above-the-fold images (hero, first product card row)
- `quality={85}` for product images, `quality={70}` for thumbnails
- Enable `sharp` in production: add `sharp` to dependencies

**`next.config.ts` additions:**
```typescript
images: {
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [/* existing R2 bucket */],
  minimumCacheTTL: 86400,
},
experimental: {
  optimizeCss: true,
},
headers: async () => [
  {
    source: '/(.*)',
    headers: [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  },
  {
    source: '/og(.*)',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400' }],
  },
],
```

---

### 10. BREADCRUMB SYSTEM

**File: `components/seo/Breadcrumbs.tsx`** — Client component:
- Renders visual breadcrumbs with `aria-label="Breadcrumb"` and `aria-current="page"` on last item
- Accepts `items: { label: string; href?: string }[]`
- Styled to match Karosale brand (green accent, organic aesthetic)
- Injects matching `BreadcrumbList` JSON-LD automatically

**File: `lib/seo/breadcrumbs.ts`:**
```typescript
export function getProductBreadcrumbs(category: Category, product: Product): BreadcrumbItem[]
export function getCategoryBreadcrumbs(category: Category): BreadcrumbItem[]
export function getBlogBreadcrumbs(post: BlogPost): BreadcrumbItem[]
```

---

### 11. SEO UTILITY & AUDIT HOOKS

**File: `lib/seo/utils.ts`:**

```typescript
export function slugify(text: string): string          // handles Hindi → transliterated slug
export function truncateDescription(text: string, maxLength: 160): string
export function extractKeywords(product: Product): string[]   // from name + category + ingredients + certifications
export function generateAltText(product: Product, imageIndex: number): string
export function buildProductTitle(product: Product): string   // max 60 chars
export function isIndexable(page: PageMeta): boolean    // checks noindex conditions
export function getAbsoluteUrl(path: string): string
```

**File: `app/api/seo/audit/route.ts`** — Internal SEO health endpoint (protected by `AUDIT_SECRET` env var):
```typescript
// GET /api/seo/audit?secret=xxx
// Returns JSON report:
// - Products missing meta description
// - Products with duplicate titles
// - Products missing images
// - Categories with < 3 products (thin content risk)
// - Pages missing canonical
// - Sitemap URL count
```

---

### 12. BLOG SEO (if blog exists or scaffolded)

**File: `app/blog/page.tsx`** — Blog index:
- `generateMetadata()` with pagination-aware canonical (`?page=N` → rel="next"/"prev" via Link headers)
- ItemList JSON-LD for post list
- noindex on pages > 1 if paginated (or set canonical to page 1)

**File: `app/blog/[slug]/page.tsx`:**
- Article JSON-LD with `wordCount`, `speakable` schema for voice search
- FAQ JSON-LD if article contains H2 "Frequently Asked Questions" section
- `datePublished` and `dateModified` in metadata
- Reading time in metadata description
- Internal linking suggestions component (non-blocking, AI-powered via Groq)

---

### 13. PRODUCT PAGE SEO ENHANCEMENTS

Add to `app/products/[slug]/page.tsx`:

**Review Schema gating:** Only render `aggregateRating` when `reviewCount >= 3` to avoid Google penalties.

**Availability mapping:**
```typescript
const availabilityMap = {
  in_stock: 'https://schema.org/InStock',
  out_of_stock: 'https://schema.org/OutOfStock',
  pre_order: 'https://schema.org/PreOrder',
  discontinued: 'https://schema.org/Discontinued',
}
```

**`<head>` additions via metadata:**
- `other: { 'product:price:amount': price, 'product:price:currency': 'INR' }` for Facebook Catalog

**URL structure enforcement** (add redirects to `next.config.ts`):
```typescript
// Old URL patterns → new canonical slugs
redirects: async () => [
  { source: '/product/:id(\\d+)', destination: '/products/:slug', permanent: true },
  { source: '/shop/:category/:product', destination: '/products/:product', permanent: true },
]
```

---

### 14. TECHNICAL SEO CHECKLIST — IMPLEMENT ALL

Verify and implement each item. Add a comment `// SEO: ✅ implemented` next to each:

- [ ] `<html lang="en">` (or dynamic locale) in root layout
- [ ] No duplicate `<title>` or `<meta name="description">` tags (audit with `generateMetadata` pattern only)
- [ ] All internal links use absolute paths or correctly resolved relative paths
- [ ] 404 page (`app/not-found.tsx`) has noindex + helpful navigation
- [ ] `app/error.tsx` has noindex
- [ ] Loading states (`app/loading.tsx`) have no metadata (don't leak thin content)
- [ ] Pagination via `<link rel="next">` and `<link rel="prev">` (add to `alternates` in metadata)
- [ ] All images have `alt` text (enforce via ESLint `jsx-a11y/alt-text`)
- [ ] No `target="_blank"` without `rel="noopener noreferrer"`
- [ ] `viewport` meta is NOT in individual page metadata (Next.js handles it)
- [ ] Security headers set (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [ ] HTTPS enforced (Vercel handles; add redirect in `next.config.ts` for http → https in dev parity)
- [ ] `manifest.json` at `/app/manifest.ts` for PWA discoverability
- [ ] `apple-touch-icon`, `favicon` assets in `/public` and referenced in metadata
- [ ] `opengraph-image.png` and `twitter-image.png` in `/app` (static fallback OG images)

---

### 15. ANALYTICS & SEARCH CONSOLE INTEGRATION

**File: `components/seo/Analytics.tsx`** — Server-side, no 'use client':
```tsx
// Inject Google Tag Manager via <Script strategy="afterInteractive">
// Inject Microsoft Clarity (for Indian market heatmaps)
// Read GTM_ID and CLARITY_ID from env
// Must NOT block LCP — use afterInteractive or lazyOnload
// Include <noscript> GTM fallback iframe
```

**File: `app/api/sitemap-ping/route.ts`** — Ping search engines on deploy:
```typescript
// POST endpoint called by Vercel deploy webhook
// Pings:
// - https://www.google.com/ping?sitemap=https://csrorganics.com/sitemap.xml
// - https://www.bing.com/ping?sitemap=https://csrorganics.com/sitemap.xml
// Logs response status
// Protect with DEPLOY_WEBHOOK_SECRET
```

---

## ENVIRONMENT VARIABLES REQUIRED

Add these to `.env.example` with placeholder values:

```bash
# SEO & Analytics
NEXT_PUBLIC_SITE_URL=https://csrorganics.com
NEXT_PUBLIC_GSC_VERIFICATION=           # Google Search Console HTML tag value
NEXT_PUBLIC_BING_VERIFICATION=          # Bing Webmaster Tools meta content value
NEXT_PUBLIC_GTM_ID=                     # Google Tag Manager container ID
NEXT_PUBLIC_CLARITY_ID=                 # Microsoft Clarity project ID
NEXT_PUBLIC_OG_DEFAULT_IMAGE=           # Cloudflare R2 URL to default OG image
AUDIT_SECRET=                           # Random secret for /api/seo/audit endpoint
DEPLOY_WEBHOOK_SECRET=                  # Vercel deploy webhook secret
```

---

## FILE OUTPUT STRUCTURE

After implementation, the following files must exist (create or modify as needed):

```
app/
  layout.tsx                          ← root metadata + Analytics + ResourceHints + JsonLd (Organization + WebSite)
  sitemap.ts                          ← dynamic multi-section sitemap
  robots.ts                           ← full robots config
  manifest.ts                         ← PWA manifest
  not-found.tsx                       ← noindex 404 with navigation
  opengraph-image.png                 ← static fallback OG (1200×630)
  twitter-image.png                   ← static fallback Twitter card
  og/route.tsx                        ← dynamic OG image generation
  api/
    seo/audit/route.ts                ← SEO audit endpoint
    sitemap-ping/route.ts             ← deploy ping endpoint
  products/[slug]/page.tsx            ← generateMetadata + Product JSON-LD + Breadcrumbs
  categories/[slug]/page.tsx          ← generateMetadata + CollectionPage JSON-LD
  brands/[slug]/page.tsx              ← generateMetadata + Brand JSON-LD
  search/page.tsx                     ← generateMetadata with noindex logic
  blog/
    page.tsx                          ← pagination metadata
    [slug]/page.tsx                   ← Article JSON-LD + FAQ JSON-LD

lib/seo/
  metadata.ts                         ← metadata factory functions
  structured-data.ts                  ← all JSON-LD generators
  breadcrumbs.ts                      ← breadcrumb builders
  translations.ts                     ← en/hi SEO translations
  utils.ts                            ← slugify, truncate, keywords, alt text

components/seo/
  JsonLd.tsx                          ← <script type="application/ld+json"> component
  Breadcrumbs.tsx                     ← visual + schema breadcrumbs
  CanonicalHead.tsx                   ← canonical URL component
  ResourceHints.tsx                   ← preconnect/prefetch/preload
  Analytics.tsx                       ← GTM + Clarity injection

middleware.ts                         ← URL canonicalisation + param stripping
next.config.ts                        ← headers, redirects, image optimisation
```

---

## QUALITY BAR — NON-NEGOTIABLE

Before marking any file complete:

1. **Run TypeScript compiler:** `npx tsc --noEmit` — zero errors allowed
2. **Test sitemap:** `curl https://csrorganics.com/sitemap.xml` must return valid XML
3. **Validate JSON-LD:** Use `https://validator.schema.org` — zero errors
4. **Test OG images:** Use `https://opengraph.xyz` to preview
5. **Rich Results Test:** All product pages must pass `https://search.google.com/test/rich-results`
6. **Lighthouse SEO score:** Must be 95+ on product and category pages
7. **No console errors** related to metadata, JSON-LD, or canonical tags
8. **Mobile-first:** All OG images and metadata tested on mobile viewport

---

## IMPLEMENTATION ORDER

Execute strictly in this order to avoid circular dependencies:

1. Audit codebase (read all files listed above)
2. Install missing dependencies (`schema-dts`, `next-intl`, `sharp`, `@vercel/og`)
3. Create `lib/seo/utils.ts`
4. Create `lib/seo/translations.ts`
5. Create `lib/seo/structured-data.ts`
6. Create `lib/seo/metadata.ts`
7. Create `lib/seo/breadcrumbs.ts`
8. Create `components/seo/JsonLd.tsx`
9. Create `components/seo/Breadcrumbs.tsx`
10. Create `components/seo/CanonicalHead.tsx`
11. Create `components/seo/ResourceHints.tsx`
12. Create `components/seo/Analytics.tsx`
13. Update `app/layout.tsx`
14. Create `app/og/route.tsx`
15. Update `app/robots.ts`
16. Update `app/sitemap.ts`
17. Create `app/manifest.ts`
18. Update all dynamic route `page.tsx` files with `generateMetadata`
19. Update `middleware.ts`
20. Update `next.config.ts`
21. Create API routes (`/api/seo/audit`, `/api/sitemap-ping`)
22. Add env vars to `.env.example`
23. Run TypeScript check and fix all errors
24. Document any deviations from this spec with reasoning

---

*Karosale SEO Master Prompt v1.0 — csrorganics.com — Next.js 15 App Router*
