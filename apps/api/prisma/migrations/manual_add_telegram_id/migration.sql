-- Add telegram_id column to users table for MAX/Telegram login
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_id" TEXT UNIQUE;
