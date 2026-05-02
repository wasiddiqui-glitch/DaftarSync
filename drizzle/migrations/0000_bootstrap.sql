-- Users table (mirrors Clerk data)
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(128) PRIMARY KEY,
  clerk_user_id VARCHAR(128) NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents (metadata only — content lives in Yjs)
CREATE TABLE IF NOT EXISTS documents (
  id          VARCHAR(128) PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT 'Untitled Document',
  owner_id    VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Access control
CREATE TABLE IF NOT EXISTS document_members (
  document_id VARCHAR(128) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id     VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(16)  NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  PRIMARY KEY (document_id, user_id)
);

-- Yjs collaborative state (managed by Hocuspocus)
CREATE TABLE IF NOT EXISTS document_yjs_state (
  document_id VARCHAR(128) PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  yjs_state   BYTEA NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
