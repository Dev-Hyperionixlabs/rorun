-- Speed up admin dashboard stats (avoid timeouts on large datasets)

-- Transaction count uses date filter without businessId, so add a date index
CREATE INDEX IF NOT EXISTS "transactions_date_idx" ON "transactions" ("date");

-- Subscription breakdown groups by planId and filters by status
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" ("status");
CREATE INDEX IF NOT EXISTS "subscriptions_planId_idx" ON "subscriptions" ("planId");
CREATE INDEX IF NOT EXISTS "subscriptions_status_businessId_idx" ON "subscriptions" ("status", "businessId");


