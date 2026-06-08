CREATE TABLE IF NOT EXISTS "search_ranking_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"match_name_weight" numeric(12, 4) DEFAULT 100 NOT NULL,
	"match_desc_weight" numeric(12, 4) DEFAULT 40 NOT NULL,
	"match_sku_weight" numeric(12, 4) DEFAULT 80 NOT NULL,
	"sales_log_coef" numeric(12, 4) DEFAULT 15 NOT NULL,
	"rating_coef" numeric(12, 4) DEFAULT 25 NOT NULL,
	"review_count_coef" numeric(12, 4) DEFAULT 0.5 NOT NULL,
	"featured_bonus" numeric(12, 4) DEFAULT 50 NOT NULL,
	"bestseller_bonus" numeric(12, 4) DEFAULT 30 NOT NULL,
	"in_stock_bonus" numeric(12, 4) DEFAULT 10 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "search_ranking_settings" ("id", "match_name_weight", "match_desc_weight", "match_sku_weight", "sales_log_coef", "rating_coef", "review_count_coef", "featured_bonus", "bestseller_bonus", "in_stock_bonus")
SELECT '00000000-0000-0000-0000-000000000001'::uuid, 100, 40, 80, 15, 25, 0.5, 50, 30, 10
WHERE NOT EXISTS (SELECT 1 FROM "search_ranking_settings" LIMIT 1);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ab_experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"segment" varchar(32) DEFAULT 'all' NOT NULL,
	"traffic_b_percent" integer DEFAULT 50 NOT NULL,
	"variant_a_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"variant_b_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ab_experiments_slug_unique" UNIQUE("slug"),
	CONSTRAINT "ab_experiments_traffic_check" CHECK ("traffic_b_percent" >= 0 AND "traffic_b_percent" <= 100)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_experiments_active_idx" ON "ab_experiments" ("is_active");
