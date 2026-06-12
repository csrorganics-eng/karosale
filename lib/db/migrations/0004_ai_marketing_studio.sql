CREATE TABLE IF NOT EXISTS "marketing_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"post_text" text NOT NULL,
	"image_prompt" text,
	"image_url" text,
	"platforms" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"facebook_post_id" text,
	"instagram_post_id" text,
	"whatsapp_recipients" integer DEFAULT 0,
	"error_log" text,
	"created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_campaigns_created_by_idx" ON "marketing_campaigns" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_campaigns_status_idx" ON "marketing_campaigns" USING btree ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"access_token" text NOT NULL,
	"token_expires_at" timestamp,
	"page_id" text,
	"page_name" text,
	"ig_user_id" text,
	"whatsapp_phone_number_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_connections_user_provider_idx" ON "social_connections" USING btree ("user_id", "provider");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_connections_user_id_idx" ON "social_connections" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_recipient_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone_numbers" text[] DEFAULT '{}'::text[] NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
