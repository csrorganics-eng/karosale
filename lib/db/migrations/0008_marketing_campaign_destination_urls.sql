-- Destination URLs for social / ads (storefront product page + optional redirect).
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "product_page_url" text;
--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "redirect_url" text;
