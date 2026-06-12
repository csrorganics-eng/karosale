-- Optional shorter WhatsApp copy; when null, publish uses post_text + composed links.
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "whatsapp_text" text;
