-- Singleton row: storefront hero strip above the main homepage hero (admin-controlled).
CREATE TABLE IF NOT EXISTS "site_homepage_banner" (
  "singleton" text PRIMARY KEY DEFAULT 'default' CHECK ("singleton" = 'default'),
  "image_url" text,
  "link_href" text,
  "headline" text,
  "subheadline" text,
  "is_enabled" boolean NOT NULL DEFAULT false,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

INSERT INTO "site_homepage_banner" ("singleton")
VALUES ('default')
ON CONFLICT ("singleton") DO NOTHING;
