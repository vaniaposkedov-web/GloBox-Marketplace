-- Add blocked_at column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_at" TIMESTAMP(3);
