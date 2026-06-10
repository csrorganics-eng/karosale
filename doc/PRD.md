# Product Requirements Document (PRD)

**Product:** CSR Organics / Karosale marketplace (Next.js storefront + admin + packer)  
**Document type:** PRD aligned to **current implementation** (as of repo state)  
**Audience:** Product, engineering, operations  
**Related:** [Functional spec](./FUNCTIONAL-SPEC.md) · [End-to-end flows](./END-TO-END-FLOWS.md) · QA artifacts in `docs/`

---

## 1. Executive summary

The product is an **organic products e-commerce platform for India**: a customer-facing shop (browse, search, cart, checkout with Razorpay and COD, orders, loyalty “Karma,” wishlist, referrals, subscriptions, bundles), an **admin back office** (catalog, orders, inventory, reviews, marketing campaigns, merchandising / search ranking, analytics, customers, settings), and a **packer** pick-list workflow. The stack is **Next.js 15**, **Neon PostgreSQL**, **Drizzle ORM**, **Vercel**, with **optional AI** via **Google Gemini** (shop chat, semantic search rerank, personalization profile + “For you” ordering, admin merchandising suggestions, Gemini product copy) and **OpenAI** for one admin path (SEO product description JSON via `OPENAI_API_KEY`).

---

## 2. Goals

| Goal | Description |
|------|-------------|
| **G1 — Convert** | Shoppers discover products, add to cart, apply coupons / loyalty, and complete checkout (online or COD). |
| **G2 — Operate** | Admins manage catalog, inventory, orders, shipping hooks, reviews, campaigns, and reporting. |
| **G3 — Fulfill** | Packers use a dedicated pick list aligned to operational needs. |
| **G4 — Assist** | When configured, Gemini powers conversational shop help, smarter search ordering, and light personalization; failures degrade gracefully (SQL order, cached profile, user-visible quota messaging). |
| **G5 — Trust & compliance** | Server-only secrets; role-based admin/packer access; transactional order and payment verification patterns as implemented in API routes. |

## 3. Non-goals (current implementation)

- **Not a multi-tenant SaaS** in code terms: single merchant / brand configuration (`BUSINESS_*`, `lib/brand.ts`).
- **Vector / embedding search** is not required; product search is **ILIKE-style** keyword/SQL with optional **Gemini rerank** of candidate rows.
- **Vendor portal** may appear in planning docs but is not treated as shipped unless present under `app/` with routes.

---

## 4. Personas

1. **Guest / registered shopper** — browses `/shop`, searches, uses cart (guest cart patterns where applicable), signs in (credentials, magic link, optional Google OAuth), checks out, tracks orders, uses wishlist and loyalty where enabled.
2. **Admin** — `role === "admin"`; full admin nav (dashboard, orders, products, inventory, reviews, karma rewards, marketing, merchandising, analytics, customers, settings).
3. **Packer** — `role === "packer"` or admin; access to packer pick list.
4. **Operations / devops** — configures Vercel env (DB, auth, Razorpay, Resend, Gemini, Inngest, Shiprocket, etc.) and monitors quotas (especially Gemini).

---

## 5. Feature inventory (product view)

### 5.1 Storefront

- Home, category / shop listing, product detail, bundles, cart, checkout (Razorpay + COD paths), order history and detail, AWB tracking page, account hub (profile, addresses, subscriptions, wishlist, loyalty), referral landing `/r/{code}`.

### 5.2 Commerce & engagement

- **Coupons** (API + checkout revalidation as implemented).  
- **Loyalty (“Karma”)** — tiers, balances, earn/redeem flows tied to checkout and Inngest jobs where applicable.  
- **Referrals** — cookie on visit, claim after sign-in.  
- **Wishlist** — logged-in API + guest `localStorage` merge on login.  
- **Subscriptions** — customer-facing pages and APIs under `app/api/subscriptions`.  
- **Reviews** — storefront submission; admin moderation.

### 5.3 AI & discovery (when keys present)

- **Shop chat** (`POST /api/chat`) — Gemini tool use: catalog search, product summary, recent orders (signed-in), human escalation email.  
- **Search semantic rerank** — optional reorder of SQL keyword hits via Gemini; cooldown on quota.  
- **Personalization** — periodic Gemini-built profile from orders + page views; optional rerank of “For you” picks.  
- **Admin** — Gemini product short copy (`/api/admin/products/ai-copy`); search ranking AI suggest; OpenAI separate path for long SEO HTML (`generate-description`).

### 5.4 Admin & warehouse

- Orders lifecycle (list, detail, ship, packaging PDF/tag where implemented), inventory, product CRUD + bulk import, customers, marketing campaigns, analytics snapshot, merchandising / A-B experiments / search ranking, settings.

### 5.5 Integrations

- **Payments:** Razorpay + verification route.  
- **Email:** Resend (transactional, magic links, escalations).  
- **SMS OTP:** Fast2SMS when configured.  
- **Logistics:** Shiprocket webhook and helpers.  
- **Background:** Inngest functions (loyalty expiry, campaigns, low stock, order status, review requests, etc. — see `lib/inngest/`).  
- **Analytics:** PostHog optional (`README.md`).

---

## 6. Success metrics (suggested)

| Area | Example metric |
|------|----------------|
| Commerce | Conversion rate, AOV, coupon usage, COD vs prepaid mix |
| Reliability | Checkout success rate, payment verification errors |
| AI | Chat sessions / resolution without escalation; % searches using rerank vs fallback |
| Ops | Time to ship, pick list accuracy, low-stock alert lead time |

*(Baseline instrumentation: `POST /api/analytics/events` for page/product/search events where wired.)*

---

## 7. Dependencies & constraints

- **Neon** `DATABASE_URL` required for persistence.  
- **Auth** `AUTH_SECRET` / URLs for NextAuth.  
- **Gemini** `GEMINI_API_KEY` (or accepted aliases) for all Gemini features; quota is **per Google project** — RPM/TPM recover quickly; **daily (RPD)** limits may block features for hours until reset (documented in user-facing quota copy).  
- **Model selection** `GEMINI_MODEL` + automatic fallback chain (`lib/gemini.ts`).  
- **Serverless** — in-memory chat rate limits are **per warm instance** (document honestly in runbooks).

---

## 8. Risks

| Risk | Mitigation (implemented or recommended) |
|------|-------------------------------------------|
| Gemini 429 / daily cap | Model fallback chain, chat retry with backoff + `GEMINI_RATE_LIMIT_EXTRA_RETRIES`, semantic search cooldown + `SEARCH_SEMANTIC_DISABLED` kill switch |
| Single-instance rate map | Document; optionally move to Redis for strict global limits |
| Key misuse | Never `NEXT_PUBLIC_*` for AI keys; admin routes use `requireRole` |

---

## 9. Document control

- Update this PRD when major capabilities ship (new surfaces, payment methods, AI scopes).  
- Keep **behavioral detail** in [FUNCTIONAL-SPEC.md](./FUNCTIONAL-SPEC.md) and **sequences** in [END-TO-END-FLOWS.md](./END-TO-END-FLOWS.md).
