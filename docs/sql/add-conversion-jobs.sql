-- Incremental DDL for existing WOX-Bin databases that already have the rest of the schema.
-- Safe to run once. Adjust if your enum/table already exists.

CREATE TYPE "conversion_job_status" AS ENUM ('pending', 'processing', 'done', 'failed', 'cancelled');

CREATE TABLE "conversion_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text REFERENCES "users" ("id") ON DELETE SET NULL,
  "status" "conversion_job_status" DEFAULT 'pending' NOT NULL,
  "tier" text DEFAULT 'worker' NOT NULL,
  "source_mime" text,
  "target_format" text NOT NULL,
  "input_storage_key" text,
  "output_storage_key" text,
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp
);

CREATE INDEX "conversion_jobs_user_id_created_at_idx" ON "conversion_jobs" ("user_id", "created_at");
CREATE INDEX "conversion_jobs_status_created_at_idx" ON "conversion_jobs" ("status", "created_at");
