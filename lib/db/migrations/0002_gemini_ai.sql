ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gemini_personalization_profile" jsonb;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gemini_personalization_profile_at" timestamp;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_key" varchar(80) NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_chat_sessions_client_key_unique" UNIQUE("client_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shop_chat_sessions_user_id_idx" ON "shop_chat_sessions" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL REFERENCES "shop_chat_sessions"("id") ON DELETE CASCADE,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shop_chat_messages_session_id_idx" ON "shop_chat_messages" ("session_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_chat_escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL REFERENCES "shop_chat_sessions"("id") ON DELETE CASCADE,
	"user_email" text,
	"reason" text NOT NULL,
	"last_user_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
