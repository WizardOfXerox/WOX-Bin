-- Run once if you created `conversion_jobs` from an older `add-conversion-jobs.sql`
-- and are missing worker / FFmpeg columns. Skip if `npm run db:push` already applied current schema.

ALTER TABLE "conversion_jobs" ADD COLUMN IF NOT EXISTS "pair_path" text;
ALTER TABLE "conversion_jobs" ADD COLUMN IF NOT EXISTS "handler" text DEFAULT 'ffmpeg' NOT NULL;
ALTER TABLE "conversion_jobs" ADD COLUMN IF NOT EXISTS "public_token" text;
ALTER TABLE "conversion_jobs" ADD COLUMN IF NOT EXISTS "input_ready" boolean DEFAULT false NOT NULL;
ALTER TABLE "conversion_jobs" ADD COLUMN IF NOT EXISTS "original_filename" text;
ALTER TABLE "conversion_jobs" ADD COLUMN IF NOT EXISTS "output_mime" text;

-- Backfill public_token for any legacy rows (then enforce NOT NULL in Drizzle via a follow-up migration if needed).
UPDATE "conversion_jobs"
SET "public_token" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "public_token" IS NULL;

-- Optional: make public_token required at DB level (uncomment if your ORM expects NOT NULL).
-- ALTER TABLE "conversion_jobs" ALTER COLUMN "public_token" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "conversion_jobs_public_token_unique" ON "conversion_jobs" ("public_token");
CREATE INDEX IF NOT EXISTS "conversion_jobs_pending_input_ready_idx" ON "conversion_jobs" ("status", "input_ready", "created_at");
