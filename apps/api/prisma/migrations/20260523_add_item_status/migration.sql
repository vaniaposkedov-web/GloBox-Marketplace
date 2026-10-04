-- Add mediator_status tracking to order request items
ALTER TABLE "order_request_items"
  ADD COLUMN IF NOT EXISTS "mediator_status" VARCHAR(50) NOT NULL DEFAULT 'PENDING';
