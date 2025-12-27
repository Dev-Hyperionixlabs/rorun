# Phase 9 QA Checklist

## Prerequisites
1. Run migration: Execute `PHASE9_NOTIFICATIONS_MIGRATION.sql` in Supabase SQL Editor
2. Set environment variables (optional for testing):
   - `EMAIL_PROVIDER_KEY` (for email)
   - `TERMII_API_KEY` or `TWILIO_*` (for SMS)
3. Ensure Redis is running for Bull queue
4. Test with different plan tiers (Free, Basic, Business)

## Test Cases

### 1. Plan Gating - Free Tier
- [ ] Navigate to `/app/settings?tab=notifications` as Free user
- [ ] Verify "In-app reminders" toggle is enabled and editable
- [ ] Verify "Email reminders" shows lock icon and is disabled
- [ ] Verify "SMS reminders" shows lock icon and is disabled
- [ ] Attempt API call: `POST /businesses/:id/notifications/preferences` with channel='email'
- [ ] Verify 400 response with plan upgrade message

### 2. Plan Gating - Basic+ Tier
- [ ] Navigate to `/app/settings?tab=notifications` as Basic+ user
- [ ] Verify "Email reminders" toggle is enabled and editable
- [ ] Toggle email reminders ON → Verify saves successfully
- [ ] Verify email preference appears in database
- [ ] Verify "SMS reminders" still shows lock (Business+ only)

### 3. Plan Gating - Business+ Tier
- [ ] Navigate to `/app/settings?tab=notifications` as Business+ user
- [ ] Verify "SMS reminders" toggle is enabled
- [ ] Toggle SMS reminders ON → Verify saves successfully
- [ ] If TERMII_API_KEY not set, verify SMS events are created but marked 'skipped'

### 4. Notification Preferences
- [ ] Update email preference with custom deadlineDays: [14, 7, 1]
- [ ] Verify rulesJson saved correctly
- [ ] Toggle dailyDigest OFF → Verify saves
- [ ] Refresh page → Verify preferences persist

### 5. In-App Notifications Feed
- [ ] Navigate to `/app/notifications`
- [ ] Verify page loads and shows notification events
- [ ] Verify notifications are sorted by createdAt desc
- [ ] Click notification with taskId → Verify links to task detail
- [ ] Click notification with packId → Verify links to summary page
- [ ] Verify empty state shows when no notifications

### 6. Deadline Reminders Scheduler
- [ ] Create compliance task with dueDate = today + 7 days
- [ ] Enable email reminders with deadlineDays: [7]
- [ ] Wait for scheduler (or manually trigger at 8 AM Lagos time)
- [ ] Verify NotificationEvent created with type='deadline_reminder'
- [ ] Verify email sent (check logs or email inbox)
- [ ] Verify deduplication: Create same reminder again → Verify skipped

### 7. Overdue Digest Scheduler
- [ ] Create 3+ overdue compliance tasks
- [ ] Enable email reminders with dailyDigest: true
- [ ] Wait for scheduler (or manually trigger at 6 PM Lagos time)
- [ ] Verify NotificationEvent created with type='task_overdue'
- [ ] Verify email contains overdue count and top 3 tasks
- [ ] Verify deduplication: Same day digest → Verify skipped

### 8. Filing Pack Ready Notification
- [ ] Generate filing pack (Phase 6)
- [ ] Enable email reminders
- [ ] Wait for pack generation to complete
- [ ] Verify NotificationEvent created with type='filing_pack_ready'
- [ ] Verify email sent with pack download link
- [ ] Verify in-app notification appears in feed

### 9. Email Provider
- [ ] Set EMAIL_PROVIDER_KEY
- [ ] Send test notification → Verify email arrives
- [ ] Check NotificationEvent status='sent'
- [ ] Remove EMAIL_PROVIDER_KEY → Verify notifications logged but not sent (dev mode)

### 10. SMS Provider
- [ ] Set TERMII_API_KEY
- [ ] Enable SMS reminders
- [ ] Send test notification → Verify SMS arrives
- [ ] Check NotificationEvent status='sent', provider='termii'
- [ ] Remove TERMII_API_KEY → Verify status='skipped' with error message

### 11. Deduplication
- [ ] Create notification with dedupeKey='test_123'
- [ ] Create same notification again within 48h → Verify returns existing event
- [ ] Create same notification after 48h → Verify creates new event

### 12. Audit Events
- [ ] Update notification preference → Verify audit event created
- [ ] Send notification → Verify audit event for sent/failed
- [ ] Check AuditEvent table for notification.* actions

### 13. Bull Queue
- [ ] Verify notifications queue exists in Redis
- [ ] Create notification event → Verify job enqueued
- [ ] Check worker processes job → Verify notification sent
- [ ] Simulate failure → Verify retry logic

### 14. No Regressions
- [ ] Verify Phase 5 compliance tasks still work
- [ ] Verify Phase 6 filing packs still work
- [ ] Verify Phase 7 filing wizard still works
- [ ] Verify existing settings pages unchanged

## URLs for Testing
- Settings: `http://localhost:3000/app/settings?tab=notifications`
- Notifications Feed: `http://localhost:3000/app/notifications`
- API Preferences: `http://localhost:3001/businesses/:id/notifications/preferences`
- API Feed: `http://localhost:3001/businesses/:id/notifications/feed`

## Manual Scheduler Testing
To test schedulers without waiting:
1. Temporarily change cron expressions to run every minute
2. Or call scheduler methods directly via admin endpoint (if added)
3. Or use Bull UI to manually trigger jobs

## Expected Behavior
- Free users: Only in-app notifications
- Basic+ users: Email + in-app notifications
- Business+ users: Email + SMS + in-app (SMS skipped if provider not configured)
- All notifications logged in NotificationEvent table
- Deduplication prevents spam within 48h window
- Failed notifications logged with error messages

