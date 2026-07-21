-- Store the site independently from post_id so site-wide queries do not
-- depend on a particular post ID format.
ALTER TABLE "Comment"
ADD COLUMN IF NOT EXISTS site_name TEXT;

-- This deployment historically served Lycois with slug-only post IDs.
UPDATE "Comment"
SET site_name = 'lycois.org'
WHERE site_name IS NULL;

-- Speed up latest-comments queries scoped to a site.
CREATE INDEX IF NOT EXISTS comment_site_status_created_idx
ON "Comment" (site_name, status, created_at DESC);
