-- MoonTalk v2 schema optimization

-- Create Vote table when missing (required by votes.service.js)
CREATE TABLE IF NOT EXISTS "Vote" (
    id BIGSERIAL PRIMARY KEY,
    post_id TEXT NOT NULL,
    ip TEXT NOT NULL,
    value SMALLINT NOT NULL CONSTRAINT vote_value_check CHECK (value IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure one vote per post and IP for atomic upsert
CREATE UNIQUE INDEX IF NOT EXISTS vote_post_id_ip_unique_idx
ON "Vote" (post_id, ip);

-- Enforce valid vote values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'vote_value_check'
          AND conrelid = '"Vote"'::regclass
    ) THEN
        ALTER TABLE "Vote"
            ADD CONSTRAINT vote_value_check CHECK (value IN (-1, 1));
    END IF;
END $$;

-- Speed up comment list queries (post + status + parent + time)
CREATE INDEX IF NOT EXISTS comment_post_status_parent_created_idx
ON "Comment" (post_id, status, parent_id, created_at DESC);

-- Speed up latest comments query
CREATE INDEX IF NOT EXISTS comment_status_created_idx
ON "Comment" (status, created_at DESC);

-- Make vote ip non-nullable once data is cleaned
-- ALTER TABLE "Vote" ALTER COLUMN ip SET NOT NULL;
