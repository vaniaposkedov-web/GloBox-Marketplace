-- Add FROZEN status to MediatorStatus enum
ALTER TYPE "MediatorStatus" ADD VALUE IF NOT EXISTS 'FROZEN';

-- Add pass photo URL (пропуск из Садовода)
ALTER TABLE "mediator_profiles" ADD COLUMN IF NOT EXISTS "pass_photo_url" TEXT;

-- Add account expiry date
ALTER TABLE "mediator_profiles" ADD COLUMN IF NOT EXISTS "account_expires_at" TIMESTAMP(3);

-- Add notification flags
ALTER TABLE "mediator_profiles" ADD COLUMN IF NOT EXISTS "expiry_notified_7d" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "mediator_profiles" ADD COLUMN IF NOT EXISTS "expiry_notified_3d" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "mediator_profiles" ADD COLUMN IF NOT EXISTS "expiry_notified_1d" BOOLEAN NOT NULL DEFAULT false;

-- Add daily and monthly goals (from previous migration that wasn't applied)
ALTER TABLE "mediator_profiles" ADD COLUMN IF NOT EXISTS "daily_goal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "mediator_profiles" ADD COLUMN IF NOT EXISTS "monthly_goal" INTEGER NOT NULL DEFAULT 0;
