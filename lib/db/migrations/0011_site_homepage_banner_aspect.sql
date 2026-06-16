-- Persist homepage banner crop aspect so storefront matches Marketing Studio preview.
ALTER TABLE "site_homepage_banner"
ADD COLUMN IF NOT EXISTS "banner_aspect" text NOT NULL DEFAULT '16:9';
