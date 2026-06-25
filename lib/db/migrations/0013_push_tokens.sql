-- Migration 0013: Expo push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL,
  platform    VARCHAR(10) NOT NULL DEFAULT 'unknown',   -- 'ios' | 'android' | 'unknown'
  device_id   TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_token_idx    ON push_tokens(token);
CREATE        INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens(user_id);
