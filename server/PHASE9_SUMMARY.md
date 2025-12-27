# Phase 9: Notifications + Reminders v1 Implementation Summary

## Overview
Implemented a tiered notification system with email and SMS providers, scheduler jobs, and plan gating. All notifications are logged and auditable.

## Changes Made

### A) Prisma Schema
**File:** `server/prisma/schema.prisma`
- Added `NotificationPreference` model:
  - Channels: in_app, email, sms
  - Rules: deadlineDays, dailyDigest, quietHours
  - Unique: (businessId, userId, channel)
- Added `NotificationEvent` model:
  - Types: deadline_reminder, task_overdue, accountant_request, filing_pack_ready
  - Status: queued, sent, failed, skipped
  - Provider tracking and error messages
  - Indexes for performance

### B) Server Module
**New directory:** `server/src/notifications/`

1. **providers/email.provider.ts**
   - Supports Resend and Postmark
   - Falls back to console.log in dev if no API key

2. **providers/sms.provider.ts**
   - Supports Termii and Twilio
   - Marks as skipped if provider not configured

3. **templates/*.template.ts**
   - Deadline reminder (email + SMS)
   - Overdue digest (email + SMS)
   - Filing pack ready (email + SMS)

4. **notifications.service.ts**
   - Preference management with plan gating
   - Notification event creation with deduplication
   - Queue-based sending via Bull

5. **notifications.scheduler.ts**
   - Deadline reminders: Daily at 8 AM Lagos time
   - Overdue digest: Daily at 6 PM Lagos time
   - Respects user preferences and quiet hours

6. **notifications.worker.ts**
   - Bull queue processor for sending notifications
   - Handles email, SMS, and in-app channels

7. **notifications.controller.ts**
   - GET/POST `/businesses/:id/notifications/preferences`
   - GET `/businesses/:id/notifications/feed`

**Updated:** `server/src/filing-packs/filing-pack.worker.ts`
- Sends filing pack ready notifications when pack completes

**Updated:** `server/src/app.module.ts`
- Added NotificationsModule

### C) Web UI
**New route:** `web/app/app/notifications/page.tsx`
- In-app notifications feed
- Shows recent notifications with links to tasks/packs

**Updated:** `web/app/app/settings/page.tsx`
- New notification preferences section
- Plan-gated toggles (Free: in-app only, Basic+: email, Business+: SMS)
- Deadline reminder days configuration

**Updated:** `web/components/app-shell.tsx`
- Added "Notifications" to navigation

**New API client:** `web/lib/api/notifications.ts`
- TypeScript interfaces and API functions

### D) Plan Gating
- **Free**: In-app reminders only
- **Basic+**: Email reminders enabled
- **Business+**: SMS reminders + custom schedules

### E) Scheduler Jobs
1. **Deadline Reminders** (8 AM Lagos)
   - Checks tasks due in N days (from user's deadlineDays rule)
   - Sends via enabled channels

2. **Overdue Digest** (6 PM Lagos)
   - Compiles overdue tasks
   - Sends daily digest if enabled

3. **Filing Pack Ready** (Event-driven)
   - Triggered when FilingPack status becomes 'ready'
   - Sends via enabled channels

### F) Deduplication
- Uses `dedupeKey` in metaJson
- Prevents duplicate notifications within 48 hours
- Based on businessId, userId, type, channel, and dedupeKey

### G) Audit Events
- Preference changes logged
- Notification sent/failed events logged
- All via AuditService

## Environment Variables
- `EMAIL_PROVIDER_KEY` - Resend or Postmark API key
- `EMAIL_PROVIDER` - 'resend' or 'postmark' (default: 'resend')
- `EMAIL_FROM` - Sender email address
- `TERMII_API_KEY` - Termii API key (optional, for SMS)
- `TERMII_SENDER_ID` - Termii sender ID
- `TWILIO_ACCOUNT_SID` - Twilio account SID (alternative to Termii)
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `CRON_TZ` - Cron timezone (default: Africa/Lagos)

## Integration Points
1. **Filing Pack Generation**: Sends notifications when pack ready
2. **Compliance Tasks**: Deadline reminders based on task due dates
3. **Settings**: User preferences control notification delivery

## Acceptance Criteria Status
✅ Free tier: In-app reminders only
✅ Basic+: Email reminders with scheduler
✅ Business+: SMS if provider configured, else skipped
✅ Deduplication: 48h window prevents duplicates
✅ Audit logging: All events logged
✅ Reliability: Bull queue with retries

