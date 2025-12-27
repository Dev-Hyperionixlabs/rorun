-- Migration: Create NotificationPreference and NotificationEvent tables (Phase 9)
-- Paste this directly into Supabase SQL Editor

-- Create NotificationPreference table
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "rulesJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_preferences_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_businessId_userId_channel_key" ON "notification_preferences"("businessId", "userId", "channel");

-- Create index
CREATE INDEX IF NOT EXISTS "notification_preferences_businessId_userId_idx" ON "notification_preferences"("businessId", "userId");

-- Create NotificationEvent table
CREATE TABLE IF NOT EXISTS "notification_events" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "provider" TEXT,
  "to" TEXT,
  "subject" TEXT,
  "bodyPreview" TEXT,
  "metaJson" JSONB,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "notification_events_businessId_createdAt_idx" ON "notification_events"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "notification_events_status_createdAt_idx" ON "notification_events"("status", "createdAt");

