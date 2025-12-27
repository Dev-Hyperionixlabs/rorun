-- PHASE 17: Payments + Subscriptions Migration
-- Adds Paystack integration support, payment events, and subscription provider fields

-- 1. Add planKey and currency to plans table
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS plan_key VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'NGN';

-- Create index on plan_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_plans_plan_key ON plans(plan_key);

-- 2. Update subscriptions table with provider fields
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS provider_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS provider_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Update status enum to include new statuses
-- Note: PostgreSQL doesn't support ALTER TYPE easily, so we'll use text and handle in application
-- If using ENUM type, you may need to recreate it:
-- ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'past_due';
-- ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';

-- Add unique constraint: one active subscription per business
-- First, handle any duplicates by keeping the most recent one
DO $$
BEGIN
  -- If there are multiple subscriptions for the same business, keep only the most recent active one
  DELETE FROM subscriptions s1
  USING subscriptions s2
  WHERE s1.business_id = s2.business_id
    AND s1.id < s2.id
    AND s1.status = 'active'
    AND s2.status = 'active';
END $$;

-- Now add unique constraint
ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_business_id_key,
  ADD CONSTRAINT subscriptions_business_id_key UNIQUE (business_id);

-- Create indexes for provider fields
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription_id ON subscriptions(provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(provider);

-- 3. Create payment_events table
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255) UNIQUE,
  payload_json JSONB NOT NULL,
  received_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for payment_events
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_event_type ON payment_events(provider, event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_status_received_at ON payment_events(status, received_at);
CREATE INDEX IF NOT EXISTS idx_payment_events_business_id ON payment_events(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_id ON payment_events(event_id);

-- 4. Update existing plans with plan_key if not set
UPDATE plans SET plan_key = LOWER(REPLACE(name, ' ', '_')) WHERE plan_key IS NULL;

-- Set specific plan keys for known plans
UPDATE plans SET plan_key = 'free' WHERE LOWER(name) LIKE '%free%' AND plan_key IS NULL;
UPDATE plans SET plan_key = 'basic' WHERE LOWER(name) LIKE '%basic%' AND plan_key IS NULL;
UPDATE plans SET plan_key = 'business' WHERE LOWER(name) LIKE '%business%' AND plan_key IS NULL;
UPDATE plans SET plan_key = 'accountant' WHERE LOWER(name) LIKE '%accountant%' AND plan_key IS NULL;

-- 5. Ensure all businesses have a free subscription if they don't have one
INSERT INTO subscriptions (id, user_id, business_id, plan_id, status, provider, started_at, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  b.owner_user_id,
  b.id,
  (SELECT id FROM plans WHERE plan_key = 'free' LIMIT 1),
  'active',
  NULL,
  NOW(),
  NOW(),
  NOW()
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.business_id = b.id
)
AND EXISTS (SELECT 1 FROM plans WHERE plan_key = 'free');

-- 6. Update existing subscriptions to have provider = NULL if not set (for free/local subscriptions)
UPDATE subscriptions SET provider = NULL WHERE provider IS NULL AND status = 'active';

COMMENT ON TABLE payment_events IS 'Stores webhook events from payment providers (Paystack) for audit and idempotency';
COMMENT ON COLUMN subscriptions.provider IS 'Payment provider: paystack or NULL for free/local subscriptions';
COMMENT ON COLUMN subscriptions.provider_customer_id IS 'Customer ID from payment provider';
COMMENT ON COLUMN subscriptions.provider_subscription_id IS 'Subscription ID from payment provider';
COMMENT ON COLUMN subscriptions.current_period_end IS 'When the current billing period ends';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';

