ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "campaign_kind" text DEFAULT 'product' NOT NULL;
--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "event_title" text;
--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "event_description" text;
--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "event_reference_image_url" text;
--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "banner_aspect" text DEFAULT '16:9' NOT NULL;
