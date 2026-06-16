# CSROrganics — Production-Grade Affiliate & Multi-Tier Commission System
# Admin Portal Implementation — Cursor Master Prompt
# Platform: Next.js 15 (App Router) · Neon PostgreSQL · Vercel · Razorpay · csrorganics.com

---

## ROLE & MANDATE

You are a Senior Full-Stack Engineer specialising in Next.js 15 App Router e-commerce platforms with deep expertise in affiliate marketing systems, multi-tier commission architecture, and financial reconciliation. Your task is to implement a **complete, production-grade, world-class Affiliate & Multi-Tier Commission System** for **CSROrganics (csrorganics.com)** — an Indian B2B2C organic e-commerce marketplace.

The feature set must match or exceed the BarikLabs "Advanced Affiliate & Multi-Tier Commission System" (OpenCart extension #42861) but implemented natively in Next.js 15 with full admin portal control, Neon PostgreSQL persistence, Razorpay payout integration, and a public-facing affiliate dashboard.

---

## MANDATORY PRE-IMPLEMENTATION AUDIT

Before writing a single line of code, execute ALL of the following steps and document findings:

```bash
# 1. Understand project structure
find . -type f \( -name "*.ts" -o -name "*.tsx" \) | grep -v node_modules | grep -v .next | head -100

# 2. Read package.json for installed deps
cat package.json

# 3. Check Next.js config
cat next.config.ts 2>/dev/null || cat next.config.js 2>/dev/null

# 4. Check root layout
cat app/layout.tsx

# 5. Check existing DB schema
find . -name "*.sql" -o -name "schema.ts" -o -name "schema.prisma" | head -20

# 6. Check existing auth implementation
find . -path "*/auth*" -type f | head -20

# 7. Check existing order/payment models
find . -path "*/order*" -o -path "*/payment*" | grep -v node_modules | head -20

# 8. Check admin portal structure
ls -la app/admin 2>/dev/null || ls -la app/\(admin\) 2>/dev/null

# 9. Check existing API routes
find app/api -type f | head -40

# 10. Check env vars
cat .env.example 2>/dev/null || cat .env.local 2>/dev/null | grep -v SECRET | grep -v KEY
```

Document every finding. Identify: auth library used (NextAuth/Lucia/Clerk), ORM (Drizzle/Prisma/raw SQL), existing user/order table structure, admin portal route prefix, existing middleware.

---

## SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│                    AFFILIATE SYSTEM                      │
├──────────────┬──────────────────┬───────────────────────┤
│  PUBLIC LAYER│   AFFILIATE LAYER│   ADMIN LAYER         │
│              │                  │                        │
│ /af/{code}   │ /account/        │ /admin/affiliate/      │
│ /share/{p}/  │   affiliate/     │   dashboard            │
│   {code}     │   dashboard      │   affiliates           │
│ /?ref={code} │   links          │   commissions          │
│              │   commissions    │   payouts              │
│              │   referrals      │   settings             │
│              │   payouts        │   reports              │
└──────────────┴──────────────────┴───────────────────────┘
         │                │                    │
         ▼                ▼                    ▼
    Tracking Cookie   Neon PostgreSQL    Razorpay Payouts
    (7-day TTL)       (affiliate schema)  API + Webhooks
```

---

## DATABASE SCHEMA — IMPLEMENT FIRST

**File: `lib/db/affiliate-schema.sql`** and integrate into your existing Neon DB migration system.

```sql
-- ============================================================
-- AFFILIATE SYSTEM SCHEMA
-- CSROrganics · Neon PostgreSQL
-- ============================================================

-- Affiliate program settings (singleton row, admin-controlled)
CREATE TABLE affiliate_settings (
  id                        SERIAL PRIMARY KEY,
  is_enabled                BOOLEAN NOT NULL DEFAULT true,
  
  -- Commission structure
  default_commission_type   VARCHAR(10) NOT NULL DEFAULT 'percent', -- 'percent' | 'fixed'
  default_commission_value  NUMERIC(10,4) NOT NULL DEFAULT 5.00,    -- % or INR
  
  -- Second-order commission (repeat customer referred by affiliate)
  second_order_commission_enabled BOOLEAN NOT NULL DEFAULT false,
  second_order_commission_value   NUMERIC(10,4) NOT NULL DEFAULT 2.00,
  
  -- New customer discount (incentive for customers using affiliate link)
  new_customer_discount_enabled BOOLEAN NOT NULL DEFAULT false,
  new_customer_discount_type    VARCHAR(10) NOT NULL DEFAULT 'percent',
  new_customer_discount_value   NUMERIC(10,4) NOT NULL DEFAULT 0.00,
  new_customer_discount_max_uses INTEGER,                           -- NULL = unlimited
  
  -- Commission trigger event
  commission_trigger        VARCHAR(20) NOT NULL DEFAULT 'order_complete', -- 'order_placed' | 'order_paid' | 'order_complete'
  
  -- Multi-tier settings (up to 4 tiers)
  multitier_enabled         BOOLEAN NOT NULL DEFAULT false,
  tier1_commission_value    NUMERIC(10,4) NOT NULL DEFAULT 5.00,   -- direct referral
  tier2_commission_value    NUMERIC(10,4) NOT NULL DEFAULT 2.00,
  tier3_commission_value    NUMERIC(10,4) NOT NULL DEFAULT 1.00,
  tier4_commission_value    NUMERIC(10,4) NOT NULL DEFAULT 0.50,
  tier_commission_type      VARCHAR(10) NOT NULL DEFAULT 'percent',
  
  -- Registration commission (for referring new registered users)
  registration_commission_enabled BOOLEAN NOT NULL DEFAULT false,
  registration_commission_value   NUMERIC(10,4) NOT NULL DEFAULT 0.00,
  
  -- Grab referrer (allow affiliate to assign themselves to unclaimed customers)
  allow_grab_referrer       BOOLEAN NOT NULL DEFAULT false,
  
  -- Cookie tracking window
  cookie_duration_days      INTEGER NOT NULL DEFAULT 7,
  
  -- Payout settings
  min_payout_amount         NUMERIC(10,2) NOT NULL DEFAULT 500.00,  -- INR
  payout_method             VARCHAR(20) NOT NULL DEFAULT 'razorpay', -- 'razorpay' | 'bank' | 'wallet'
  auto_payout_enabled       BOOLEAN NOT NULL DEFAULT false,
  auto_payout_threshold     NUMERIC(10,2) NOT NULL DEFAULT 1000.00,
  
  -- Popup/UI settings
  popup_enabled             BOOLEAN NOT NULL DEFAULT true,
  popup_bg_color            VARCHAR(7) NOT NULL DEFAULT '#2D6A4F',
  popup_text_color          VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  popup_show_social_share   BOOLEAN NOT NULL DEFAULT true,
  popup_social_networks     TEXT[] NOT NULL DEFAULT ARRAY['whatsapp','facebook','twitter','instagram'],
  
  -- Excluded products (product IDs that earn no affiliate commission)
  excluded_product_ids      INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO affiliate_settings DEFAULT VALUES;

-- -------------------------------------------------------
-- AFFILIATES
-- -------------------------------------------------------
CREATE TABLE affiliates (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Identity
  username              VARCHAR(50) NOT NULL UNIQUE,   -- unique tracking code / username
  status                VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'active' | 'suspended' | 'rejected'
  
  -- Upline (multi-tier: who referred this affiliate)
  referred_by_affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE SET NULL,
  tier_level            INTEGER NOT NULL DEFAULT 1,    -- depth from root
  
  -- Financial
  total_earned          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_paid            NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  wallet_balance        NUMERIC(12,2) NOT NULL DEFAULT 0.00,  -- pending payable balance
  
  -- Razorpay payout details
  razorpay_contact_id   VARCHAR(50),
  razorpay_fund_account_id VARCHAR(50),
  bank_account_number   VARCHAR(30),
  bank_ifsc             VARCHAR(15),
  bank_account_name     VARCHAR(100),
  upi_id                VARCHAR(100),
  
  -- Preferences
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  approved_at           TIMESTAMPTZ,
  approved_by_admin_id  INTEGER,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX idx_affiliates_username ON affiliates(username);
CREATE INDEX idx_affiliates_status ON affiliates(status);
CREATE INDEX idx_affiliates_referred_by ON affiliates(referred_by_affiliate_id);

-- -------------------------------------------------------
-- AFFILIATE TRACKING LINKS (per product)
-- -------------------------------------------------------
CREATE TABLE affiliate_tracking_links (
  id              SERIAL PRIMARY KEY,
  affiliate_id    INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  product_id      INTEGER REFERENCES products(id) ON DELETE CASCADE, -- NULL = global link
  custom_slug     VARCHAR(100),      -- optional vanity slug
  full_url        TEXT NOT NULL,     -- computed and stored for quick display
  click_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_links_affiliate ON affiliate_tracking_links(affiliate_id);

-- -------------------------------------------------------
-- CLICK TRACKING
-- -------------------------------------------------------
CREATE TABLE affiliate_clicks (
  id              BIGSERIAL PRIMARY KEY,
  affiliate_id    INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  product_id      INTEGER REFERENCES products(id) ON DELETE SET NULL,
  ip_address      INET,
  user_agent      TEXT,
  referrer        TEXT,
  visitor_id      VARCHAR(64),       -- fingerprint / anonymous visitor ID
  converted       BOOLEAN NOT NULL DEFAULT false,  -- did this click result in an order?
  order_id        INTEGER,           -- filled on conversion
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_clicks_created ON affiliate_clicks(created_at);

-- -------------------------------------------------------
-- REFERRAL RELATIONSHIPS (who referred whom as customer)
-- -------------------------------------------------------
CREATE TABLE affiliate_referrals (
  id                    SERIAL PRIMARY KEY,
  affiliate_id          INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_type         VARCHAR(20) NOT NULL DEFAULT 'purchase', -- 'registration' | 'purchase'
  discount_applied      NUMERIC(10,2) NOT NULL DEFAULT 0.00,    -- discount given to new customer
  registration_commission_paid BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referred_user_id)  -- a customer can only have one referrer
);

CREATE INDEX idx_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX idx_referrals_user ON affiliate_referrals(referred_user_id);

-- -------------------------------------------------------
-- COMMISSIONS
-- -------------------------------------------------------
CREATE TABLE affiliate_commissions (
  id                  SERIAL PRIMARY KEY,
  affiliate_id        INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  referred_user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Commission details
  tier_level          INTEGER NOT NULL DEFAULT 1,     -- 1=direct, 2=tier2, etc.
  commission_type     VARCHAR(10) NOT NULL DEFAULT 'percent',
  commission_rate     NUMERIC(10,4) NOT NULL,
  order_subtotal      NUMERIC(12,2) NOT NULL,         -- order value (excl. excluded products)
  commission_amount   NUMERIC(12,2) NOT NULL,
  
  -- Status lifecycle
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending' → 'approved' → 'paid' | 'cancelled'
  
  -- Payout reference
  payout_id           INTEGER,        -- FK to affiliate_payouts added below
  
  -- Cancellation
  cancelled_reason    TEXT,
  cancelled_by_admin  INTEGER,
  cancelled_at        TIMESTAMPTZ,
  
  -- Trigger
  trigger_event       VARCHAR(30) NOT NULL DEFAULT 'order_complete',
  approved_at         TIMESTAMPTZ,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX idx_commissions_order ON affiliate_commissions(order_id);
CREATE INDEX idx_commissions_status ON affiliate_commissions(status);

-- -------------------------------------------------------
-- PAYOUTS
-- -------------------------------------------------------
CREATE TABLE affiliate_payouts (
  id                      SERIAL PRIMARY KEY,
  affiliate_id            INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  
  -- Amount
  requested_amount        NUMERIC(12,2) NOT NULL,
  approved_amount         NUMERIC(12,2),
  
  -- Status lifecycle
  status                  VARCHAR(20) NOT NULL DEFAULT 'requested',
  -- 'requested' → 'approved' → 'processing' → 'paid' | 'failed' | 'rejected'
  
  -- Payment method
  payout_method           VARCHAR(20) NOT NULL DEFAULT 'razorpay',
  bank_account_number     VARCHAR(30),
  bank_ifsc               VARCHAR(15),
  upi_id                  VARCHAR(100),
  
  -- Razorpay payout details
  razorpay_payout_id      VARCHAR(50),
  razorpay_payout_status  VARCHAR(30),
  razorpay_reference_id   VARCHAR(100),
  razorpay_utr            VARCHAR(50),     -- bank UTR for reconciliation
  
  -- Admin action
  reviewed_by_admin_id    INTEGER,
  admin_notes             TEXT,
  rejection_reason        TEXT,
  
  -- Timestamps
  requested_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at             TIMESTAMPTZ,
  processed_at            TIMESTAMPTZ,
  paid_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from commissions to payouts
ALTER TABLE affiliate_commissions ADD CONSTRAINT fk_commission_payout
  FOREIGN KEY (payout_id) REFERENCES affiliate_payouts(id) ON DELETE SET NULL;

CREATE INDEX idx_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX idx_payouts_status ON affiliate_payouts(status);

-- -------------------------------------------------------
-- PRODUCT-SPECIFIC COMMISSION OVERRIDES
-- -------------------------------------------------------
CREATE TABLE affiliate_product_overrides (
  id                  SERIAL PRIMARY KEY,
  product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_excluded         BOOLEAN NOT NULL DEFAULT false,   -- no commission at all
  commission_type     VARCHAR(10),                      -- override type (NULL = use global)
  commission_value    NUMERIC(10,4),                    -- override value
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id)
);

-- -------------------------------------------------------
-- AFFILIATE PROGRAM TIERS (volume-based promotion rules)
-- -------------------------------------------------------
CREATE TABLE affiliate_program_tiers (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(50) NOT NULL,   -- 'Bronze', 'Silver', 'Gold', 'Platinum'
  min_sales_amount    NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  commission_bonus    NUMERIC(10,4) NOT NULL DEFAULT 0.00, -- extra % on top of base
  badge_color         VARCHAR(7) NOT NULL DEFAULT '#CD7F32',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default tiers
INSERT INTO affiliate_program_tiers (name, min_sales_amount, commission_bonus, badge_color, sort_order) VALUES
  ('Seed', 0, 0, '#6B7280', 1),
  ('Sprout', 10000, 1, '#22C55E', 2),
  ('Harvest', 50000, 2, '#F59E0B', 3),
  ('Organic Champion', 200000, 3.5, '#10B981', 4);

-- -------------------------------------------------------
-- MONTHLY COMMISSION SUMMARY (materialized for performance)
-- -------------------------------------------------------
CREATE TABLE affiliate_monthly_summary (
  id              SERIAL PRIMARY KEY,
  affiliate_id    INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,
  month           INTEGER NOT NULL,
  total_clicks    INTEGER NOT NULL DEFAULT 0,
  total_orders    INTEGER NOT NULL DEFAULT 0,
  total_sales     NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_commission NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_paid      NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(affiliate_id, year, month)
);
```

---

## DELIVERABLES — COMPLETE IMPLEMENTATION

### 1. CORE AFFILIATE ENGINE

**File: `lib/affiliate/engine.ts`** — The heart of the system:

```typescript
// Must export these functions (all fully implemented, no stubs):

// Tracking
export async function resolveAffiliateFromCode(code: string): Promise<Affiliate | null>
export async function setAffiliateCookie(res: NextResponse, affiliateId: number, cookieDays: number): Promise<void>
export async function getAffiliateFromCookie(req: NextRequest): Promise<number | null>
export async function recordClick(affiliateId: number, productId: number | null, req: NextRequest): Promise<void>

// Commission calculation
export async function calculateCommission(
  affiliateId: number,
  orderId: number,
  orderItems: OrderItem[],   // filtered by excluded products
  orderSubtotal: number,
  isNewCustomer: boolean,
  isSecondOrder: boolean,
  settings: AffiliateSettings
): Promise<CommissionBreakdown[]>   // returns array: [tier1, tier2, tier3, tier4] as applicable

// Multi-tier upline resolution
export async function resolveUplineChain(affiliateId: number, maxTiers: number): Promise<Affiliate[]>

// Commission trigger (called from order webhook/status change)
export async function triggerCommissions(orderId: number, newStatus: string): Promise<void>

// New customer discount
export async function getNewCustomerDiscount(
  affiliateCode: string,
  settings: AffiliateSettings
): Promise<{ type: 'percent' | 'fixed'; value: number } | null>

// Wallet management
export async function creditWallet(affiliateId: number, amount: number, commissionId: number): Promise<void>
export async function debitWallet(affiliateId: number, amount: number, payoutId: number): Promise<void>

// Monthly summary refresh (call after each commission credit)
export async function refreshMonthlySummary(affiliateId: number): Promise<void>

// Grab referrer (affiliate assigns unclaimed customer to themselves)
export async function grabReferrer(affiliateId: number, customerId: number): Promise<{ success: boolean; reason?: string }>
```

**File: `lib/affiliate/types.ts`** — All TypeScript interfaces:
```typescript
export interface AffiliateSettings { /* all fields from affiliate_settings table */ }
export interface Affiliate { /* all fields from affiliates table */ }
export interface AffiliateCommission { /* all fields from affiliate_commissions */ }
export interface AffiliatePayout { /* all fields from affiliate_payouts */ }
export interface CommissionBreakdown {
  affiliateId: number
  tierLevel: number
  rate: number
  type: 'percent' | 'fixed'
  amount: number
  orderSubtotal: number
}
export interface AffiliateStats {
  totalClicks: number
  totalConversions: number
  conversionRate: number
  totalEarned: number
  pendingBalance: number
  paidOut: number
  thisMonthEarnings: number
  topProduct?: { name: string; commissions: number }
}
```

---

### 2. TRACKING MIDDLEWARE

**Update: `middleware.ts`** — Add affiliate tracking BEFORE your existing canonical URL logic:

```typescript
// Pattern 1: /af/{username} — global affiliate link (redirects to homepage with cookie set)
// Pattern 2: /share/{product_slug}/{username} — product-specific link  
// Pattern 3: Any URL with ?ref={username} query param

// Logic:
// 1. Extract affiliate username from URL pattern
// 2. Look up affiliate by username (use edge-compatible DB query)
// 3. If found and status='active': set cookie affiliate_ref={affiliateId} with Max-Age from settings
// 4. Record click asynchronously (use waitUntil if available, else fire-and-forget fetch to /api/affiliate/click)
// 5. Redirect /af/{username} → homepage (302)
// 6. Redirect /share/{slug}/{username} → /products/{slug} (302)
// 7. Strip ?ref= from URL with 302 redirect (cookie already set)

// Cookie spec:
// Name: csro_affiliate_ref
// Value: affiliateId (integer, encrypted with AES-256 using AFFILIATE_COOKIE_SECRET)
// HttpOnly: true
// Secure: true (production)
// SameSite: Lax
// Path: /
// MaxAge: settings.cookie_duration_days * 86400
```

---

### 3. AFFILIATE TRACKING API ROUTES

**`app/api/affiliate/click/route.ts`** — POST: Record a click
**`app/api/affiliate/register/route.ts`** — POST: Register as affiliate (set username, accept terms)
**`app/api/affiliate/check-username/route.ts`** — GET: Check username availability (debounced from frontend)
**`app/api/affiliate/stats/route.ts`** — GET: Affiliate's own stats (authenticated)
**`app/api/affiliate/links/route.ts`** — GET/POST: Manage tracking links

**`app/api/affiliate/payout/request/route.ts`** — POST: Request a payout
```typescript
// Validate:
// - Affiliate is active
// - Wallet balance >= min_payout_amount from settings
// - No pending payout request exists
// - Payout method details (bank/UPI) are filled
// Create affiliate_payouts row with status='requested'
// Send notification email to affiliate and admin
```

**`app/api/affiliate/grab-referrer/route.ts`** — POST: Grab unclaimed customer
```typescript
// Validate: allow_grab_referrer setting is true
// Validate: customer_id exists and has no existing referrer in affiliate_referrals
// Insert into affiliate_referrals
```

---

### 4. ORDER INTEGRATION

**Update: `app/api/orders/[id]/status/route.ts`** (or your existing order status update handler):

```typescript
// After updating order status, call:
import { triggerCommissions } from '@/lib/affiliate/engine'
await triggerCommissions(orderId, newStatus)

// triggerCommissions internally checks:
// 1. Does this order have an affiliate_ref cookie attached?
// 2. Is the new status matching commission_trigger setting?
// 3. Are commissions already created for this order? (idempotency)
// 4. Calculate multi-tier commissions and insert into affiliate_commissions
// 5. Credit affiliate wallet(s)
// 6. Refresh monthly summaries
// 7. Send commission notification email(s)
```

**Update: `app/api/checkout/route.ts`** (or your order creation handler):

```typescript
// On order creation:
// 1. Read affiliate cookie from request
// 2. Attach affiliate_id to order record (add affiliate_id column to orders table)
// 3. Check if customer is new → apply new_customer_discount if configured
// 4. Record referral in affiliate_referrals if first purchase
// 5. Mark click as converted in affiliate_clicks
```

**Add to `orders` table:**
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00;
CREATE INDEX idx_orders_affiliate ON orders(affiliate_id);
```

---

### 5. ADMIN PORTAL — COMPLETE UI

All admin pages live under `app/admin/affiliate/` (or `app/(admin)/affiliate/` matching your existing admin route group). Use your existing admin layout, auth middleware, and UI component library.

---

#### 5A. ADMIN DASHBOARD — `/admin/affiliate`

**File: `app/admin/affiliate/page.tsx`**

KPI cards (top row):
- Total Affiliates (active / pending / suspended breakdown)
- Total Commissions Earned (all time, INR)
- Commissions Pending Approval (count + INR)
- Pending Payout Requests (count + INR)
- This Month's Commission (INR)
- Top Affiliate (name + earnings this month)

Charts (use Recharts — already in your stack):
- Monthly Commission Trend (last 12 months, line chart)
- Commission by Tier Level (bar: Tier1 vs Tier2 vs Tier3 vs Tier4)
- Top 10 Affiliates by Earnings (horizontal bar)
- Conversion Rate Trend (clicks vs orders, area chart)

Recent Activity feed:
- Last 20 commission events with affiliate name, order ID, amount, status

Quick Actions:
- "Approve Pending Affiliates" button → `/admin/affiliate/affiliates?status=pending`
- "Process Payouts" button → `/admin/affiliate/payouts?status=approved`
- "Export Report" button → CSV download of current month

---

#### 5B. AFFILIATE MANAGEMENT — `/admin/affiliate/affiliates`

**File: `app/admin/affiliate/affiliates/page.tsx`**

Filterable, sortable data table with columns:
| Column | Sortable | Filterable |
|---|---|---|
| ID | ✓ | |
| Name + Email | | ✓ (search) |
| Username | ✓ | ✓ |
| Status | ✓ | ✓ (pending/active/suspended/rejected) |
| Tier (Bronze/Silver/Gold/Platinum) | ✓ | ✓ |
| Total Earned (INR) | ✓ | |
| Wallet Balance (INR) | ✓ | |
| Total Orders Referred | ✓ | |
| Upline Affiliate | | ✓ |
| Joined Date | ✓ | date range |
| Actions | | |

Row Actions:
- **View** → `/admin/affiliate/affiliates/[id]`
- **Approve** (if pending) — single click, updates status, sends email
- **Suspend** — requires reason modal
- **Reject** (if pending) — requires reason
- **Impersonate** — view affiliate dashboard as them (read-only)

Bulk Actions:
- Approve selected
- Suspend selected
- Export selected to CSV

**File: `app/admin/affiliate/affiliates/[id]/page.tsx`** — Affiliate Detail Page:

Sections:
1. **Profile Card** — name, email, username, status badge, tier badge, joined date, upline chain visualisation
2. **Financial Summary** — total earned, wallet balance, total paid, this month
3. **Commission History** table — order ID, date, order total, commission amount, tier, status, action (Cancel Commission)
4. **Referral Network** — tree visualization of this affiliate's downlines (up to 4 tiers, use D3 or simple recursive component)
5. **Payout History** — all payouts with status, amount, method, UTR
6. **Referred Customers** — list of customers referred by this affiliate
7. **Admin Notes** — text area to add internal notes
8. **Payout Details** — bank/UPI info with edit capability
9. **Cancel Commissions** — ability to cancel individual pending commissions with reason

---

#### 5C. COMMISSION MANAGEMENT — `/admin/affiliate/commissions`

**File: `app/admin/affiliate/commissions/page.tsx`**

Filterable table:
| Column | Details |
|---|---|
| Commission ID | |
| Affiliate | name + username |
| Order ID | clickable → order detail |
| Order Date | |
| Order Total (INR) | |
| Tier Level | badge: T1/T2/T3/T4 |
| Commission Rate | e.g. 5% |
| Commission Amount | INR |
| Status | pending/approved/paid/cancelled |
| Trigger Event | order_placed/paid/complete |
| Action | Approve / Cancel |

Filters: affiliate (search), status, tier, date range, min/max amount

Bulk Actions:
- Approve All Pending for Selected Affiliates
- Cancel Selected
- Export to CSV

**Commission Status Workflow (visual):**
```
order placed → [PENDING] → order trigger met → [APPROVED] → payout → [PAID]
                                                           ↘ admin cancel → [CANCELLED]
```

---

#### 5D. PAYOUT MANAGEMENT — `/admin/affiliate/payouts`

**File: `app/admin/affiliate/payouts/page.tsx`**

Payout request queue table:
| Column | Details |
|---|---|
| Payout ID | |
| Affiliate | name + bank/UPI details |
| Requested Amount (INR) | |
| Approved Amount (INR) | editable before approval |
| Method | bank transfer / UPI / Razorpay |
| Status | colour-coded badge |
| Requested Date | |
| Actions | Approve / Reject / Process / Mark Paid |

**Payout Workflow:**
```
requested → approved (admin) → processing (Razorpay API call) → paid (webhook confirms)
                             ↘ rejected (admin, with reason)
                                        ↘ failed (Razorpay failure, retry option)
```

**Approve Payout Modal:**
- Show affiliate bank/UPI details
- Editable "Approved Amount" field (can be less than requested)
- Internal notes field
- "Approve & Send via Razorpay" button — triggers Razorpay Payout API
- "Approve for Manual Transfer" button — marks as processing, manual UTR entry later

**Razorpay Payout Integration:**

**File: `lib/affiliate/razorpay-payout.ts`:**
```typescript
import Razorpay from 'razorpay'

// Must implement:
export async function createRazorpayContact(affiliate: Affiliate): Promise<string>   // returns contact_id
export async function createFundAccount(affiliateId: number, method: 'bank' | 'upi'): Promise<string>  // returns fund_account_id
export async function initiateRazorpayPayout(payoutId: number): Promise<{
  success: boolean
  razorpayPayoutId?: string
  failureReason?: string
}>

// Razorpay Payout API endpoint: POST https://api.razorpay.com/v1/payouts
// Amount must be in paise (INR × 100)
// Mode: IMPS for bank, UPI for UPI
// Purpose: 'payout'
// Queue if bank is on holiday (Razorpay handles queuing)
```

**`app/api/affiliate/webhook/razorpay/route.ts`** — Razorpay payout webhook:
```typescript
// Events to handle:
// payout.processed → mark payout as 'paid', store UTR, send email to affiliate
// payout.failed → mark payout as 'failed', notify admin, allow retry
// Verify Razorpay webhook signature using RAZORPAY_WEBHOOK_SECRET
```

**Payout Stats panel:**
- Total paid this month
- Total pending approval
- Total processing
- Failed payouts requiring attention

---

#### 5E. SETTINGS — `/admin/affiliate/settings`

**File: `app/admin/affiliate/settings/page.tsx`**

Full settings form matching `affiliate_settings` table. Organised in tabs:

**Tab 1: General**
- Enable/Disable affiliate program toggle (master switch)
- Commission type (percent / fixed INR)
- Default commission value
- Commission trigger event (select: Order Placed / Order Paid / Order Complete)
- Cookie duration (days)

**Tab 2: Commission Rules**
- Second order commission enable + value
- Registration commission enable + value (for referring new registered users)
- Volume-based commission tiers table (CRUD: name, min sales amount, bonus %)
- Product exclusions (multi-select product picker with search)
- Product-specific commission overrides (add product → set custom rate)
- Allow affiliate to grab unclaimed customers toggle

**Tab 3: New Customer Discount**
- Enable new customer discount toggle
- Discount type (percent / fixed)
- Discount value
- Max uses (blank = unlimited)

**Tab 4: Multi-Tier Commission**
- Enable multi-tier toggle
- Tier 1–4 commission values (enabled tiers shown, disabled ones greyed)
- Tier commission type (percent / fixed)
- Visual preview: shows how ₹1000 order flows through tiers

**Tab 5: Payout Settings**
- Minimum payout amount (INR)
- Payout method (Razorpay / Manual bank / UPI)
- Auto-payout enable + threshold
- Razorpay account linked indicator (green tick if API keys set)

**Tab 6: Popup & Sharing**
- Enable affiliate popup toggle
- Popup background color (color picker)
- Popup text color (color picker)
- Social networks to show (WhatsApp, Facebook, Twitter, Instagram, Telegram, LinkedIn)
- Preview of popup appears on right side of settings as a live preview

All settings auto-save with debounce (no submit button) or have a single "Save All Settings" button — pick one convention and be consistent. Show success toast on save.

---

#### 5F. REPORTS — `/admin/affiliate/reports`

**File: `app/admin/affiliate/reports/page.tsx`**

Report sections:

**Monthly Summary Table** (paginated, sortable):
| Affiliate | Month | Clicks | Orders | Conversion Rate | Sales (INR) | Commission (INR) | Paid (INR) |
|---|---|---|---|---|---|---|---|

**Top Performers** (filterable by month):
- Top 10 by earnings
- Top 10 by referrals
- Top 10 by conversion rate

**Multi-Tier Network Report:**
- For each root affiliate: show total network size + total network commissions

**Export Options:**
- Export by date range to CSV
- Commission report by affiliate (for tax/GST purposes)
- Payout history (for accounting)

---

### 6. PUBLIC-FACING AFFILIATE DASHBOARD

**File: `app/(account)/affiliate/page.tsx`** — Affiliate's own dashboard (authenticated customer):

Sections:
1. **Status Banner** — shows current status (pending approval, active, suspended)
2. **Stats Cards** — Wallet Balance, Total Earned, This Month, Conversion Rate
3. **My Affiliate Links** — global link + per-product links with copy button and social share buttons
4. **Monthly Report** — table of monthly earnings (scrollable)
5. **Commission History** — recent commissions with order info
6. **Referral Network** — my downlines (if multi-tier enabled)
7. **Payout Section** — current wallet balance, request payout form (bank/UPI details), payout history

**File: `app/(account)/affiliate/register/page.tsx`** — Registration form:
- Username field with real-time availability check
- Terms acceptance
- Optional: referral code of who referred them (to set upline)
- Submit → creates affiliate with status='pending', notifies admin

**File: `app/(account)/affiliate/links/page.tsx`** — Link management:
- Search products to create tracked links
- Display global link prominently
- Social share buttons (WhatsApp deep link, Facebook, Twitter/X, Telegram, Instagram story link)
- QR code generation for each link (use `qrcode` npm package)
- Click stats per link

---

### 7. STOREFRONT INTEGRATION

**File: `components/affiliate/AffiliateShareButton.tsx`** — Product page integration:

```tsx
// Shows on each product page (if affiliate program is enabled)
// If visitor is NOT an affiliate: show "Earn by sharing" CTA → opens registration popup
// If visitor IS an affiliate (check via API): show "Share & Earn" button → opens share popup
// Popup contains:
//   - Product-specific affiliate link (copy button)
//   - Social share buttons (WhatsApp, Facebook, Twitter, Telegram)
//   - Commission preview: "Earn ₹{amount} for each sale!"
// Customize popup colors from affiliate_settings.popup_bg_color / popup_text_color
```

**File: `components/affiliate/AffiliateCodeInput.tsx`** — Cart page:
```tsx
// Input field: "Have an affiliate code? Enter here"
// Validates code via API → shows affiliate name and discount (if new customer)
// Stores in session (overrides cookie if manually entered)
// Show green success or red error state
```

---

### 8. NOTIFICATION SYSTEM

**File: `lib/affiliate/notifications.ts`** — Email notifications via Resend:

```typescript
// Must implement (use your existing Resend setup):
export async function sendAffiliateApprovedEmail(affiliate: Affiliate): Promise<void>
export async function sendAffiliateRejectedEmail(affiliate: Affiliate, reason: string): Promise<void>
export async function sendCommissionEarnedEmail(affiliate: Affiliate, commission: AffiliateCommission, order: Order): Promise<void>
export async function sendPayoutProcessingEmail(affiliate: Affiliate, payout: AffiliatePayout): Promise<void>
export async function sendPayoutCompletedEmail(affiliate: Affiliate, payout: AffiliatePayout): Promise<void>
export async function sendNewAffiliateApplicationEmail(admin: AdminUser, affiliate: Affiliate): Promise<void>
export async function sendPayoutRequestEmail(admin: AdminUser, payout: AffiliatePayout): Promise<void>
```

All emails must be in Hindi + English (bilingual). Use React Email templates. Brand with CSROrganics green palette (`#2D6A4F` primary, `#52B788` accent).

---

### 9. SECURITY & FRAUD PREVENTION

**File: `lib/affiliate/fraud.ts`:**

```typescript
// Self-referral prevention: affiliate cannot use their own affiliate link for purchases
// → Check on order creation: if order.user_id === affiliate.user_id → ignore cookie

// Cookie stuffing detection: flag clicks with >50 clicks from same IP in 1 hour
// → Implement rate limiting in /api/affiliate/click using Upstash Redis or DB counter

// Commission on returns: if order is refunded, reverse the commission
// → Add handler in order refund webhook

// Minimum order age: optional setting — commission only after N days (prevents instant refund abuse)

export async function isSelfReferral(userId: number, affiliateCookieId: number): Promise<boolean>
export async function isClickRateLimited(ip: string): Promise<boolean>
export async function reverseCommissionsForRefund(orderId: number): Promise<void>
```

---

### 10. ADMIN NAVIGATION INTEGRATION

**Update your existing admin sidebar/navigation** to add:

```
📊 Affiliate Program
  ├── Dashboard          /admin/affiliate
  ├── Affiliates         /admin/affiliate/affiliates
  ├── Commissions        /admin/affiliate/commissions
  ├── Payouts            /admin/affiliate/payouts
  ├── Reports            /admin/affiliate/reports
  └── Settings           /admin/affiliate/settings
```

Add notification badges on sidebar:
- "Affiliates" → count of pending applications
- "Payouts" → count of requested payouts awaiting approval

---

## ENVIRONMENT VARIABLES — ADD TO `.env.example`

```bash
# Affiliate System
AFFILIATE_COOKIE_SECRET=          # 32-char random string for AES-256 cookie encryption
AFFILIATE_COOKIE_NAME=csro_affiliate_ref

# Razorpay Payouts (separate from payment collection keys)
RAZORPAY_PAYOUT_KEY_ID=           # Razorpay X Key ID (for payouts/fund transfers)
RAZORPAY_PAYOUT_KEY_SECRET=       # Razorpay X Key Secret
RAZORPAY_PAYOUT_WEBHOOK_SECRET=   # Webhook signing secret for payout events
RAZORPAY_PAYOUT_ACCOUNT_NUMBER=   # Your Razorpay X current account number

# Notifications
ADMIN_AFFILIATE_NOTIFICATION_EMAIL=  # email to notify on new applications and payout requests
```

---

## FILE OUTPUT STRUCTURE

```
app/
  admin/affiliate/
    page.tsx                          ← Dashboard
    affiliates/
      page.tsx                        ← Affiliates list
      [id]/page.tsx                   ← Affiliate detail
    commissions/
      page.tsx                        ← Commission management
    payouts/
      page.tsx                        ← Payout management
    reports/
      page.tsx                        ← Reports
    settings/
      page.tsx                        ← Full settings UI
  (account)/affiliate/
    page.tsx                          ← Affiliate's own dashboard
    register/page.tsx                 ← Registration
    links/page.tsx                    ← Link management
  api/affiliate/
    click/route.ts                    ← Record click
    register/route.ts                 ← Affiliate registration
    check-username/route.ts           ← Username availability
    stats/route.ts                    ← Affiliate stats
    links/route.ts                    ← Tracking links CRUD
    payout/request/route.ts           ← Request payout
    grab-referrer/route.ts            ← Grab unclaimed customer
    webhook/razorpay/route.ts         ← Razorpay payout webhook

lib/affiliate/
  engine.ts                           ← Core commission engine
  types.ts                            ← TypeScript interfaces
  fraud.ts                            ← Fraud prevention
  notifications.ts                    ← Email notifications (Resend)
  razorpay-payout.ts                  ← Razorpay payout API wrapper

lib/db/
  affiliate-schema.sql                ← Full DB schema

components/affiliate/
  AffiliateShareButton.tsx            ← Product page share button + popup
  AffiliateCodeInput.tsx              ← Cart page manual code entry

middleware.ts                         ← Updated with affiliate tracking
```

---

## QUALITY BAR — NON-NEGOTIABLE

Before marking implementation complete:

1. `npx tsc --noEmit` — zero TypeScript errors
2. All DB queries use parameterized statements — zero SQL injection risk
3. All admin routes protected by your existing admin auth middleware
4. All affiliate API routes protected by user session auth
5. Idempotency: running `triggerCommissions(orderId)` twice does NOT create duplicate commissions
6. Self-referral prevention tested: placing an order with your own affiliate code must NOT award commission
7. Multi-tier test: 4-level chain must correctly split commission across all 4 uplines
8. Razorpay payout webhook must verify signature before processing
9. Cookie encryption must work: cookie value must be opaque (not raw affiliate ID)
10. All financial amounts stored as `NUMERIC(12,2)` — never `FLOAT` to avoid rounding errors

---

## IMPLEMENTATION ORDER

Execute strictly in this order:

1. Run codebase audit (all 10 bash commands above)
2. Run DB migration (`affiliate-schema.sql`)
3. Implement `lib/affiliate/types.ts`
4. Implement `lib/affiliate/engine.ts`
5. Implement `lib/affiliate/fraud.ts`
6. Implement `lib/affiliate/razorpay-payout.ts`
7. Implement `lib/affiliate/notifications.ts`
8. Update `middleware.ts` for tracking
9. Implement all `app/api/affiliate/*` routes
10. Update order creation handler (attach affiliate, apply discount)
11. Update order status handler (trigger commissions)
12. Implement admin pages in order: Dashboard → Affiliates → Commissions → Payouts → Reports → Settings
13. Implement public affiliate dashboard pages
14. Implement storefront components (AffiliateShareButton, AffiliateCodeInput)
15. Update admin sidebar navigation
16. Add env vars to `.env.example`
17. TypeScript check — fix all errors
18. Write integration test scenarios in comments at top of `lib/affiliate/engine.ts`

---

*CSROrganics Affiliate System Master Prompt v1.0 — csrorganics.com — Next.js 15 App Router + Neon PostgreSQL + Razorpay*
