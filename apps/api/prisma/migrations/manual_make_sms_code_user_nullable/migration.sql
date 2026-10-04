ALTER TABLE "sms_codes" DROP CONSTRAINT IF EXISTS "sms_codes_user_id_fkey";
ALTER TABLE "sms_codes" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "sms_codes"
  ADD CONSTRAINT "sms_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
