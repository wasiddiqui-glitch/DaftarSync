-- Folders
CREATE TABLE IF NOT EXISTS folders (
  id         VARCHAR(128) PRIMARY KEY,
  name       TEXT NOT NULL,
  owner_id   VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add folder FK to documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS folder_id VARCHAR(128) REFERENCES folders(id) ON DELETE SET NULL;

-- Version snapshots
CREATE TABLE IF NOT EXISTS document_snapshots (
  id          VARCHAR(128) PRIMARY KEY,
  document_id VARCHAR(128) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_by  VARCHAR(128) NOT NULL REFERENCES users(id),
  label       TEXT NOT NULL,
  yjs_state   BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS document_snapshots_doc_date
  ON document_snapshots (document_id, created_at DESC);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id          VARCHAR(128) PRIMARY KEY,
  document_id VARCHAR(128) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  author_id   VARCHAR(128) NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comments_doc_date
  ON comments (document_id, created_at ASC);
