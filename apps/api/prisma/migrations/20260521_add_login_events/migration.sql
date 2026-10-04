-- Add login_events table for security login history
CREATE TABLE IF NOT EXISTS "login_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "login_events_user_id_created_at_idx" ON "login_events"("user_id", "created_at" DESC);

ALTER TABLE "login_events" DROP CONSTRAINT IF EXISTS "login_events_user_id_fkey";
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
