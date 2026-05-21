# KAROSALE — MASTER BUILD PROMPT
## World-Class Organic Commerce Platform
### Stack: Next.js 15 + Neon (PostgreSQL via Vercel) + Vercel + Full Automation Suite

---

> **HOW TO USE THIS DOCUMENT**
> This is a single master prompt system broken into a MASTER CONTEXT BLOCK (always paste first) and PHASE PROMPTS (paste one phase at a time). Every prompt is self-contained and production-ready. No placeholders. No TODOs. Complete, deployable code only.
>
> **NEW REQUIREMENT 1 — ONLINE TESTING FOR OVERSEAS QA:**
> All testing is done remotely by a non-engineering QA tester located overseas.
> Every phase must produce a publicly accessible preview URL the moment development is complete.
> The QA tester never touches code, never uses a terminal, and never needs local setup.
> All testing happens via browser only. Testing checklists and bug reporting are plain English.
>
> **NEW REQUIREMENT 2 — NON-ENGINEERING SETUP DOCUMENTATION:**
> A separate, fully illustrated, plain-English setup guide covers every prerequisite
> account, service, and configuration required to run this platform. No terminal
> knowledge assumed. Every step has a screenshot description, exact button to click,
> and what success looks like. See companion document: Karosale Setup Guide.

---

# ════════════════════════════════════════════════
# MASTER CONTEXT BLOCK
# Paste this at the START of EVERY Claude session
# ════════════════════════════════════════════════

```
## PROJECT: Karosale — World-Class Organic Commerce Platform

=== BUSINESS IDENTITY ===
- Business name: Karosale
- Domain: karosale.com (new platform — complete rebuild, do not reference old)
- Category: Organic products marketplace — seeds, manure, composts, fertilizers,
  groceries, garden tools, grow bags, pots & planters
- Market: India (primary), mobile-first audience
- Current state: Rebuilding from scratch with world-class architecture
- Vision: Start as a single-vendor modern marketplace shop → evolve into India's premier
  multi-vendor modern marketplace marketplace
- Brand promise: "Smart Commerce. Seamless Experience."

=== TESTING & QA ARCHITECTURE (NON-NEGOTIABLE) ===

REQUIREMENT: All QA testing is done by an overseas non-engineering tester
via browser only. No local setup. No terminal. No code access ever.

PREVIEW DEPLOYMENT STRATEGY:
- Every feature branch auto-deploys to a unique Vercel Preview URL on git push
- Format: https://karosale-[branch-name]-[hash].vercel.app
- Preview URL is shared with QA tester via WhatsApp/email immediately after push
- Preview deployments connect to SEPARATE test database (Neon preview database)
- Preview deployments use TEST/sandbox API keys for ALL paid services
- Production (main branch only) uses live database and live API keys

BRANCH & RELEASE STRATEGY:
- main → production at karosale.com (only merged after QA signs off)
- develop → staging (always latest integrated code, always has preview URL)
- feature/phase-1-foundation, feature/phase-2-loyalty, etc. → QA preview URLs
- Never push breaking code directly to main
- Every phase = one feature branch = one QA review cycle = one merge to main

QA TESTER ACCESS (browser-only, zero engineering required):
Shared credentials document (Google Doc link sent to QA tester):
  Customer login: qa.tester@karosale.com / QATester@123
  Admin login:    admin.qa@karosale.com / AdminQA@123
  Packer login:   packer.qa@karosale.com / PackerQA@123
  Razorpay test card: 4111 1111 1111 1111 | CVV: 123 | Expiry: 12/26
  Razorpay test UPI: success@razorpay
  Test coupon codes: TESTSHIP (free shipping) | SAVE10 (10% off)
  Test WhatsApp number: +91 XXXXX XXXXX (receives all test notifications)

SEED DATA (auto-runs on every preview deployment):
Generate scripts/seed-test-data.ts that creates:
- 6 categories with images
- 25 products across all categories (varied: in stock, low stock, out of stock, expiring)
- 3 test customers with order history
- 5 orders in different statuses (pending, confirmed, packed, shipped, delivered)
- 2 active coupons
- 1 active subscription
- 3 product reviews (approved)
- Loyalty points balance on test customer account
This runs automatically via: vercel.json build hook for preview environments

BUG REPORTING (non-engineering friendly):
- QA tester uses a pre-built Google Form (generate the form spec in deployment docs)
- Fields: What page? | What did you do? | What happened? | What should happen? | Screenshot
- Form responses go to a Google Sheet that developer monitors
- Bug severity: Blocker (can't proceed) | Major (feature broken) | Minor (cosmetic)

QA CHECKLIST GENERATION:
After generating each phase, also output a PLAIN ENGLISH QA CHECKLIST:
- Written for a non-technical person
- Uses "Click", "Tap", "Type", "You should see" language — never technical terms
- Organized by feature area
- Each test has: Step-by-step actions + Expected result + Pass/Fail checkbox
- Exported as Google Doc format (markdown that can be pasted into Google Docs)


=== BRAND DESIGN SYSTEM ===
- Primary: #6FAF8F (soft elegant green)
- Primary light: #A8D5BA
- Accent: #DCEFE2 (mint mist)
- Secondary accent: #EEF7F1
- Background light: #F8FCF9
- Surface: #FFFFFF
- Surface subtle: #F3F8F4
- Text primary: #1F2937
- Text secondary: #4B5563
- Border: #D7E7DC
- Error: #DC2626
- Success: #16A34A
- Typography:
  - Display: 'Playfair Display' (headings, hero text)
  - Body: 'DM Sans' (UI, body text)
  - Mono: 'JetBrains Mono' (codes, tags, prices)
- Border radius: 14px (cards), 10px (buttons), 8px (inputs), 24px (pills)
- Shadows:
  - Soft: 0 2px 8px rgba(111, 175, 143, 0.08)
  - Medium: 0 6px 24px rgba(111, 175, 143, 0.12)
- Motion: 180ms ease-out for micro-interactions, 320ms for page transitions
- UI Philosophy:
  - Elegant light theme only
  - White + pastel green palette
  - Avoid harsh contrast or saturated colors
  - Premium SaaS + modern marketplace visual style
  - Minimalistic, breathable spacing with glassmorphism where appropriate

=== TECHNOLOGY STACK (NON-NEGOTIABLE) ===

FRONTEND:
- Framework: Next.js 15 (App Router, React Server Components, Turbopack)
- Language: TypeScript 5.x (strict mode, no `any` allowed)
- Styling: Tailwind CSS v4 + CSS variables for brand tokens
- UI Components: Shadcn/ui (customized to brand design system)
- State: Zustand (global) + TanStack Query v5 (server state)
- Forms: React Hook Form + Zod validation
- Animation: Framer Motion (page transitions, micro-interactions)
- Icons: Lucide React
- Images: Next.js Image component (WebP auto-conversion)
- PWA: next-pwa (installable, offline catalog browsing)
- Rich text: Tiptap (product descriptions)

BACKEND API:
- Runtime: Next.js 15 API Routes (Route Handlers) — no separate backend
- All server logic runs in Next.js Route Handlers and Server Actions
- Middleware: Next.js middleware for auth, rate limiting, CORS


DATABASE:
- Provider: Neon PostgreSQL (integrated with Vercel)
- ORM: Drizzle ORM (type-safe, migrations-first, no Prisma)
- Driver: @neondatabase/serverless
- Connection pooling: Neon pooled connections
- Schema: Multi-tenant ready from day one (vendor_id on all relevant tables)
- Full-text search: PostgreSQL pg_trgm + tsvector (no external search service)
- Branching:
  - Production branch for live app
  - Preview branches auto-created for Vercel preview deployments
  - Safe schema migration flow using Drizzle Kit

HOSTING:
- Frontend + API: Vercel (edge runtime where possible)
- Database: Neon (managed PostgreSQL — $7/mo plan)
- Static assets: Cloudflare R2 (product images, PDFs, packaging tags)
- CDN: Cloudflare (automatic via R2 + Workers)

BACKGROUND JOBS:
- Inngest (serverless background jobs, cron, retries, real-time dashboard)
- Used for: order notifications, packaging tag generation, cart abandonment,
  subscription processing, daily reports, expiry alerts, review requests

REAL-TIME:
- Vercel KV (Redis-compatible) — for live order dashboard, stock counters
- Server-Sent Events (SSE) for admin real-time order feed

AUTH:
- Auth.js v5 (NextAuth) — phone OTP + Google OAuth + email magic link
- JWT sessions, httpOnly cookies, CSRF protection built-in

NOTIFICATIONS:
- WhatsApp: Interakt API (primary — order updates, marketing)
- Email: Resend + React Email (transactional + marketing)
- SMS: Fast2SMS (India — OTP, COD verification)
- Push: Web Push API (PWA notifications)

PAYMENTS:
- Razorpay (existing account — UPI, cards, netbanking, wallets, COD)
- Razorpay webhooks → Inngest for async order processing

SHIPPING:
- Shiprocket API (multi-courier, auto AWB, label generation)
- Shiprocket webhooks → status updates → customer notifications

PDF GENERATION:
- @react-pdf/renderer (packaging tags, invoices, pick lists)
- Runs in Inngest background job, stored in Cloudflare R2

AI LAYER:
- OpenAI GPT-4o (existing account)
- Used for: product descriptions, SEO metadata, chatbot, demand insights
- Vercel AI SDK for streaming responses

ANALYTICS:
- PostHog (self-hosted on Render free tier OR PostHog Cloud free)
- Custom business analytics via PostgreSQL views + Recharts in admin


=== REQUIRED SETUP & KEYS POLICY ===
Before implementing any phase, always:
1. Ask for all required API keys, secrets, and service credentials.
2. Validate which services are already configured versus pending.
3. Generate a setup checklist for missing services.
4. Never leave integrations partially configured.
5. Ensure preview and production environments are separated.

MANDATORY SERVICES TO REQUEST:
- Vercel project access
- Neon database connection strings
- Google OAuth credentials
- Razorpay keys (test + production)
- Shiprocket credentials
- Resend API key
- OpenAI API key
- Cloudflare R2 credentials
- Interakt WhatsApp API credentials
- Fast2SMS API key
- PostHog credentials
- Inngest credentials
- Domain DNS access (for karosale.com)
- SMTP / transactional email setup confirmation

At the beginning of every implementation phase, generate:
- Environment setup checklist
- Missing credential checklist
- Preview deployment readiness checklist
- Production go-live checklist

=== CODING STANDARDS (MANDATORY) ===
1. TypeScript strict mode — all types explicit, no `any`, no `as unknown`
2. Every API route has input validation with Zod schemas
3. Every DB query through Drizzle ORM — no raw SQL except complex analytics
4. Error handling: every async function wrapped in try/catch, errors logged
5. Environment variables: all secrets via .env.local, never hardcoded
6. Security: rate limiting on all public APIs, CSRF on mutations, SQL injection impossible via Drizzle
7. Performance: RSC for static/semi-static data, client components only when needed
8. SEO: generateMetadata on every page, structured data (JSON-LD) on product pages
9. Accessibility: ARIA labels, keyboard navigation, color contrast AA minimum
10. Mobile-first: every component designed for 375px width first
11. Images: always use Next.js <Image>, WebP format, proper sizing
12. No placeholder comments — every function complete and working
13. File naming: kebab-case for files, PascalCase for components, camelCase for functions
14. Folder structure must be followed exactly as specified

=== PROJECT FOLDER STRUCTURE ===
karosale/
├── app/                          # Next.js App Router
│   ├── (storefront)/             # Customer-facing pages
│   │   ├── page.tsx              # Homepage
│   │   ├── layout.tsx            # Storefront layout
│   │   ├── shop/
│   │   │   ├── page.tsx          # Product listing
│   │   │   └── [slug]/page.tsx   # Product detail
│   │   ├── cart/page.tsx
│   │   ├── checkout/
│   │   │   ├── page.tsx
│   │   │   └── success/page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── account/page.tsx
│   │   ├── wishlist/page.tsx
│   │   ├── loyalty/page.tsx
│   │   └── track/[awb]/page.tsx
│   ├── (admin)/                  # Admin back office
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── inventory/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── marketing/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── settings/page.tsx
│   ├── (vendor)/                 # Vendor portal (Phase 3)
│   │   ├── layout.tsx
│   │   └── dashboard/page.tsx
│   ├── (packer)/                 # Warehouse packer UI
│   │   ├── layout.tsx
│   │   └── picklist/page.tsx
│   ├── api/                      # Route Handlers
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── products/route.ts
│   │   ├── orders/route.ts
│   │   ├── cart/route.ts
│   │   ├── webhooks/
│   │   │   ├── razorpay/route.ts
│   │   │   └── shiprocket/route.ts
│   │   ├── inngest/route.ts
│   │   └── ...
│   └── globals.css
├── components/
│   ├── storefront/               # Customer-facing components
│   ├── admin/                    # Admin UI components
│   ├── shared/                   # Shared across both
│   └── ui/                       # Shadcn base components
├── lib/
│   ├── db/
│   │   ├── schema.ts             # All Drizzle schema definitions
│   │   ├── migrations/           # Drizzle migrations
│   │   └── queries/              # Typed query functions
│   ├── auth.ts                   # Auth.js config
│   ├── razorpay.ts               # Payment utilities
│   ├── shiprocket.ts             # Shipping utilities
│   ├── interakt.ts               # WhatsApp utilities
│   ├── resend.ts                 # Email utilities
│   ├── inngest/
│   │   ├── client.ts
│   │   └── functions/            # All background job definitions
│   ├── pdf/                      # PDF generation utilities
│   ├── ai.ts                     # OpenAI utilities
│   └── validations/              # Zod schemas
├── hooks/                        # Custom React hooks
├── stores/                       # Zustand stores
├── types/                        # Global TypeScript types
├── emails/                       # React Email templates
├── public/
│   ├── manifest.json             # PWA manifest
│   └── icons/
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
└── .env.example

=== DATABASE SCHEMA (Complete — Drizzle ORM) ===
All tables use UUID primary keys. All timestamps in UTC.
Soft deletes via deleted_at. Multi-vendor ready via vendor_id.

CORE TABLES:
users, sessions, addresses, categories, products, product_images,
product_variants, product_attributes, inventory_log, carts, cart_items,
orders, order_items, order_status_history, packaging_tags, pick_lists,
pick_list_items, coupons, coupon_usage, loyalty_points, loyalty_transactions,
loyalty_tiers, wishlists, subscriptions, reviews, review_images, review_votes,
product_bundles, bundle_items, notifications_log, cart_abandonment,
vendors, vendor_products, vendor_payouts, vendor_violations,
sponsored_listings, b2b_inquiries, affiliates, affiliate_clicks,
campaigns, campaign_products, search_queries, page_views

=== KEY AUTOMATIONS (All via Inngest) ===
1. order.placed → WhatsApp confirm + email receipt + inventory deduct +
   packaging tag PDF + pick list entry + admin WhatsApp alert
2. order.packed → Shiprocket AWB create + label generate + customer notify
3. order.shipped → Customer tracking WhatsApp + email
4. order.delivered → Review request (24hr delay) + karma points award +
   subscription renewal check
5. cart.abandoned → Step 1 WhatsApp (1hr) + Step 2 email+coupon (24hr) +
   Step 3 SMS (48hr)
6. subscription.due → Auto-create order + charge Razorpay + notify customer
7. inventory.low_stock → Admin WhatsApp alert
8. product.expiry_soon → Admin alert (30 days) + auto-markdown option
9. cod.placed → Exotel verification call (1hr after)
10. daily.admin_report → 8PM WhatsApp summary to admin
11. weekly.inventory_forecast → AI demand prediction report
12. review.requested → 24hr post-delivery WhatsApp with review link

=== ENVIRONMENT VARIABLES REQUIRED ===
DATABASE_URL=postgresql://...render.com/karosale
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://karosale.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=
INTERAKT_API_KEY=
RESEND_API_KEY=
FAST2SMS_API_KEY=
OPENAI_API_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=karosale-media
CLOUDFLARE_R2_PUBLIC_URL=https://media.karosale.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=
NEXT_PUBLIC_APP_URL=https://karosale.com
```

---

# ════════════════════════════════════════════════
# PHASE 1 PROMPT
# Foundation: Core Shop + Storefront + Admin + All Automations
# Timeline: Days 1–10
# ════════════════════════════════════════════════

```
[PASTE MASTER CONTEXT BLOCK ABOVE FIRST, THEN THIS]

## YOUR ROLE
You are a principal full-stack engineer and architect building a world-class
modern marketplace e-commerce platform. You write complete, production-ready TypeScript
code. No scaffolding. No placeholders. No TODOs. Every file is deployable.

You are building Karosale — a world-class modern marketplace products shop for India.
Think Amazon-level engineering quality. Think Zara-level design quality.
Think Shopify-level merchant experience. All in one platform.

## PHASE 1 SCOPE

Build the complete foundation: storefront + admin back office + all Phase 1
automations. When Phase 1 is complete, a real customer must be able to:
- Browse products, search, filter, view detail pages
- Add to cart, apply coupons, checkout via Razorpay (online + COD)
- Receive WhatsApp confirmation, track their order, leave a review

And the admin must be able to:
- See new orders in real time with WhatsApp alert
- Print packaging tags (auto-generated PDF with barcode)
- Work from a digital pick list on mobile
- Ship via Shiprocket with one click
- See live dashboard: GMV, orders, low stock

═══════════════════════════════════════
STEP 1: PROJECT SETUP
═══════════════════════════════════════

Generate these files completely:

1. package.json
Include ALL dependencies:
- next@15, react@19, react-dom@19
- typescript, @types/react, @types/node
- tailwindcss@4, @tailwindcss/typography
- drizzle-orm, drizzle-kit, @neondatabase/serverless (works with Render Postgres)
- next-auth@5 (beta), @auth/drizzle-adapter
- zod, react-hook-form, @hookform/resolvers
- zustand, @tanstack/react-query
- framer-motion, lucide-react
- @radix-ui/react-* (all shadcn deps)
- razorpay, @types/razorpay
- inngest
- resend, react-email, @react-email/components
- @react-pdf/renderer
- openai
- aws-sdk (for Cloudflare R2 via S3 SDK)
- sharp (image optimization)
- next-pwa
- recharts (admin analytics charts)
- date-fns
- clsx, tailwind-merge, class-variance-authority

2. next.config.ts — Complete config with:
- Image domains (karosale.com, media.karosale.com, *.r2.dev)
- PWA config
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Redirects from old karosale.com URLs
- Bundle analyzer (optional, commented)

3. tailwind.config.ts — Complete with:
- Brand color tokens as CSS variables
- Custom font families (Playfair Display, DM Sans, JetBrains Mono)
- Custom shadows, border radius tokens
- Animation utilities
- Typography plugin config

4. app/globals.css — Complete with:
- @import for Google Fonts (Playfair Display 400,700,900 + DM Sans 300,400,500,600 + JetBrains Mono 400,500)
- CSS custom properties for all brand tokens (light + dark mode via prefers-color-scheme)
- Base resets
- Scrollbar styling
- Selection color
- Focus ring styles

5. .env.example — All environment variables with descriptions

6. drizzle.config.ts — Complete Drizzle config for Neon PostgreSQL

═══════════════════════════════════════
STEP 2: COMPLETE DATABASE SCHEMA
═══════════════════════════════════════

Generate lib/db/schema.ts — The COMPLETE Drizzle schema.
Use pgTable from drizzle-orm/pg-core.
Every table must have: id (uuid, primaryKey, defaultRandom()), 
created_at (timestamp, defaultNow()), updated_at (timestamp).

TABLES TO GENERATE (complete, with all columns, constraints, indexes):

--- USERS & AUTH ---
users:
  id, email (unique), phone (unique, nullable), name, avatar_url,
  role: enum('customer','admin','vendor','packer') default 'customer',
  whatsapp_opt_in: boolean default true,
  email_opt_in: boolean default true,
  karma_points: integer default 0,
  karma_tier: enum('seedling','grower','harvester','master_farmer') default 'seedling',
  referral_code: varchar(12) unique,
  referred_by: uuid FK→users nullable,
  total_orders: integer default 0,
  total_spent: decimal(10,2) default 0,
  last_ordered_at: timestamp nullable,
  is_active: boolean default true,
  deleted_at: timestamp nullable

addresses:
  id, user_id FK→users, name, phone, line1, line2 nullable,
  city, state, pincode, country default 'IN',
  is_default: boolean default false,
  address_type: enum('home','work','other') default 'home',
  latitude: decimal(10,8) nullable, longitude: decimal(11,8) nullable

--- CATALOG ---
categories:
  id, parent_id FK→categories nullable, name, slug (unique),
  description nullable, image_url nullable, icon nullable,
  sort_order: integer default 0, is_active: boolean default true,
  meta_title nullable, meta_description nullable,
  product_count: integer default 0

products:
  id, vendor_id FK→vendors nullable (null = Karosale own),
  category_id FK→categories, name, slug (unique),
  short_description: text, description: text (rich HTML),
  ai_description: text nullable (AI-generated SEO version),
  price: decimal(10,2), compare_price: decimal(10,2) nullable,
  cost_price: decimal(10,2) nullable,
  sku: varchar(100) unique, barcode: varchar(100) nullable,
  weight_grams: integer nullable, length_cm, width_cm, height_cm: decimal(6,2) nullable,
  stock_qty: integer default 0,
  low_stock_threshold: integer default 10,
  is_modern marketplace_certified: boolean default false,
  certification_type: enum('npop','india_modern marketplace','fssai','other') nullable,
  certification_doc_url: varchar nullable,
  expiry_date: date nullable,
  is_subscription_eligible: boolean default false,
  subscription_discount_pct: decimal(5,2) default 10,
  is_featured: boolean default false,
  is_bestseller: boolean default false,
  is_active: boolean default true,
  sort_order: integer default 0,
  total_sales: integer default 0,
  avg_rating: decimal(3,2) default 0,
  review_count: integer default 0,
  meta_title varchar nullable, meta_description text nullable,
  meta_keywords text nullable,
  schema_markup: jsonb nullable,
  deleted_at timestamp nullable,
  [INDEXES: slug, category_id, vendor_id, is_active, is_featured, sku]
  [FULL TEXT: tsvector generated from name + description + meta_keywords]

product_images:
  id, product_id FK→products, url, alt_text, sort_order, is_primary: boolean

product_variants:
  id, product_id FK→products, name, sku, price, stock_qty, attributes: jsonb

--- INVENTORY ---
inventory_log:
  id, product_id FK→products, variant_id FK nullable,
  type: enum('purchase','sale','adjustment','return','damage','expiry'),
  qty_change: integer, qty_before: integer, qty_after: integer,
  reference_id: uuid nullable, reference_type: varchar nullable,
  note: text nullable, performed_by FK→users nullable

--- CART ---
carts:
  id, user_id FK→users nullable, session_id: varchar nullable,
  coupon_code: varchar nullable, coupon_discount: decimal(10,2) default 0,
  notes: text nullable,
  expires_at: timestamp

cart_items:
  id, cart_id FK→carts, product_id FK→products, variant_id FK nullable,
  qty: integer, unit_price: decimal(10,2), total: decimal(10,2),
  is_subscription: boolean default false

--- ORDERS ---
orders:
  id, order_number: varchar(20) unique (format: CSR-YYYYMMDD-XXXX),
  user_id FK→users, address_id FK→addresses, vendor_id FK→vendors nullable,
  status: enum('pending','confirmed','processing','packed',
               'shipped','out_for_delivery','delivered',
               'cancelled','returned','refunded') default 'pending',
  payment_method: enum('razorpay','cod','wallet','upi'),
  payment_status: enum('pending','authorized','captured','failed','refunded') default 'pending',
  razorpay_order_id varchar nullable, razorpay_payment_id varchar nullable,
  razorpay_signature varchar nullable,
  subtotal: decimal(10,2), discount_amount: decimal(10,2) default 0,
  coupon_code varchar nullable, coupon_discount decimal(10,2) default 0,
  karma_points_used: integer default 0, karma_discount: decimal(10,2) default 0,
  shipping_charge: decimal(10,2) default 0,
  tax_amount: decimal(10,2) default 0,
  total: decimal(10,2),
  shiprocket_order_id: varchar nullable, shiprocket_shipment_id: varchar nullable,
  awb_code: varchar nullable, courier_name: varchar nullable,
  tracking_url: varchar nullable, estimated_delivery: date nullable,
  packaging_tag_url: varchar nullable, shipping_label_url: varchar nullable,
  invoice_url: varchar nullable,
  cod_verified: boolean default false, cod_verified_at: timestamp nullable,
  notes: text nullable, admin_notes: text nullable,
  packed_at: timestamp nullable, shipped_at: timestamp nullable,
  delivered_at: timestamp nullable, cancelled_at: timestamp nullable,
  cancellation_reason: text nullable,
  is_gift: boolean default false, gift_message: text nullable,
  [INDEXES: order_number, user_id, status, payment_status, created_at]

order_items:
  id, order_id FK→orders, product_id FK→products, variant_id FK nullable,
  product_name: varchar, product_sku: varchar, product_image: varchar,
  qty: integer, unit_price: decimal(10,2), total: decimal(10,2),
  packed_qty: integer default 0, is_returned: boolean default false,
  return_reason: text nullable

order_status_history:
  id, order_id FK→orders, status: varchar, note: text nullable,
  changed_by FK→users nullable, metadata: jsonb nullable

--- FULFILLMENT ---
packaging_tags:
  id, order_id FK→orders unique, barcode_string: varchar,
  tag_data: jsonb, pdf_url: varchar nullable,
  printed_at: timestamp nullable, print_count: integer default 0

pick_lists:
  id, date: date, status: enum('open','in_progress','completed'),
  assigned_to FK→users nullable, completed_at: timestamp nullable

pick_list_items:
  id, pick_list_id FK→pick_lists, order_id FK→orders,
  product_id FK→products, product_name: varchar, product_sku: varchar,
  qty_required: integer, qty_picked: integer default 0,
  location: varchar nullable, is_completed: boolean default false,
  completed_at: timestamp nullable

--- PROMOTIONS ---
coupons:
  id, code: varchar(30) unique, name: varchar, description: text nullable,
  type: enum('percentage','flat','free_shipping','buy_x_get_y'),
  value: decimal(10,2), min_order_value: decimal(10,2) default 0,
  max_discount: decimal(10,2) nullable,
  usage_limit: integer nullable, used_count: integer default 0,
  per_user_limit: integer default 1,
  applicable_categories: uuid[] nullable, applicable_products: uuid[] nullable,
  applicable_user_ids: uuid[] nullable,
  starts_at: timestamp, expires_at: timestamp nullable,
  is_active: boolean default true,
  is_referral_coupon: boolean default false,
  created_by FK→users

coupon_usage:
  id, coupon_id FK→coupons, user_id FK→users, order_id FK→orders,
  discount_applied: decimal(10,2)

--- LOYALTY ---
loyalty_tiers:
  id, name, min_points: integer, max_points: integer nullable,
  discount_pct: decimal(5,2), free_shipping_on: decimal(10,2) nullable,
  badge_label: varchar, badge_color: varchar, perks: jsonb

loyalty_transactions:
  id, user_id FK→users, type: enum('earned','redeemed','expired','bonus','referral'),
  points: integer, balance_after: integer, reference_id uuid nullable,
  reference_type varchar nullable, description: text, expires_at: timestamp nullable

--- SUBSCRIPTIONS ---
subscriptions:
  id, user_id FK→users, product_id FK→products, variant_id FK nullable,
  qty: integer default 1,
  frequency: enum('weekly','fortnightly','monthly','bimonthly'),
  next_order_date: date,
  discount_pct: decimal(5,2) default 10,
  status: enum('active','paused','cancelled') default 'active',
  last_order_id FK→orders nullable, total_orders_created: integer default 0,
  razorpay_subscription_id: varchar nullable,
  cancelled_at: timestamp nullable, cancellation_reason: text nullable

--- REVIEWS ---
reviews:
  id, product_id FK→products, user_id FK→users, order_id FK→orders,
  rating: smallint (1-5), title: varchar(100) nullable, body: text,
  pros: text nullable, cons: text nullable,
  is_verified_purchase: boolean default true,
  helpful_count: integer default 0, not_helpful_count: integer default 0,
  status: enum('pending','approved','rejected','flagged') default 'pending',
  admin_reply: text nullable, admin_replied_at: timestamp nullable,
  published_at: timestamp nullable

review_images:
  id, review_id FK→reviews, url: varchar, alt_text: varchar nullable

--- WISHLIST ---
wishlists:
  id, user_id FK→users, product_id FK→products, variant_id FK nullable,
  [UNIQUE: user_id + product_id]

--- NOTIFICATIONS ---
notifications_log:
  id, user_id FK→users nullable, order_id FK→orders nullable,
  channel: enum('whatsapp','email','sms','push'),
  template_name: varchar, payload: jsonb,
  status: enum('queued','sent','delivered','failed','bounced'),
  provider_message_id: varchar nullable,
  sent_at: timestamp nullable, delivered_at: timestamp nullable,
  error_message: text nullable

--- CART ABANDONMENT ---
cart_abandonment:
  id, user_id FK→users nullable, email: varchar nullable,
  phone: varchar nullable, cart_snapshot: jsonb,
  cart_value: decimal(10,2),
  step_1_sent_at: timestamp nullable,
  step_2_sent_at: timestamp nullable,
  step_3_sent_at: timestamp nullable,
  recovered_at: timestamp nullable, recovered_order_id FK→orders nullable,
  is_active: boolean default true

--- SEARCH & ANALYTICS ---
search_queries:
  id, query: varchar, results_count: integer, clicked_product_id FK nullable,
  user_id FK nullable, session_id: varchar nullable

page_views:
  id, path: varchar, product_id FK nullable,
  user_id FK nullable, session_id: varchar,
  referrer: varchar nullable, user_agent: varchar nullable,
  country: varchar nullable, duration_seconds: integer nullable

--- VENDORS (Phase 3 — include schema now, activate later) ---
vendors:
  id, user_id FK→users unique, business_name: varchar,
  business_type: enum('individual','company','farm'),
  gstin: varchar nullable, fssai_license: varchar nullable,
  description: text nullable, logo_url: varchar nullable,
  website: varchar nullable,
  commission_pct: decimal(5,2) default 15,
  quality_score: decimal(3,2) default 5.0,
  fulfillment_type: enum('self','platform') default 'self',
  bank_account: jsonb nullable (encrypted),
  kyc_status: enum('pending','submitted','verified','rejected') default 'pending',
  kyc_documents: jsonb nullable,
  is_active: boolean default false,
  approved_at: timestamp nullable, approved_by FK→users nullable,
  total_gmv: decimal(12,2) default 0,
  [INDEXES: user_id, kyc_status, is_active]

vendor_payouts:
  id, vendor_id FK→vendors, period_start: date, period_end: date,
  order_count: integer, gross_amount: decimal(10,2),
  commission_amount: decimal(10,2), platform_fees: decimal(10,2),
  net_amount: decimal(10,2),
  status: enum('pending','processing','paid','failed') default 'pending',
  paid_at: timestamp nullable, razorpay_payout_id: varchar nullable

--- BUNDLES ---
product_bundles:
  id, name: varchar, slug: varchar unique, description: text,
  image_url: varchar nullable, price: decimal(10,2),
  compare_price: decimal(10,2) nullable,
  is_active: boolean default true, sort_order: integer default 0

bundle_items:
  id, bundle_id FK→product_bundles, product_id FK→products,
  variant_id FK nullable, qty: integer default 1

--- B2B ---
b2b_inquiries:
  id, company_name: varchar, contact_name: varchar,
  email: varchar, phone: varchar, gstin: varchar nullable,
  products_required: jsonb, total_qty_approx: integer nullable,
  message: text, status: enum('new','contacted','quoted','converted','lost'),
  assigned_to FK→users nullable, quoted_amount: decimal(10,2) nullable

--- GENERATE ALSO: ---
- All Drizzle relations() definitions for every table relationship
- Proper TypeScript type exports: type User = typeof users.$inferSelect, etc.
- Index definitions for all FK columns and commonly queried columns
- Check constraints: rating 1-5, qty > 0, price > 0

═══════════════════════════════════════
STEP 3: BACKGROUND JOBS (Inngest)
═══════════════════════════════════════

Generate lib/inngest/client.ts and ALL functions in lib/inngest/functions/:

client.ts:
- Inngest client with event schemas typed via TypeScript
- All event name constants exported

Function files to generate (each completely):

1. order-placed.ts
  Trigger: "order/placed"
  Steps:
  a. Deduct inventory for each order item (with race condition protection)
  b. Create inventory_log entries
  c. Generate order number (CSR-YYYYMMDD-XXXX format)
  d. Send WhatsApp to customer (Interakt template: order_confirmed)
  e. Send order confirmation email (React Email template)
  f. Send WhatsApp to admin ops group (new order alert with items summary)
  g. Create packaging_tag record with tag_data JSON
  h. Inngest.send("packaging-tag/generate")
  i. Create/update today's pick_list entry
  j. Log notification to notifications_log
  k. Update user.total_orders and user.total_spent

2. packaging-tag-generate.ts
  Trigger: "packaging-tag/generate"
  Steps:
  a. Fetch order with all items, customer, address
  b. Generate barcode string (format: CSR-{order_number}-{timestamp})
  c. Build tag_data JSON: { order_number, customer, address, items, barcode, packed_date, handling_notes }
  d. Generate PDF using @react-pdf/renderer:
     - A6 landscape (148×105mm)
     - Karosale header (soft elegant green #1B4332, logo text)
     - Large order number + Code128 barcode (use bwip-js)
     - Customer name + full address (large, readable)
     - Items table: Name | SKU | Qty | Weight
     - Handling icons row based on product attributes
     - Footer: packed date + "Organic. Natural. Trusted."
  e. Upload PDF to Cloudflare R2: packaging-tags/{year}/{month}/{order_number}.pdf
  f. Update packaging_tags.pdf_url
  g. Update orders.packaging_tag_url
  h. Send print link to admin WhatsApp

3. order-status-changed.ts
  Trigger: "order/status-changed"
  Steps:
  a. Send appropriate WhatsApp message based on new status:
     - confirmed: "Your order CSR-XXXX is confirmed!"
     - packed: "Your order is packed and ready to ship"
     - shipped: "Your order is on the way! Track: {tracking_url}"
     - out_for_delivery: "Your order is out for delivery today!"
     - delivered: "Delivered! Enjoy your modern marketplace products 🌿"
     - cancelled: "Your order has been cancelled. Refund in 5-7 days"
  b. Send corresponding email
  c. Log to order_status_history
  d. If delivered → schedule review request for 24hr later
  e. If delivered → award karma points (1 point per ₹10 spent)

4. cart-abandonment.ts
  Trigger: "cart/abandoned" (fired when cart inactive >55 min)
  Steps:
  a. Step 1 (1hr): WhatsApp reminder with cart items and total
  b. Step 2 (24hr): Email with "Your cart is waiting" + auto-generate 5% coupon
  c. Step 3 (48hr): SMS via Fast2SMS
  d. Cancel all steps if cart converts (listen for order/placed event)
  e. Update cart_abandonment tracking table

5. review-request.ts
  Trigger: "review/request-send" (24hr delayed from delivery)
  Steps:
  a. Check if review already submitted (skip if yes)
  b. Send WhatsApp: "How was your order? Share your experience and earn 5 karma points"
  c. Send email with review form deep link
  d. Log notification

6. subscription-processor.ts
  Trigger: cron "0 6 * * *" (6AM daily)
  Steps:
  a. Find all subscriptions where next_order_date = today and status = active
  b. For each: create order → trigger order/placed event → update next_order_date
  c. Send 2-day advance WhatsApp reminder for next batch
  d. Handle payment failures gracefully (retry logic, notify customer)

7. low-stock-alert.ts
  Trigger: "inventory/low-stock" (fired from inventory deduction)
  Steps:
  a. Check if already alerted in last 24hr (skip if yes)
  b. Send WhatsApp to admin: "⚠️ {product_name} has only {stock_qty} units left"
  c. Log alert

8. daily-admin-report.ts
  Trigger: cron "0 20 * * *" (8PM daily)
  Steps:
  a. Query: today's orders count, GMV, avg order value
  b. Query: pending orders count (unfulfilled), COD pending
  c. Query: low stock products list
  d. Query: new customer signups today
  e. Format WhatsApp message with emojis and clear sections
  f. Send to admin WhatsApp number via Interakt

9. expiry-alert.ts
  Trigger: cron "0 9 * * 1" (Monday 9AM weekly)
  Steps:
  a. Find products where expiry_date ≤ 30 days from now
  b. Send admin WhatsApp + email with product list, stock qty, days remaining
  c. Offer one-click markdown (20% discount) via admin action

10. cod-verification.ts
  Trigger: "order/cod-placed" (1hr delay)
  Steps:
  a. Check if order still in pending state
  b. Send WhatsApp asking customer to confirm COD order
  c. If no response in 2hr, flag for manual review
  d. Update cod_verified field on confirmation

11. referral-reward.ts
  Trigger: "user/first-order-placed"
  Steps:
  a. Check if user was referred (referred_by FK)
  b. Award ₹100 karma points to referrer
  c. Send WhatsApp to referrer: "Your friend placed their first order! 100 karma points added"
  d. Log loyalty_transactions for both users

12. invoice-generator.ts
  Trigger: "order/payment-captured"
  Steps:
  a. Generate GST-compliant PDF invoice using @react-pdf/renderer
  b. Include: invoice number, date, Karosale details (GSTIN), customer details,
     items table with HSN codes, tax breakup, total
  c. Upload to R2: invoices/{year}/{month}/{order_number}.pdf
  d. Update orders.invoice_url
  e. Email invoice PDF to customer

═══════════════════════════════════════
STEP 4: API ROUTE HANDLERS
═══════════════════════════════════════

Generate each route handler completely with:
- Full Zod input validation
- Proper HTTP status codes
- Error handling with structured error responses
- Auth checks where required
- Rate limiting headers

app/api/products/route.ts:
  GET: Paginated product list with filters (category, price range, search, 
       is_modern marketplace, in_stock, sort). Full-text search via PostgreSQL tsvector.
       Return: products with primary image, avg_rating, review_count, stock status
  
app/api/products/[slug]/route.ts:
  GET: Single product with all images, variants, related products (same category),
       "frequently bought together" (from order_items co-occurrence query)

app/api/products/search/route.ts:
  GET: Real-time search using PostgreSQL pg_trgm similarity + tsvector.
       Return top 8 results with image, price, slug.
       Log to search_queries table.

app/api/cart/route.ts:
  GET: Current cart (by user session or cookie session_id)
  POST: Add item to cart (create cart if not exists, update qty if exists)
  
app/api/cart/[itemId]/route.ts:
  PATCH: Update cart item qty
  DELETE: Remove cart item

app/api/cart/coupon/route.ts:
  POST: Validate and apply coupon (check all rules, calculate discount)
  DELETE: Remove applied coupon

app/api/orders/route.ts:
  GET: User's order history (auth required, paginated)
  POST: Create order from cart:
    1. Validate cart items still in stock
    2. Create Razorpay order
    3. Create order in DB with status 'pending'
    4. Return Razorpay order_id for frontend

app/api/orders/[id]/route.ts:
  GET: Single order detail with items and status history (auth: own order or admin)

app/api/orders/verify-payment/route.ts:
  POST: Verify Razorpay payment signature, update order status to 'confirmed',
        send inngest event "order/placed"

app/api/webhooks/razorpay/route.ts:
  POST: Verify webhook signature, handle events:
  - payment.captured → confirm order
  - payment.failed → mark order failed, notify customer
  - refund.created → update order status

app/api/webhooks/shiprocket/route.ts:
  POST: Handle tracking updates, map to order status, send inngest event
        "order/status-changed" with new status

app/api/webhooks/inngest/route.ts:
  POST: Inngest webhook handler (serve all functions)

app/api/auth/send-otp/route.ts:
  POST: Send OTP via Fast2SMS to phone number (rate limited: 3 per hour)

app/api/auth/verify-otp/route.ts:
  POST: Verify OTP, create/find user, return session

--- ADMIN APIs (all require role: admin) ---

app/api/admin/orders/route.ts:
  GET: All orders with filters (status, date range, search), paginated.
       Include customer name, total, item count, time since placed.
       Highlight "LATE" orders (unpacked >2hr after placement)

app/api/admin/orders/[id]/route.ts:
  PATCH: Update order status + trigger status change event

app/api/admin/orders/[id]/packaging-tag/route.ts:
  GET: Return packaging tag PDF URL (generate if not exists)
  POST: Trigger reprint (increment print_count)

app/api/admin/orders/[id]/ship/route.ts:
  POST: Create Shiprocket order → get AWB → update order → notify customer

app/api/admin/orders/picklist/route.ts:
  GET: Today's pick list with all items grouped by product location

app/api/admin/orders/[id]/pack-item/route.ts:
  POST: Mark individual item as packed (body: {product_id, qty_packed})
        When all items packed → auto-update order status to 'packed'
        → trigger order/status-changed event

app/api/admin/products/route.ts:
  GET: All products with stock, sales data, low stock flag
  POST: Create product (with AI description generation option)

app/api/admin/products/[id]/route.ts:
  PUT: Update product
  DELETE: Soft delete product

app/api/admin/products/bulk-import/route.ts:
  POST: Accept CSV file, parse, validate, create products in batch

app/api/admin/products/generate-description/route.ts:
  POST: Input {name, category, features[]}
        Call OpenAI GPT-4o → return SEO-optimized description (500-600 words)
        + short_description (100 words) + meta_title + meta_description

app/api/admin/inventory/route.ts:
  GET: All products with stock levels, low stock alerts, expiry dates
  POST: Manual inventory adjustment with reason

app/api/admin/dashboard/route.ts:
  GET: Return all KPIs: 
    today_gmv, today_orders, yesterday_gmv, yesterday_orders (for comparison),
    week_gmv, month_gmv, pending_orders, late_orders,
    low_stock_count, expiring_soon_count, new_customers_today,
    top_5_products (by revenue this month), recent_5_orders,
    order_status_breakdown, revenue_last_30_days (array for chart)

app/api/admin/customers/route.ts:
  GET: All customers with order count, total spent, last order date, tier

app/api/admin/coupons/route.ts:
  GET/POST: List and create coupons

app/api/analytics/events/route.ts:
  POST: Track page views, product views, search queries

═══════════════════════════════════════
STEP 5: STOREFRONT PAGES (Customer-facing)
═══════════════════════════════════════

Design philosophy: Think Zara.com meets BigBasket meets Blinkit.
Clean. Organic. Fast. Mobile-first. Every pixel purposeful.
Animations should feel alive but never distracting.

--- 5A: HOMEPAGE (app/(storefront)/page.tsx) ---

Sections (all server-rendered where possible):

1. HERO SECTION
   - Full-width, height: 90vh on desktop, 70vh on mobile
   - Background: subtle minimal elegant illustration pattern (CSS, no image)
   - Headline: "Nature's Best,\nDelivered Fresh" in Playfair Display 900, 72px
   - Subheadline: "Certified modern marketplace seeds, fertilizers & groceries. Shipped across India."
   - Two CTAs: "Shop Now" (primary, soft elegant green) + "Our Story" (ghost)
   - Free shipping badge: "Free shipping above ₹499"
   - Framer Motion: staggered text reveal on load
   - Mobile: stacked layout, smaller text, bottom CTA bar

2. TRUST STRIP
   - 4 icons + text: "100% Organic Certified" | "Pan-India Delivery" | 
     "Easy Returns" | "4.8★ Rated by 2000+ customers"
   - Horizontal scroll on mobile

3. CATEGORY GRID
   - 6 categories displayed as modern marketplace-shaped cards
   - Vegetable Seeds, Flower Seeds, Organic Manure, Grow Bags, 
     Garden Tools, Organic Groceries
   - Each: category image, name, product count, hover scale animation

4. BESTSELLERS
   - Section: "Our Bestsellers"
   - Horizontal scroll on mobile, 4-column grid on desktop
   - Product cards with: image, name, short category, rating stars, price,
     compare price (strikethrough), add-to-cart button, wishlist heart

5. OFFER BANNER
   - Full-width banner with countdown timer for current offer
   - "Monsoon Special: 20% off all seeds this week"
   - Configurable from admin

6. FEATURED COLLECTION
   - "Starter Garden Kit" — bundle product feature
   - Side-by-side: image left, product list right
   - One-click "Add Kit to Cart"

7. CERTIFICATION TRUST SECTION
   - "Why Choose Karosale?"
   - 3 columns: Certified Organic | Chemical Free | Eco Packaged
   - Each with icon, headline, body text

8. RECENTLY VIEWED (client component, from localStorage)
   - "Continue Browsing" — shows last 6 viewed products

9. REVIEW SHOWCASE
   - 3 featured reviews with star rating, text, customer name, product
   - Horizontal scroll on mobile

10. INSTAGRAM FEED TEASER
    - "Follow @karosale" — 6 placeholder modern marketplace-style cards
    - Links to Instagram

11. NEWSLETTER + WHATSAPP SIGNUP
    - "Join 5,000+ modern marketplace enthusiasts"
    - Email input + WhatsApp number input
    - Privacy note: "No spam. Unsubscribe anytime."

--- 5B: PRODUCT LISTING (app/(storefront)/shop/page.tsx) ---

Layout:
- Desktop: sidebar filters left (240px) + product grid right (4 columns)
- Mobile: filter drawer (slide-up) + 2 column grid

Filter sidebar (sticky on desktop):
- Categories (tree with counts, expand/collapse)
- Price range (dual-handle slider: ₹0–₹5000)
- Rating (star filter: 4★+, 3★+)
- Organic certified (toggle)
- In stock only (toggle)
- [FILTERS ARE URL STATE — shareable filtered URLs]

Sort options: Relevance | Price Low-High | Price High-Low | Newest | Best Rated | Bestsellers

Product card design:
- Image (aspect-ratio 1:1, rounded corners, lazy loaded)
- Organic badge (if certified) — top-left on image
- Bestseller badge — top-right (amber ribbon)
- Wishlist heart — top-right, toggle
- Product name (2 lines, truncated)
- Star rating + review count
- Price (bold) + Compare price (strikethrough, red)
- % savings badge (if compare_price exists)
- Stock indicator: "In Stock" | "Low Stock (3 left)" | "Out of Stock"
- Add to cart button (disabled if out of stock) — becomes "Added ✓" on click
- Quick view on hover (desktop only) — slides up product preview

Pagination: Infinite scroll with "Load More" button (not true infinite auto-scroll)

Active filters: Show as dismissible chips above grid
Results count: "Showing 24 of 142 products"

--- 5C: PRODUCT DETAIL PAGE (app/(storefront)/shop/[slug]/page.tsx) ---

This is the most important page. World-class product pages.

Layout (desktop: 2 column; mobile: stacked):

LEFT COLUMN — Image Gallery:
- Primary image large (sticky on desktop scroll)
- Thumbnails strip below (click to change primary)
- Zoom on hover (desktop)
- Swipe carousel on mobile
- Video thumbnail if product has video

RIGHT COLUMN — Product Info:
- Breadcrumb: Home > Category > Product Name
- Organic certified badge (if applicable) — with "What does this mean?" tooltip
- Product name: Playfair Display, 32px, dark
- Rating: stars + "4.5 (124 reviews)" → scrolls to reviews section
- SKU: small, gray

Price section:
- Current price: 28px, soft elegant green, bold
- Compare price: 20px, gray strikethrough + "Save 20%" badge
- Tax note: "Inclusive of all taxes"

Subscription option (if eligible):
- Toggle: "One time" vs "Subscribe & Save 10%"
- Frequency selector: Weekly / Fortnightly / Monthly
- Price updates dynamically
- "Cancel anytime" note

Variant selector (if variants exist):
- Size/weight options as clickable chips
- Price updates on selection
- Stock status per variant

Stock indicator:
- In stock: green dot + "In Stock"
- Low stock: amber + "Only 5 left!"
- Out of stock: "Notify Me" button (email/WhatsApp)

Add to Cart section:
- Quantity selector (min 1, max: stock_qty or 10)
- Large "Add to Cart" button (soft elegant green, full width on mobile)
- "Buy Now" ghost button
- Wishlist: "♡ Add to Wishlist"
- Pincode delivery check: input + "Check" → shows estimated delivery date

Product highlights (above fold):
- 4 icon+text highlights from product attributes
  Example: 🌱 Organic Certified | 📦 Ships within 24hr | ♻️ Eco Packaging | 💚 Chemical Free

Description tabs:
- Tab 1: Description (rich HTML)
- Tab 2: How to Use (if applicable)
- Tab 3: Specifications (weight, dimensions, certifications)
- Tab 4: Shipping & Returns

Organic certification section:
- If certified: display certificate type, issuing body, validity
- "View Certificate" → opens PDF in lightbox

Social proof:
- "X people bought this in the last 7 days" (dynamic from order data)

Reviews section:
- Rating summary: overall stars + 5-bar breakdown chart
- Filter reviews: All | 5★ | 4★ | 3★ | 2★ | 1★
- Review cards: reviewer name (first name + last initial), date, rating, 
  title, body, photos, helpful vote
- "Verified Purchase" badge
- Load more reviews

Frequently Bought Together:
- 2-3 complementary products with "Add All to Cart" option

Recently Viewed (last 6 products, from localStorage)

Mobile sticky bottom bar:
- Price left + "Add to Cart" right
- Visible only when main add-to-cart button is scrolled out of view

--- 5D: CART PAGE (app/(storefront)/cart/page.tsx) ---

Two-column desktop layout:

LEFT: Cart items
- Each item: image, name, variant, qty stepper, unit price, line total, remove
- "Save for Later" (moves to wishlist)
- Out of stock warning (red) if stock changed since adding
- Subscription indicator if subscription item

RIGHT: Order summary card (sticky)
- Subtotal
- Delivery: free / calculated / "Enter pincode to check"
- Discount: coupon applied or "Have a coupon? Enter code"
- Karma points: "Use 500 points = ₹50 off" toggle
- Tax breakdown (if applicable)
- Total (large)
- "Proceed to Checkout" button
- "Continue Shopping" link
- Trust badges: Secure | Organic | Easy Returns

Upsell section below cart:
- "You might also like" — 4 products from same categories as cart items
- "Add ₹X more for free shipping!" progress bar (if not yet reached threshold)

Empty cart state:
- Illustration (minimal elegant, on-brand)
- "Your cart is empty" + "Start Shopping" CTA

--- 5E: CHECKOUT (app/(storefront)/checkout/page.tsx) ---

Single page, multi-step with progress indicator:

Step 1: Delivery address
- Saved addresses list (if logged in) with "Use this address" buttons
- Add new address form
- Guest checkout: email + address form
- Login prompt (non-blocking): "Already have an account? Login to auto-fill"

Step 2: Delivery options
- Standard (3-5 days, ₹49 or free if above threshold)
- Express (1-2 days, ₹99)
- Estimated delivery date shown
- COD toggle (if eligible for pincode)

Step 3: Payment
- Razorpay integration (opens Razorpay checkout modal)
- COD option: "Pay ₹X on delivery"
- Saved karma points usage toggle
- Final order summary
- Place Order button → opens Razorpay OR confirms COD

Order success page:
- Animated ✓ checkmark
- Order number (large, prominent)
- "WhatsApp confirmation sent to {phone}"
- Estimated delivery date
- "Track Order" + "Continue Shopping" CTAs
- Product recommendations

--- 5F: MY ORDERS (app/(storefront)/orders/page.tsx) ---

Order history list:
- Each order card: order number, date, status badge (color-coded),
  items thumbnail grid, total, primary CTA button
- Status CTA mapping:
  - pending/confirmed → "View Details"
  - processing/packed → "Track Order"
  - shipped/out_for_delivery → "Track Live"
  - delivered → "Reorder" + "Write Review"
  - cancelled → "View Details"

Order Detail page:
- Order number + date + status (large, color-coded)
- Status timeline: placed → confirmed → packed → shipped → delivered
  Each step: icon + label + timestamp (completed/pending/current visual)
- Live tracking embed (Shiprocket tracking iframe or custom tracking)
- Items list with images and quantities
- Price breakdown
- Delivery address
- Invoice download button
- Reorder button (adds all items to cart)
- Cancel order button (if status allows)
- Return/refund request (if delivered < 7 days)

--- 5G: ACCOUNT PAGE (app/(storefront)/account/page.tsx) ---

Profile section: name, email, phone, avatar upload
Address book: list, add, edit, delete, set default
Loyalty section: current points, tier badge, points history, referral link
Subscriptions: active subscriptions with pause/cancel/change frequency
Notification preferences: WhatsApp / email / SMS toggles

--- 5H: WISHLIST (app/(storefront)/wishlist/page.tsx) ---
Grid of wishlisted products with move-to-cart and remove buttons
Share wishlist link
"Back in stock" notification active indicators

--- 5I: PUBLIC TRACKING (app/(storefront)/track/[awb]/page.tsx) ---
No login required. Enter AWB → see order journey timeline + map if available

═══════════════════════════════════════
STEP 6: ADMIN BACK OFFICE
═══════════════════════════════════════

Design philosophy: Think Linear.app meets Shopify Admin.
Dense information. Zero clutter. Every action one click away.
Dark sidebar. Clean white content area. Data tables that breathe.

--- 6A: ADMIN LAYOUT (app/(admin)/layout.tsx) ---

Left sidebar (240px, dark soft elegant green #1B4332):
- Karosale logo (white)
- Navigation sections:
  OVERVIEW: Dashboard
  ORDERS: All Orders, Pick List, Returns
  CATALOG: Products, Categories, Bundles, Reviews
  INVENTORY: Stock Levels, Adjustments, Expiry Tracker
  CUSTOMERS: All Customers, Loyalty, B2B
  MARKETING: Coupons, Campaigns, Subscriptions
  ANALYTICS: Reports, Revenue, Products Performance
  SETTINGS: Store, Shipping, Notifications, Integrations, Team
- Bottom: Signed in as [name] + Sign Out
- Notification bell: unread count badge

Top bar:
- Page title (dynamic)
- Real-time: "● Live" indicator with order count
- Quick actions: "New Product" | "Create Coupon"
- Search (global: orders, products, customers)

Mobile: Bottom tab bar for admin (Dashboard, Orders, Products, More)

--- 6B: DASHBOARD (app/(admin)/dashboard/page.tsx) ---

Real-time KPI cards row:
- Today's GMV (₹X,XXX) with vs yesterday % change
- Today's Orders (XX) with vs yesterday
- Pending (unfulfilled) orders with urgency color (red if >5)
- Low Stock Products count (amber if >0)

Revenue chart (Recharts):
- Line chart: last 30 days revenue
- Hover tooltip with exact date + amount
- Fill gradient under the line

Orders by status (Recharts donut chart):
- Pending / Confirmed / Processing / Shipped / Delivered today

Latest orders table:
- Columns: Order #, Customer, Items, Total, Status badge, Time since placed, Actions
- "LATE" badge (red) if unpacked >2hr
- Quick actions: View | Print Tag | Ship
- Status badge: color-coded (pending=amber, confirmed=blue, shipped=purple, delivered=green)
- Real-time updates via SSE (new orders appear at top)

Low stock alerts:
- Product name, current stock, threshold, "Restock" CTA

Expiring soon:
- Product, expiry date, days remaining, stock qty, "Apply Discount" CTA

--- 6C: ORDERS PAGE (app/(admin)/orders/page.tsx) ---

Filter bar: Status tabs (All | Pending | Processing | Packed | Shipped | Delivered | Cancelled)
Date range picker + Search (order number, customer name, phone)
Export to CSV button

Orders table (dense, data-rich):
- Columns: Order # | Customer | Phone | Items summary | Total | Payment | 
  Status | Placed at | SLA timer | Actions
- SLA timer: counts UP from order placement. Color: green <1hr, amber 1-2hr, red >2hr
- Bulk actions: Select multiple → Change status / Print tags

Order detail page:
- Full order info, all items with images
- Status update dropdown with note field
- Packaging tag: preview + print button
- Pick list: checklist of items (packer can check off)
- Shiprocket integration: "Create Shipment" button → fills AWB automatically
- Customer info with quick WhatsApp link
- Order timeline with all status changes + timestamps
- Admin notes (internal, not visible to customer)
- Refund controls

--- 6D: PACKER VIEW (app/(packer)/picklist/page.tsx) ---

Mobile-optimized, large touch targets, designed for warehouse use:

- Today's orders requiring packing (count)
- Pick list: items sorted by shelf location
- Each item: large product name, SKU, qty needed, qty picked counter
- Tap to increment picked quantity
- When qty_picked = qty_required → item turns green with checkmark
- When all items for an order are picked → "Mark as Packed" prominent button
- Barcode scan input: type or scan barcode → auto-find and check-off item
- Audio feedback on completion (optional)

--- 6E: PRODUCT MANAGEMENT ---

Products list page:
- Table: Image | Name | SKU | Category | Stock | Price | Sales | Status | Actions
- Low stock highlighted in amber
- Expired products in red
- Quick inline edit: price, stock (click to edit)
- Bulk actions: activate/deactivate, change category, bulk price update

New/Edit product page (rich form):
- Basic info: name, slug (auto-generated + editable), category, vendor
- AI assistant: "Generate Description" button → streams GPT-4o response
- Pricing: price, compare price, cost price (private), tax category
- Stock: qty, low stock threshold
- Images: drag-drop upload (multiple), set primary, reorder
- Organic certification: toggle + cert type + document upload
- SEO: meta title, description, keywords (with character count, color indicators)
- Subscriptions: enable toggle + discount %
- Advanced: weight, dimensions (for shipping calc), expiry date, barcode
- Status: active/inactive toggle + save

--- 6F: INVENTORY PAGE ---

Two views: Stock Levels | Expiry Tracker

Stock Levels:
- Table: Product | SKU | Category | Stock Qty | Low Stock Threshold | Status | Action
- Status: In Stock (green) | Low Stock (amber) | Out of Stock (red)
- Inline stock adjustment: +/- buttons + manual entry
- Bulk import stock update via CSV

Expiry Tracker:
- Products with expiry dates, grouped: Expired | This Week | This Month | Next 3 Months
- Apply markdown action: sets compare_price to current price, reduces price by X%

--- 6G: ANALYTICS (app/(admin)/analytics/page.tsx) ---

Revenue overview:
- Date range picker (today, 7d, 30d, 90d, custom)
- Revenue chart (line, Recharts)
- Orders count chart (bar)
- AOV trend (line)

Product performance:
- Top 10 by revenue (bar chart)
- Top 10 by units sold
- Products with declining sales (last 30 vs previous 30)

Customer analytics:
- New vs returning customers (donut)
- Cohort table: signup month → repeat purchase % at 30/60/90 days
- Geographic distribution: orders by state

Funnel analytics:
- Page views → Product views → Add to cart → Checkout → Order
- Drop-off % at each stage

Marketing analytics:
- Coupon usage and revenue impact
- Cart abandonment recovery rate
- WhatsApp notification open rates (if available from Interakt)

═══════════════════════════════════════
STEP 7: SHARED COMPONENTS LIBRARY
═══════════════════════════════════════

Generate completely, following brand design system:

components/storefront/:
- ProductCard.tsx — Full product card with all states
- ProductGrid.tsx — Responsive grid with skeleton loading
- CategoryCard.tsx — Category display card
- CartDrawer.tsx — Slide-in cart from right (mobile: bottom sheet)
- SearchBar.tsx — With instant results dropdown
- Header.tsx — Sticky, transparent→opaque on scroll, mobile hamburger
- Footer.tsx — Links, certifications, social, newsletter signup
- RatingStars.tsx — Display and interactive versions
- PriceDisplay.tsx — Current + compare price + savings badge
- StockBadge.tsx — In stock / low stock / out of stock
- OrganicBadge.tsx — Certification badge with tooltip
- AddToCartButton.tsx — With loading, added, error states
- QuantitySelector.tsx — +/- with min/max constraints
- FilterSidebar.tsx — Desktop sidebar + mobile drawer
- ReviewCard.tsx — Customer review display
- OrderStatusTimeline.tsx — Visual step-by-step order journey
- DeliveryEstimate.tsx — Pincode check widget
- LoyaltyPointsDisplay.tsx — Points + tier badge
- ProductImageGallery.tsx — Desktop zoom + mobile swipe
- WishlistButton.tsx — Heart toggle with optimistic UI
- EmptyState.tsx — Illustrated empty states
- LoadingSkeletons.tsx — All skeleton variants

components/admin/:
- DataTable.tsx — Sortable, filterable table with pagination
- StatCard.tsx — KPI metric card with trend indicator
- StatusBadge.tsx — Color-coded order/product status
- SLATimer.tsx — Real-time timer from order placement
- OrderActions.tsx — Quick action buttons per order
- ProductImageUpload.tsx — Drag-drop multi-image upload to R2
- AIDescriptionGenerator.tsx — Streaming AI description with Vercel AI SDK
- InventoryAdjustment.tsx — Stock adjustment modal
- RevenueChart.tsx — Recharts line chart component
- OrdersDonutChart.tsx — Status breakdown donut

components/shared/:
- PageTransition.tsx — Framer Motion page transitions
- Toast.tsx — Notification toasts (success/error/info)
- Modal.tsx — Base modal with portal
- ConfirmDialog.tsx — Destructive action confirmation
- CopyButton.tsx — Copy text with feedback
- BackButton.tsx — With router history awareness
- SEOHead.tsx — JSON-LD structured data helpers

═══════════════════════════════════════
STEP 8: NOTIFICATION TEMPLATES
═══════════════════════════════════════

Generate complete React Email templates in emails/:

1. order-confirmation.tsx
   - Karosale branded header (soft elegant green)
   - "Thank you for your order! 🌿"
   - Order number + date
   - Items table with images, names, qty, price
   - Subtotal, shipping, discount, total
   - Delivery address
   - Estimated delivery date
   - Track order CTA button
   - Footer: contact, social links, unsubscribe

2. order-shipped.tsx
   - "Your order is on the way! 🚚"
   - AWB number + courier name
   - Track Now CTA
   - Estimated delivery date

3. order-delivered.tsx
   - "Delivered! Enjoy your modern marketplace products 🌿"
   - Review request: "How was your order?"
   - ★★★★★ rating stars (each links to review form)
   - "Earn 5 karma points for your review"

4. cart-abandonment.tsx
   - Subject: "You left something behind 🌱"
   - Cart items (image + name + price)
   - "Complete Your Order" CTA
   - Coupon code if step 2

5. review-request.tsx
   - "Your plants have arrived — tell us how they're doing!"
   - Product purchased image
   - Star rating CTA

6. low-stock-admin.tsx
   - Internal: "⚠️ Low Stock Alert"
   - Product name, current stock, threshold
   - Link to admin inventory page

Generate also Interakt WhatsApp templates (JSON format for API):
All WhatsApp templates in lib/interakt/templates.ts as typed constants.

═══════════════════════════════════════
STEP 9: SEO & PERFORMANCE
═══════════════════════════════════════

Generate for every page:
- generateMetadata() function with dynamic title, description, OG tags
- JSON-LD structured data:
  - Homepage: Organization schema
  - Product pages: Product schema (name, image, price, availability, rating)
  - Category pages: BreadcrumbList schema
  - Reviews: Review schema within Product
- sitemap.ts — Dynamic sitemap generation from all products and categories
- robots.ts — Proper robots.txt
- manifest.ts — PWA web app manifest

Performance optimizations:
- All images via Next.js <Image> with proper sizes prop
- Priority loading for above-fold images
- Prefetching category and product pages on hover
- React cache() for repeated server-side queries
- ISR (revalidate: 3600) on product pages
- SSG for category listing pages
- Edge runtime for API routes where possible

═══════════════════════════════════════
STEP 10: DEPLOYMENT, CI/CD & QA INFRASTRUCTURE
═══════════════════════════════════════

Generate ALL of the following completely:

--- 10A: VERCEL CONFIGURATION ---

vercel.json:
- Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy)
- Function memory and duration settings
- Rewrites for clean URLs
- Environment variable groups: production vs preview

.env.example — Every variable with:
- What it is
- Where to get it (exact URL)
- Whether it's required for preview vs production
- Example format

.env.preview.example — All test/sandbox keys for preview deployments:
- RAZORPAY_KEY_ID=rzp_test_XXXX (test mode)
- DATABASE_URL=postgresql://...render.com/karosale_test
- All other services in sandbox/test mode
- NODE_ENV=test
- NEXT_PUBLIC_IS_PREVIEW=true (shows preview banner in UI)

--- 10B: GITHUB ACTIONS CI/CD ---

.github/workflows/ci.yml — Runs on every pull request:
  - TypeScript type check (tsc --noEmit)
  - ESLint check
  - Build check (next build)
  - Drizzle schema validation
  - If all pass → green check → Vercel auto-deploys preview
  - Post preview URL as PR comment automatically

.github/workflows/deploy-production.yml — Runs on merge to main:
  - All CI checks above
  - Run database migrations: npx drizzle-kit migrate
  - Deploy to Vercel production
  - Run smoke tests (5 basic API health checks)
  - Send deployment notification to admin WhatsApp

.github/pull_request_template.md:
  ## What changed
  [Description]
  
  ## Phase
  [ ] Phase 1 — Foundation
  [ ] Phase 2 — Growth
  [ ] Phase 3 — Marketplace
  
  ## QA Preview URL
  [Vercel will post this automatically]
  
  ## QA Checklist sent to tester?
  [ ] Yes — sent via WhatsApp
  
  ## Ready to merge?
  [ ] QA approved
  [ ] No TypeScript errors
  [ ] No console.log statements left in code

--- 10C: PREVIEW BANNER COMPONENT ---

components/shared/PreviewBanner.tsx:
- Shows ONLY when NEXT_PUBLIC_IS_PREVIEW=true
- Sticky top bar: amber background
- Text: "🧪 TESTING ENVIRONMENT — Payments are in test mode. No real money charged."
- Shows current git branch name + deploy timestamp
- Dismiss button (sessionStorage — hides until next visit)
- Mobile: compact version showing just "TEST MODE"

--- 10D: SEED DATA SCRIPT ---

scripts/seed-test-data.ts — Complete seeding script:

Categories (6):
1. Vegetable Seeds — 8 products
2. Flower & Herb Seeds — 4 products
3. Organic Manure & Compost — 5 products
4. Grow Bags & Planters — 4 products
5. Garden Tools — 3 products
6. Organic Groceries — 4 products

Products (25 total with varied states):
- 18 in stock (varied quantities 5–200)
- 4 low stock (1–4 units, triggers low stock badge)
- 2 out of stock (qty=0)
- 3 with compare_price (shows savings badge)
- 5 marked is_modern marketplace_certified=true
- 2 with expiry_date within 30 days (triggers expiry alerts)
- 5 marked is_featured=true
- 3 marked is_bestseller=true
- 5 with subscription_eligible=true

Test Users (3):
1. QA Customer: qa.tester@karosale.com, phone +91-9999999901
   - 250 karma points (Grower tier)
   - 3 past orders (delivered)
   - 1 active subscription (monthly, Organic Manure)
   - 4 items in wishlist
2. QA Admin: admin.qa@karosale.com, role=admin
3. QA Packer: packer.qa@karosale.com, role=packer

Test Orders (5):
1. Order CSR-TEST-0001: status=delivered, payment=razorpay, 3 items
2. Order CSR-TEST-0002: status=shipped, has AWB, tracking URL
3. Order CSR-TEST-0003: status=packed, packaging tag generated
4. Order CSR-TEST-0004: status=confirmed, in pick list
5. Order CSR-TEST-0005: status=pending, COD, placed 3 hours ago (triggers late alert)

Coupons (2):
- TESTSHIP: free shipping, no minimum, expires in 30 days
- SAVE10: 10% off, min order ₹299, expires in 30 days

Reviews (3 approved, 1 pending moderation):
- Product 1: 5★ "Excellent quality seeds, germination rate is amazing!"
- Product 3: 4★ "Good compost, plants are thriving"
- Product 5: 3★ "Product is good but packaging could be better" (pending)

Script usage:
- package.json script: "seed": "npx tsx scripts/seed-test-data.ts"
- Vercel build hook for preview: runs seed only if DATABASE_URL contains 'test'
- Idempotent: can run multiple times without duplicate data (uses upsert)
- Outputs: "✅ Seeded X categories, Y products, Z users, W orders"

--- 10E: PHASE-BY-PHASE QA CHECKLIST ---

Generate this as a separate markdown file: docs/qa-checklist-phase1.md

FORMAT (plain English, zero technical terms):

# Karosale — QA Testing Checklist
# Phase 1: Core Shop
# Tester: [QA Name] | Date: [DATE] | Preview URL: [URL]

---
HOW TO REPORT A BUG:
Fill out this form: [Google Form URL]
Take a screenshot and attach it.
Mark each test below as ✅ Pass or ❌ Fail.

---
## 1. HOMEPAGE

Test 1.1 — Page loads correctly
1. Open the preview URL in your browser
2. You should see the Karosale homepage with a green header
3. You should see "Where Nature Meets Your Doorstep" text
4. You should see product categories below the hero section
✅ Pass  ❌ Fail

Test 1.2 — Homepage loads on mobile
1. On your phone, open the same preview URL
2. The page should look clean and easy to read
3. All buttons should be easy to tap
4. Nothing should be cut off or overlapping
✅ Pass  ❌ Fail

[Continue this format for EVERY feature in Phase 1 covering:]
- Homepage (5 tests)
- Product search (4 tests)
- Product detail page (6 tests)
- Add to cart (4 tests)
- Checkout — online payment (5 tests)
- Checkout — COD (3 tests)
- My orders page (3 tests)
- Order tracking (3 tests)
- WhatsApp notifications (4 tests — tester checks their WhatsApp)
- Packaging tag (2 tests — admin view)
- Admin dashboard (5 tests)
- Admin orders list (4 tests)
- Packer pick list (3 tests)
- Product management (4 tests)
- Mobile responsiveness (3 tests — all done on phone)

TOTAL: ~55 test cases for Phase 1, all plain English

--- 10F: QA RELEASE PROCESS (documented in code comments and README) ---

docs/qa-release-process.md:

# How to Release for QA Testing
# (For developer — takes 5 minutes)

STEP 1: Push your code
  git add .
  git commit -m "Phase 1: Core shop complete"
  git push origin feature/phase-1-foundation

STEP 2: Wait 3 minutes
  Vercel will automatically build and deploy your code.
  You will see a green checkmark in GitHub when ready.

STEP 3: Get the preview URL
  Go to: vercel.com → your project → Deployments
  Copy the URL that says "Preview" next to your branch name
  It looks like: https://karosale-phase-1-abc123.vercel.app

STEP 4: Send to QA tester
  WhatsApp message template:
  "Hi [QA Name], Phase 1 is ready for testing! 🌿
   Preview URL: [URL]
   Login credentials: [link to Google Doc]
   Testing checklist: [link to Google Doc with checklist]
   Please test and fill the checklist by [DATE].
   Report bugs here: [Google Form link]"

STEP 5: Monitor bug reports
  Check Google Sheet for tester's feedback
  Fix bugs → push to same branch → new preview URL auto-generates
  Send updated URL to tester: "Bug fixes deployed, please retest items marked ❌"

STEP 6: QA approves → merge to production
  When tester marks all items ✅:
  git checkout main
  git merge feature/phase-1-foundation
  git push origin main
  Production deploys automatically. Done.

--- 10G: SMOKE TEST SCRIPT ---

scripts/smoke-test.ts — Runs after every production deployment:
Tests (all via fetch, no browser):
1. GET /api/products → returns 200 with products array
2. GET /api/categories → returns 200 with categories
3. POST /api/cart/add → returns 200 (with test product)
4. GET /api/admin/dashboard → returns 401 (auth check working)
5. GET /health → returns { status: "ok", db: "connected", timestamp }

app/api/health/route.ts:
- Returns system health: DB connection, env vars present, timestamp
- Used by monitoring and smoke tests
- Public endpoint (no auth)

--- 10H: README (Complete) ---

README.md — Full setup guide reference:
- One-line project description
- Architecture diagram (ASCII)
- Quick start for developer (10 steps)
- Environment variables table (with links to where to get each)
- Deployment guide
- QA process summary
- Links to: Setup Guide Doc, QA Checklist, Bug Report Form
- Common issues + solutions (top 5)

═══════════════════════════════════════
EXECUTION ORDER
═══════════════════════════════════════

Build in this exact order. Do not skip ahead.

1. Say "Starting Phase 1 build" and list what you're about to generate
2. Generate Step 1 (project setup files) completely
3. Generate Step 2 (database schema) completely
4. Generate Step 3 (Inngest functions) completely
5. Generate Step 4 (API routes) completely
6. Generate Step 5 (storefront pages) — one page at a time, ask before proceeding
7. Generate Step 6 (admin pages) — one page at a time
8. Generate Step 7 (shared components)
9. Generate Step 8 (email templates)
10. Generate Step 9 (SEO/performance)
11. Generate Step 10 (deployment, CI/CD, seed data, QA infrastructure)
12. Generate docs/qa-checklist-phase1.md (plain English QA checklist for overseas tester)
13. Generate docs/qa-release-process.md (5-minute release guide for developer)

After each step: "Step X complete. Ready for Step X+1?" and wait for confirmation.

FINAL OUTPUT AFTER ALL STEPS:
After generating all code, output a "READY FOR QA" summary:
- List of all files generated (with file paths)
- Git commands to push to feature branch
- Vercel preview URL instructions
- Message template to send to QA tester (copy-paste ready)
- Link to QA checklist (remind developer to share Google Doc)

Code quality check before every file output:
- All imports resolve (no missing packages)
- All TypeScript types correct
- All env variables from .env.example
- No placeholder text or TODO comments
- Mobile-first responsive design
- Error handling present
- Preview banner respects NEXT_PUBLIC_IS_PREVIEW flag

BEGIN. Say "Ready to build Karosale Phase 1. Starting with Step 1: Project Setup." then generate Step 1 immediately.
```

---

# ════════════════════════════════════════════════
# PHASE 2 PROMPT
# Growth Engine: Personalization + Loyalty + Marketing Automation
# Timeline: Days 11–18 (after Phase 1 is live)
# ════════════════════════════════════════════════

```
[PASTE MASTER CONTEXT BLOCK ABOVE FIRST, THEN THIS]

## CONTEXT
Phase 1 is complete and live. The shop is running on Vercel + Neon PostgreSQL.
All automations (notifications, packaging tags, Shiprocket) are working.
Now build Phase 2: growth, retention, and marketing intelligence.

## PHASE 2 NEW FEATURES

═══════════════════════════════════════
P2-1: KARMA LOYALTY SYSTEM (Complete)
═══════════════════════════════════════

Backend (new Drizzle migrations):
- loyalty_tiers table populated with 4 tiers:
  Seedling: 0-499pts, 0% discount
  Grower: 500-1999pts, 3% discount on all orders
  Harvester: 2000-4999pts, 5% discount + free shipping above ₹299
  Master Farmer: 5000+pts, 8% discount + free shipping always + priority support

Earning rules (in Inngest order-delivered function):
- 1 point per ₹10 spent (round down)
- 5 bonus points for submitting a review
- 10 points for referring a user whose first order is placed
- 20 points for first order ever
- 2x points during campaign periods (admin-controlled)

Points expiry: 12 months from earning date (via scheduled Inngest job)

Redemption: 100 points = ₹10 discount (applied at checkout)
Max redemption per order: 50% of order value

Frontend - Loyalty dashboard page:
- Current points balance (large, prominent with tier badge)
- Progress bar to next tier with "X more points to reach {next_tier}"
- Tier benefits comparison table
- Points history table (earned/redeemed with order references)
- "How to earn points" explainer section
- Referral section (see below)

Checkout integration:
- "Use Karma Points" toggle + slider showing how many to use
- Real-time discount calculation

═══════════════════════════════════════
P2-2: REFERRAL PROGRAM
═══════════════════════════════════════

Each user has unique referral_code (6 chars, alphanumeric, generated on signup)
Referral link: karosale.com/r/{code}

Tracking:
- When someone visits /r/{code}: set referral_code cookie (30 days)
- On signup: check cookie, set referred_by FK on new user
- On first order: trigger referral reward

Rewards:
- Referrer: 100 karma points (= ₹10) credited after referee's first order delivers
- Referee: auto-apply ₹50 off first order coupon

Referral dashboard (in account page):
- Your referral link with copy button + WhatsApp share button
- Count: Invited / Signed up / Ordered
- Earnings from referrals (total points)

═══════════════════════════════════════
P2-3: PRODUCT REVIEWS (Enhanced)
═══════════════════════════════════════

Review submission form (only for verified purchasers):
- Star rating (interactive, large)
- Title (optional, 100 chars)
- Pros field (what you liked)
- Cons field (could be better)
- Body text (required, 50-500 chars)
- Photo upload (up to 3, stored in R2)
- Submit → 5 karma points awarded after admin approval

Admin review moderation queue:
- List: product, reviewer, rating, excerpt, date, actions
- Actions: Approve | Reject | Flag
- Reply to review (displayed publicly)

Review analytics:
- Average rating trend (30/60/90 days)
- Rating distribution
- Common keywords in positive reviews (word frequency)
- Common keywords in negative reviews (for product improvement)

═══════════════════════════════════════
P2-4: SUBSCRIPTION ENGINE (Complete)
═══════════════════════════════════════

Product page subscription UI:
- Clean toggle: "One-time purchase" | "Subscribe & Save 10%"
- Frequency selector (pill buttons): Weekly | Fortnightly | Monthly
- "Next delivery: {date}" preview
- "Cancel or pause anytime" reassurance
- Subscription price shown (10% off, real-time calculation)

Subscription management (account page):
- Active subscriptions list: product image, name, frequency, next date, price
- Per subscription: Pause / Skip next / Change frequency / Cancel
- Paused subscriptions: Resume button with next date on resume

Inngest subscription-processor (cron daily):
- Find due subscriptions
- Check stock availability
- Create order with subscription flag
- If Razorpay subscription_id: charge automatically
- Else: send payment link via WhatsApp
- Send 2-day advance reminder

═══════════════════════════════════════
P2-5: PERSONALIZED HOMEPAGE
═══════════════════════════════════════

For authenticated users (RSC with user session):
- "Welcome back, {first_name}! 🌿" greeting
- "Continue Shopping" — last 4 viewed products (from page_views table)
- "Order Again" — top 4 most reordered products (from order_items, last 90 days)
- "Recommended for you" — products from categories of past purchases (collaborative filter: 
  SELECT products from categories that user bought, ordered by sales, excluding already purchased)
- "Your subscription is due in 3 days" — subscription reminder card

For guests:
- Show bestsellers and new arrivals (no personalization)

Admin configurable sections:
- Drag-drop section order in admin settings
- Hero banner text + CTA + background color (no-code editing)
- Featured collection selection
- Campaign banners with date ranges

═══════════════════════════════════════
P2-6: ENHANCED SEARCH
═══════════════════════════════════════

PostgreSQL full-text search improvements:
- tsvector column: to_tsvector('english', name || ' ' || COALESCE(description,'') || ' ' || COALESCE(meta_keywords,''))
- GIN index on tsvector column
- Trigram similarity for typo tolerance (pg_trgm extension)
- Search ranking: ts_rank weighted by sales, rating, stock

Search results page (/shop?q=term):
- Instant results dropdown: top 5 matches while typing (debounced 300ms)
- Full results page with all filters
- "Did you mean..." suggestions for near-misses
- Zero results: suggest related categories + popular products
- Search query logged to search_queries table (for analytics)

Admin search analytics:
- Top 20 search queries (past 30 days)
- Queries with zero results → opportunities for new products
- Search-to-purchase conversion rate per query

═══════════════════════════════════════
P2-7: PRODUCT BUNDLES
═══════════════════════════════════════

Admin bundle creation:
- Name, description, image
- Select products + quantities
- Bundle price (must be < sum of individual prices)
- Savings amount auto-calculated and shown

Bundle product page:
- "Bundle Includes" section with all items listed
- Clear "Bundle Price: ₹XXX (Save ₹YYY)" headline
- Each item individually shown with original price
- Stock check: bundle unavailable if any item is OOS

Checkout: Bundle shows as single line item with expandable list

═══════════════════════════════════════
P2-8: WISHLIST ENHANCEMENT
═══════════════════════════════════════

- Wishlist persisted to DB (not localStorage) for logged-in users
- Guest wishlist in localStorage → merged on login
- "Back in stock" notification: if wishlisted product was OOS → 
  auto WhatsApp + email when restocked
- Wishlist sharing: public link with all products listed
- "Add all to cart" button on wishlist page

═══════════════════════════════════════
P2-9: MARKETING AUTOMATION (Campaigns)
═══════════════════════════════════════

Admin campaign builder:
- Campaign name, type: (flash_sale | seasonal | clearance | launch)
- Target: all customers | specific tier | specific category buyers | inactive (90+ days no order)
- Discount: coupon auto-generated or direct price discount
- Duration: start date + end date
- Notification channels: WhatsApp broadcast | email | push
- Schedule: immediate or scheduled date+time

Campaign execution (Inngest):
- On campaign.start → send WhatsApp broadcast to target segment
- On campaign.end → remove discounts, send "campaign ended" if desired
- Track: messages sent, opens (if available), orders generated during campaign period

Broadcast template builder (admin):
- WhatsApp: message text (with {name}, {code} variables), media attachment
- Preview before send
- Estimated audience size shown before confirm

═══════════════════════════════════════
P2-10: ADVANCED ANALYTICS DASHBOARD
═══════════════════════════════════════

New analytics sections in admin:

Customer Analytics:
- New vs Returning customers trend (stacked bar)
- Customer Lifetime Value distribution
- Churn risk: customers who haven't ordered in 60+ days (with "Reach out" CTA)
- Geographic heatmap: orders by state (D3 or simple table)
- Average days between orders (for subscription timing recommendations)

Product Analytics:
- Revenue by category (stacked area chart, 30 days)
- Conversion rate per product: (product page views → add to cart → order)
- Return rate by product
- Review sentiment summary (avg rating + count trends)

Marketing Analytics:
- Campaign performance: reach, conversions, revenue generated
- Coupon usage: which coupons drive most revenue vs highest discounts
- WhatsApp opt-in rate vs opt-out rate
- Cart abandonment: rate, recovery rate, revenue recovered

Inventory Forecasting (AI-powered):
- Button: "Generate Demand Forecast" → sends data to OpenAI
- Prompt: last 90 days sales velocity per product + category + seasonality hint
- GPT-4o returns: reorder recommendations per product with justification
- Displayed as sortable table with "Act on Recommendation" button

═══════════════════════════════════════
EXECUTION ORDER FOR PHASE 2
═══════════════════════════════════════

1. New Drizzle migrations for Phase 2 tables
2. Loyalty system backend (points calculation, tier logic, APIs)
3. Loyalty frontend (dashboard page, checkout integration)
4. Referral system (backend + frontend + tracking)
5. Enhanced reviews (submission form + moderation + karma reward)
6. Subscription engine (product page UI + management + Inngest cron)
7. Personalized homepage (server components with user data)
8. Enhanced search (tsvector + trigram + search analytics)
9. Product bundles (admin + product page + checkout)
10. Wishlist enhancement (DB persistence + back-in-stock)
11. Marketing campaign builder (admin UI + Inngest execution)
12. Advanced analytics dashboard

Each feature: complete the backend first (migration + API) → then frontend.

BEGIN Phase 2. Start with: "Starting Phase 2. Generating new database migrations first."
```

---

# ════════════════════════════════════════════════
# PHASE 3 PROMPT
# Multi-Vendor Marketplace
# Timeline: Month 3–6 (after Phase 1+2 stable)
# ════════════════════════════════════════════════

```
[PASTE MASTER CONTEXT BLOCK ABOVE FIRST, THEN THIS]

## CONTEXT
Phase 1 + 2 are complete and running. Karosale is now a fully operational
modern marketplace shop with automation and growth features. Now activate the vendor layer
to become India's premier multi-vendor modern marketplace marketplace.

## PHASE 3 SCOPE

═══════════════════════════════════════
P3-1: VENDOR ONBOARDING
═══════════════════════════════════════

Public landing page: /become-a-vendor
- Value proposition: "Sell to 10,000+ modern marketplace enthusiasts across India"
- How it works: 3 steps (Apply → Verify → Start Selling)
- Commission structure: transparent display
- FAQ section
- "Apply Now" CTA → multi-step form

Vendor application form (multi-step):
Step 1: Business details (name, type, state, description)
Step 2: Compliance (GSTIN, FSSAI license upload, modern marketplace certifications)
Step 3: Bank details (account number, IFSC, account name)
Step 4: Product categories they sell
Step 5: Sample products (optional, to showcase)
→ Submit → "Application received, review in 2-3 business days" + WhatsApp confirmation

Admin vendor review queue:
- Application list with KYC documents viewable
- Approve (set is_active=true, send welcome WhatsApp) or Reject (with reason)
- Set commission_pct per vendor (default 15%)

Vendor welcome flow:
- Welcome WhatsApp with vendor portal link + temp password
- Onboarding checklist (profile complete, first product listed, bank verified)

═══════════════════════════════════════
P3-2: VENDOR PORTAL (/vendor/*)
═══════════════════════════════════════

Vendor-specific admin dashboard:
/vendor/dashboard: GMV, orders, pending, quality score, upcoming payout
/vendor/orders: their orders only (filter, fulfill, dispatch)
/vendor/products: their catalog (add, edit, view performance)
/vendor/inventory: their stock levels
/vendor/analytics: their product performance, customer ratings
/vendor/payouts: payout history, upcoming amount, bank details
/vendor/settings: profile, documents, notification preferences

Vendor order management:
- Same pick list + packaging tag system as main admin
- "Generate Shiprocket Shipment" for self-fulfilled orders
- Platform-fulfilled option: vendor ships to Karosale warehouse, we ship to customer

═══════════════════════════════════════
P3-3: COMMISSION ENGINE
═══════════════════════════════════════

Commission calculation (automated):
- On order delivered: calculate vendor_earning = order_subtotal × (1 - commission_pct/100)
- Create vendor_payout record for that week's batch
- Weekly cron (Inngest): aggregate all delivered orders → create payout → 
  trigger Razorpay Payout API → update vendor_payouts.status to 'paid'

Commission rates (admin configurable per vendor or category):
- Default: 15%
- Organic certified vendors: 12%
- Premium/verified farms: 10%
- New vendors (first 3 months): 18%

Vendor payout dashboard:
- This week's earnings (live)
- Pending payout date + amount
- Payout history with downloadable statements
- Commission deduction breakdown per order

═══════════════════════════════════════
P3-4: VENDOR QUALITY SYSTEM
═══════════════════════════════════════

Quality Score (0-5, recalculated weekly):
- Dispatch SLA (orders dispatched within 24hr): 40% weight
- Customer rating average (product reviews): 30% weight
- Return rate (returns due to vendor fault): 20% weight
- Cancellation rate (vendor-initiated): 10% weight

Quality score display:
- Vendor profile page (public): star rating + "Verified Seller" badge
- Product pages: "Sold by {vendor_name} ★{score}"
- Admin: quality score with breakdown + trend

Automatic actions:
- Score < 3.0 for 2 consecutive weeks → warning email + WhatsApp
- Score < 2.0 for 3 consecutive weeks → auto-suspend + admin notification
- Top performers (score > 4.5) → "Top Seller" badge

═══════════════════════════════════════
P3-5: MULTI-VENDOR STOREFRONT CHANGES
═══════════════════════════════════════

Product pages: "Sold by {vendor_name}" with quality score and link to vendor profile
Vendor profile page (/vendor/{slug}): 
  - Vendor name, logo, description, certifications
  - Quality score + total reviews + member since
  - Product grid (their active products)
  - Customer reviews about this vendor

Cart with multiple vendors:
- Group items by vendor in cart summary
- Shipping calculated per vendor (if self-fulfilled)
- Single checkout, multiple fulfillment streams

Search + filters:
- Filter by vendor
- "Karosale Direct" filter for own products

Vendor trust badges on product cards:
- "Karosale" badge (own products)
- "Verified Farm" badge
- "Organic Certified" badge

═══════════════════════════════════════
P3-6: B2B PORTAL
═══════════════════════════════════════

/wholesale page:
- Bulk pricing tiers (visible after B2B account approval):
  10+ units: 10% off
  25+ units: 15% off
  50+ units: 20% off
  100+ units: Custom quote
- B2B account application form (company + GSTIN required)
- "Request a Quote" for custom bulk orders

B2B order flow:
- B2B users see wholesale prices (role-based pricing)
- Minimum order value: ₹2,000
- Payment: Net 15 or 30 days option (for verified accounts)
- GST invoice auto-generated with company details

Admin B2B management:
- B2B account approvals
- Custom quote builder: select products + quantities + discount → generate PDF quote
- B2B order tracking separate from B2C

═══════════════════════════════════════
P3-7: AFFILIATE PROGRAM
═══════════════════════════════════════

/affiliate page:
- Explain program: earn 8% on every order you drive
- Requirements: min 1000 Instagram/YouTube followers OR blog with modern marketplace content
- Apply form → manual review

Affiliate dashboard:
- Unique tracking link: karosale.com/?ref={code}
- Stats: clicks, signups, orders, earnings (30-day attribution cookie)
- Payout: minimum ₹500, via UPI on request

Tracking:
- UTM parameter capture + attribution cookie
- Attribution on order to affiliate
- Commission credited on order delivery

═══════════════════════════════════════
P3-8: SPONSORED LISTINGS
═══════════════════════════════════════

Vendor-facing:
- "Boost Product" option in vendor dashboard
- Set daily budget (min ₹50/day) + CPC bid (min ₹2/click)
- Active/pause/end campaign controls
- Performance: impressions, clicks, orders, ROAS

Platform-side:
- Sponsored products appear in search results (labeled "Sponsored")
- Placement: top 2 results in relevant searches
- CPC deducted from vendor balance daily
- Click fraud protection: same-session deduplication

═══════════════════════════════════════
PHASE 3 EXECUTION ORDER
═══════════════════════════════════════

1. Activate vendor schema (already created in Phase 1 schema)
2. Vendor onboarding flow (landing page + application form + admin review)
3. Vendor portal UI (all pages)
4. Commission engine (calculation + payout automation)
5. Quality score system (calculation + display + auto-actions)
6. Multi-vendor storefront changes (product pages + cart + vendor profiles)
7. B2B portal (landing + application + B2B pricing + quotes)
8. Affiliate program (tracking + dashboard + payout)
9. Sponsored listings (vendor UI + platform display logic)

BEGIN Phase 3. Start with: "Starting Phase 3 marketplace build. Activating vendor schema and generating onboarding flow."
```

---

# ════════════════════════════════════════════════
# STANDALONE PROMPT: PACKAGING TAG GENERATOR
# Can be run independently within any phase
# ════════════════════════════════════════════════

```
[PASTE MASTER CONTEXT BLOCK ABOVE FIRST, THEN THIS]

Build the complete packaging tag generation system for Karosale.
This is a critical back-office automation feature.

PACKAGING TAG SPECIFICATION:

Physical spec:
- Size: A6 landscape (148mm × 105mm) — prints on standard A6 label or cut from A4
- Resolution: 300 DPI equivalent (vector PDF — no pixelation)
- Format: PDF (generated server-side, stored in Cloudflare R2)

Visual design (implement exactly):
- HEADER BAND (top 20mm): background #1B4332 (soft elegant green)
  Left: "KAROSALE" in DM Sans 700, 16pt, white
        "🌿 Organic. Natural. Trusted." in DM Sans 400, 8pt, #74C69D
  Right: "PACKING SLIP" label in DM Sans 500, 9pt, white
- ORDER BLOCK (below header, 25mm):
  Left: "ORDER #" in DM Sans 400, 8pt, gray | "CSR-YYYYMMDD-XXXX" in DM Sans 700, 22pt, #1B4332
  Right: Code128 barcode (bwip-js library) encoding the order number
- CUSTOMER BLOCK (25mm):
  Bold line: Full name (DM Sans 700, 12pt)
  Lines: Address line 1, Address line 2 (if any), City, State - Pincode
  Phone: "📞 {phone}"
- ITEMS TABLE (remaining space, min 25mm):
  Columns: Item Name | Qty | Weight
  Header row: #1B4332 background, white text, DM Sans 600, 8pt
  Data rows: alternating white / #F8FAF5, DM Sans 400, 9pt
  Max 5 items visible (truncate with "+ X more items" if needed)
- FOOTER BAND (bottom 10mm): background #F4A261 (warm orange)
  Left: "Packed: {DD MMM YYYY}" | Right: "Thank you for choosing modern marketplace! 🌿"
  Both: DM Sans 500, 8pt, #1B4332
- HANDLING ICONS ROW (above footer, 8mm):
  Show relevant icons based on product attributes:
  🌿 Organic Certified | 💧 Keep Dry | 📦 Handle With Care | ❄️ Keep Cool

IMPLEMENTATION:

1. lib/pdf/packaging-tag.tsx
   - React component using @react-pdf/renderer
   - Props: PackagingTagProps type (order, items, customer, address)
   - Use Font.register() for DM Sans (load from Google Fonts URL)
   - Use bwip-js to generate barcode as PNG data URL before rendering
   - All measurements in mm (converted to pt: 1mm ≈ 2.835pt)
   - Test render with mock data

2. lib/inngest/functions/packaging-tag-generate.ts
   - Inngest function triggered by "packaging-tag/generate" event
   - Fetch complete order data (order + items + user + address + products)
   - Generate barcode string: "CSR-{order_number}-{timestamp}"
   - Render PDF using ReactPDF.renderToBuffer(PackagingTagComponent)
   - Upload to Cloudflare R2: packaging-tags/{year}/{month}/{order_number}.pdf
   - Update packaging_tags table with pdf_url + barcode_string
   - Update orders.packaging_tag_url
   - Return { success: true, pdf_url }

3. app/api/admin/orders/[id]/packaging-tag/route.ts
   GET: Check if packaging_tag exists → return pdf_url
        If not exists → trigger Inngest job → wait 3 seconds → return status
   POST: Reprint → increment print_count, update printed_at, return pdf_url

4. Admin UI component: components/admin/PackagingTagButton.tsx
   - "🖨️ Print Tag" button
   - Loading state while generating
   - Opens PDF in new tab on success
   - Reprint shows print_count: "Print (3rd print)"
   - Bulk print: select multiple orders → "Print All Tags" → 
     zip of PDFs downloaded

5. Packer mobile view component: PackerOrderCard.tsx
   - Large "PRINT TAG" button (full width, green)
   - Shows tag thumbnail preview (small)
   - Tag status: "Not printed" | "Printed {X} times"
   - Direct to print on tap (mobile printer via AirPrint/network)

GENERATE all 5 files completely. Include TypeScript types for all data structures.
Test the barcode generation separately and confirm it works before PDF generation.
```

---

# ════════════════════════════════════════════════
# SESSION CONTINUATION PROMPT
# Use this when starting a NEW Claude session mid-build
# ════════════════════════════════════════════════

```
[PASTE MASTER CONTEXT BLOCK ABOVE FIRST, THEN THIS]

## CONTINUATION SESSION

We are mid-build on Karosale. Here is the current state:

COMPLETED:
[LIST WHAT YOU HAVE COMPLETED - e.g.:]
- ✅ package.json, next.config.ts, tailwind.config.ts, globals.css
- ✅ Database schema (lib/db/schema.ts) — all tables defined
- ✅ Inngest functions: order-placed, packaging-tag-generate, cart-abandonment
- ✅ API routes: /api/products, /api/cart, /api/orders, /api/webhooks/*

IN PROGRESS:
[LIST WHAT YOU WERE WORKING ON - e.g.:]
- 🔄 Homepage (app/(storefront)/page.tsx) — completed hero + trust strip
  Next: categories grid section

NOT STARTED:
[LIST WHAT REMAINS]
- ❌ Shop listing page
- ❌ Product detail page
- ❌ Cart page
- ❌ Checkout
- ❌ Admin pages
- [etc.]

CURRENT ISSUE (if any):
[Paste any error you're getting]

CONTINUE from where we left off. Next task: [SPECIFIC TASK].
```

---

# ════════════════════════════════════════════════
# DEBUGGING PROMPT
# Use when something is broken
# ════════════════════════════════════════════════

```
[PASTE MASTER CONTEXT BLOCK ABOVE FIRST, THEN THIS]

## DEBUG SESSION — Karosale

I have an error in my Karosale build.

STACK: Next.js 15 + Drizzle ORM + Neon PostgreSQL + Vercel + Inngest

ERROR:
[PASTE FULL ERROR MESSAGE + STACK TRACE]

FILE WITH ISSUE:
[PASTE FULL FILE CONTENTS]

CONTEXT:
[Describe what you were trying to do when the error occurred]

WHAT I ALREADY TRIED:
[List what you tried]

Please:
1. Identify the root cause
2. Show the complete fixed file (not just the changed lines)
3. Explain why this happened so I can avoid it elsewhere
4. Check if the same issue exists in any related files

Do not use any workarounds. Fix it correctly, production-ready.
```
