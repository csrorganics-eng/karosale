-- Affiliate program (CSROrganics / Karosale) — UUID users/orders/products, serial affiliate PK

CREATE TABLE IF NOT EXISTS affiliate_settings (
  id SERIAL PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  default_commission_type VARCHAR(10) NOT NULL DEFAULT 'percent',
  default_commission_value NUMERIC(10,4) NOT NULL DEFAULT 5.00,
  second_order_commission_enabled BOOLEAN NOT NULL DEFAULT false,
  second_order_commission_value NUMERIC(10,4) NOT NULL DEFAULT 2.00,
  new_customer_discount_enabled BOOLEAN NOT NULL DEFAULT false,
  new_customer_discount_type VARCHAR(10) NOT NULL DEFAULT 'percent',
  new_customer_discount_value NUMERIC(10,4) NOT NULL DEFAULT 0.00,
  new_customer_discount_max_uses INTEGER,
  commission_trigger VARCHAR(20) NOT NULL DEFAULT 'order_complete',
  multitier_enabled BOOLEAN NOT NULL DEFAULT false,
  tier1_commission_value NUMERIC(10,4) NOT NULL DEFAULT 5.00,
  tier2_commission_value NUMERIC(10,4) NOT NULL DEFAULT 2.00,
  tier3_commission_value NUMERIC(10,4) NOT NULL DEFAULT 1.00,
  tier4_commission_value NUMERIC(10,4) NOT NULL DEFAULT 0.50,
  tier_commission_type VARCHAR(10) NOT NULL DEFAULT 'percent',
  registration_commission_enabled BOOLEAN NOT NULL DEFAULT false,
  registration_commission_value NUMERIC(10,4) NOT NULL DEFAULT 0.00,
  allow_grab_referrer BOOLEAN NOT NULL DEFAULT false,
  cookie_duration_days INTEGER NOT NULL DEFAULT 7,
  min_payout_amount NUMERIC(10,2) NOT NULL DEFAULT 500.00,
  payout_method VARCHAR(20) NOT NULL DEFAULT 'razorpay',
  auto_payout_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_payout_threshold NUMERIC(10,2) NOT NULL DEFAULT 1000.00,
  popup_enabled BOOLEAN NOT NULL DEFAULT true,
  popup_bg_color VARCHAR(7) NOT NULL DEFAULT '#2D6A4F',
  popup_text_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  popup_show_social_share BOOLEAN NOT NULL DEFAULT true,
  popup_social_networks TEXT[] NOT NULL DEFAULT ARRAY['whatsapp','facebook','twitter','instagram']::text[],
  excluded_product_ids UUID[] NOT NULL DEFAULT ARRAY[]::uuid[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO affiliate_settings (is_enabled)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM affiliate_settings);

CREATE TABLE IF NOT EXISTS affiliates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  referred_by_affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE SET NULL,
  tier_level INTEGER NOT NULL DEFAULT 1,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  razorpay_contact_id VARCHAR(50),
  razorpay_fund_account_id VARCHAR(50),
  bank_account_number VARCHAR(30),
  bank_ifsc VARCHAR(15),
  bank_account_name VARCHAR(100),
  upi_id VARCHAR(100),
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  approved_at TIMESTAMPTZ,
  approved_by_admin_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliates_username_unique UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_username ON affiliates(username);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_referred_by ON affiliates(referred_by_affiliate_id);

CREATE TABLE IF NOT EXISTS affiliate_tracking_links (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  custom_slug VARCHAR(100),
  full_url TEXT NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_links_affiliate ON affiliate_tracking_links(affiliate_id);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id BIGSERIAL PRIMARY KEY,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  visitor_id VARCHAR(64),
  converted BOOLEAN NOT NULL DEFAULT false,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created ON affiliate_clicks(created_at);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_type VARCHAR(20) NOT NULL DEFAULT 'purchase',
  discount_applied NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  registration_commission_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_referrals_referred_user_unique UNIQUE (referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON affiliate_referrals(referred_user_id);

CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  requested_amount NUMERIC(12,2) NOT NULL,
  approved_amount NUMERIC(12,2),
  status VARCHAR(20) NOT NULL DEFAULT 'requested',
  payout_method VARCHAR(20) NOT NULL DEFAULT 'razorpay',
  bank_account_number VARCHAR(30),
  bank_ifsc VARCHAR(15),
  upi_id VARCHAR(100),
  razorpay_payout_id VARCHAR(50),
  razorpay_payout_status VARCHAR(30),
  razorpay_reference_id VARCHAR(100),
  razorpay_utr VARCHAR(50),
  reviewed_by_admin_id UUID,
  admin_notes TEXT,
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON affiliate_payouts(status);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tier_level INTEGER NOT NULL DEFAULT 1,
  commission_type VARCHAR(10) NOT NULL DEFAULT 'percent',
  commission_rate NUMERIC(10,4) NOT NULL,
  order_subtotal NUMERIC(12,2) NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payout_id INTEGER REFERENCES affiliate_payouts(id) ON DELETE SET NULL,
  cancelled_reason TEXT,
  cancelled_by_admin UUID,
  cancelled_at TIMESTAMPTZ,
  trigger_event VARCHAR(30) NOT NULL DEFAULT 'order_complete',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_commissions_order_tier_unique UNIQUE (order_id, affiliate_id, tier_level)
);

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_order ON affiliate_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON affiliate_commissions(status);

CREATE TABLE IF NOT EXISTS affiliate_product_overrides (
  id SERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  is_excluded BOOLEAN NOT NULL DEFAULT false,
  commission_type VARCHAR(10),
  commission_value NUMERIC(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_product_overrides_product_unique UNIQUE (product_id)
);

CREATE TABLE IF NOT EXISTS affiliate_program_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  min_sales_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  commission_bonus NUMERIC(10,4) NOT NULL DEFAULT 0.00,
  badge_color VARCHAR(7) NOT NULL DEFAULT '#CD7F32',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO affiliate_program_tiers (name, min_sales_amount, commission_bonus, badge_color, sort_order)
SELECT v.name, v.min_sales_amount, v.commission_bonus, v.badge_color, v.sort_order
FROM (VALUES
  ('Seed', 0, 0, '#6B7280', 1),
  ('Sprout', 10000, 1, '#22C55E', 2),
  ('Harvest', 50000, 2, '#F59E0B', 3),
  ('Organic Champion', 200000, 3.5, '#10B981', 4)
) AS v(name, min_sales_amount, commission_bonus, badge_color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM affiliate_program_tiers LIMIT 1);

CREATE TABLE IF NOT EXISTS affiliate_monthly_summary (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_commission NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_monthly_summary_unique UNIQUE (affiliate_id, year, month)
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS affiliate_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00;
CREATE INDEX IF NOT EXISTS idx_orders_affiliate ON orders(affiliate_id);
