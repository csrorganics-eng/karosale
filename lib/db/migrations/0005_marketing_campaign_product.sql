ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "banner_image_url" text;
--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "banner_image_prompt" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_campaigns_product_id_idx" ON "marketing_campaigns" USING btree ("product_id");
