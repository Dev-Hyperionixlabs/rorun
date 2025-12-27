# Phase 16 & 17 Local Testing Guide

## Quick Start for Local Testing

### Step 1: Run Database Migration

```bash
cd server

# Option A: If using direct SQL (PostgreSQL)
psql $DATABASE_URL -f PHASE17_PAYMENTS_MIGRATION.sql

# Option B: If using Prisma migrations
# The migration SQL can be applied directly, or you can create a Prisma migration
```

### Step 2: Update Plans with planKey

After migration, ensure plans have `planKey` set:

```sql
-- Connect to your database and run:
UPDATE plans SET plan_key = 'free' WHERE name ILIKE '%free%' AND plan_key IS NULL;
UPDATE plans SET plan_key = 'basic' WHERE name ILIKE '%basic%' AND plan_key IS NULL;
UPDATE plans SET plan_key = 'business' WHERE name ILIKE '%business%' AND plan_key IS NULL;
UPDATE plans SET plan_key = 'accountant' WHERE name ILIKE '%accountant%' AND plan_key IS NULL;
```

### Step 3: Set Environment Variables

Add to `server/.env.local`:

```env
# Paystack (use test keys for local testing)
PAYSTACK_SECRET_KEY=sk_test_... # Get from https://dashboard.paystack.com/#/settings/developer

# Web app URL (for callbacks)
WEB_BASE_URL=http://localhost:3001

# API base URL
APP_BASE_URL=http://localhost:3001
```

**Get Paystack Test Keys:**
1. Go to https://dashboard.paystack.com/#/settings/developer
2. Copy your **Test Secret Key** (starts with `sk_test_`)
3. Add it to `server/.env.local`

### Step 4: Generate Prisma Client

```bash
cd server
npm run prisma:generate
```

### Step 5: Start Servers

**Terminal 1 - Backend API:**
```bash
cd server
npm run dev
```
Server runs on: http://localhost:3001

**Terminal 2 - Web App:**
```bash
cd web
npm run dev
```
Web app runs on: http://localhost:3001 (or check console output)

---

## Testing Phase 16: Public Routes

### ✅ Test Public Pages (No Auth Required)

1. **Landing Page** (`/`)
   - Visit: http://localhost:3001/
   - ✅ Should show hero section
   - ✅ Should show "How it works" section
   - ✅ Should show "What you get" section
   - ✅ Should show trust cues
   - ✅ Should show footer

2. **Pricing Page** (`/pricing`)
   - Visit: http://localhost:3001/pricing
   - ✅ Should show plan comparison table
   - ✅ Should fetch plans from API (check browser console for API calls)
   - ✅ "Choose plan" button should work

3. **Security Page** (`/security`)
   - Visit: http://localhost:3001/security
   - ✅ Should show security information
   - ✅ Should have proper formatting

4. **Privacy Page** (`/privacy`)
   - Visit: http://localhost:3001/privacy
   - ✅ Should show privacy policy

5. **Terms Page** (`/terms`)
   - Visit: http://localhost:3001/terms
   - ✅ Should show terms of service

6. **Help Center** (`/help`)
   - Visit: http://localhost:3001/help
   - ✅ Should show help categories
   - ✅ Should list articles

7. **Help Articles** (`/help/[slug]`)
   - Visit: http://localhost:3001/help/what-rorun-does
   - ✅ Should render markdown content
   - ✅ Should show article title
   - ✅ Should have "Back to Help Center" link

### ✅ Test Help Drawer Component

To test the help drawer, you need to add it to an app page:

1. Open any app page (e.g., `/app/dashboard`)
2. Add `<HelpDrawer pageKey="dashboard" />` to the page header
3. ✅ Click the "?" icon
4. ✅ Drawer should open
5. ✅ Should show help content

---

## Testing Phase 17: Payments

### ⚠️ Prerequisites for Payment Testing

1. **Paystack Test Account**: You need a Paystack test account
2. **Test Cards**: Use Paystack test cards (see below)
3. **Webhook Testing**: Use Paystack's webhook testing tool or ngrok

### ✅ Test 1: Checkout Session Creation

1. **Login to your app** (or use existing session)
2. **Go to Settings → Plan**: http://localhost:3001/app/settings?tab=plan
3. **Click "Choose Basic"** (or any paid plan)
4. ✅ Should redirect to Paystack checkout page
5. ✅ Checkout URL should be valid

**If checkout fails:**
- Check `PAYSTACK_SECRET_KEY` is set correctly
- Check server logs for errors
- Verify user has email (required for Paystack)

### ✅ Test 2: Payment Flow (Test Mode)

**Use Paystack Test Cards:**
- **Success**: `4084084084084081`
- **Decline**: `5060666666666666666`
- **Insufficient Funds**: `5060666666666666667`

**Steps:**
1. Click "Choose Basic" plan
2. Redirected to Paystack checkout
3. Enter test card: `4084084084084081`
4. Enter any future expiry date (e.g., `12/25`)
5. Enter any CVV (e.g., `123`)
6. Enter any PIN (e.g., `0000`)
7. Complete payment
8. ✅ Should redirect back to `/app/settings?tab=plan&status=success`
9. ✅ Should show "Payment processing..." message
10. ✅ Should poll billing status

### ✅ Test 3: Webhook Processing

**Option A: Using Paystack Dashboard**
1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL: `http://localhost:3001/webhooks/paystack` (or use ngrok for local)
3. Test webhook from dashboard
4. ✅ Check server logs for webhook processing
5. ✅ Check `payment_events` table for logged events

**Option B: Using ngrok (Recommended for Local)**
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3001

# Use the ngrok URL for webhook:
# https://your-ngrok-url.ngrok.io/webhooks/paystack
```

**Option C: Manual Webhook Test**
```bash
# After a successful payment, manually trigger webhook:
curl -X POST http://localhost:3001/webhooks/paystack \
  -H "Content-Type: application/json" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "test_ref_123",
      "amount": 10000,
      "customer": {
        "email": "test@example.com",
        "customer_code": "CUS_test123"
      },
      "metadata": {
        "businessId": "your-business-id",
        "planKey": "basic",
        "planId": "your-plan-id"
      }
    }
  }'
```

### ✅ Test 4: Billing Status

1. **Get billing status via API:**
```bash
# Replace with your auth token and business ID
curl http://localhost:3001/businesses/YOUR_BUSINESS_ID/billing/status \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

2. **Check in Settings page:**
   - Visit: http://localhost:3001/app/settings?tab=plan
   - ✅ Should show current subscription status
   - ✅ Should show next renewal date (if applicable)

### ✅ Test 5: Subscription Status Updates

1. **After successful payment:**
   - ✅ Subscription status should be "active"
   - ✅ `provider` should be "paystack"
   - ✅ `providerSubscriptionId` should be set
   - ✅ `currentPeriodEnd` should be set

2. **Check payment_events table:**
```sql
SELECT * FROM payment_events ORDER BY received_at DESC LIMIT 5;
```
   - ✅ Should see webhook events logged
   - ✅ Status should be "processed"

### ✅ Test 6: Feature Unlocking

After subscription is active:
1. ✅ Features should unlock based on plan
2. ✅ Check feature gates work correctly
3. ✅ Gated endpoints should allow access

---

## Troubleshooting

### Public Routes Not Loading

**Issue**: 404 on public routes
- ✅ Check Next.js is running on correct port
- ✅ Check routes are in correct directory structure
- ✅ Check browser console for errors

### Help Articles Not Rendering

**Issue**: Help articles show 404 or blank
- ✅ Check markdown files exist in `/web/content/help/`
- ✅ Check file names match slugs
- ✅ Check server logs for file read errors

### Payment Checkout Fails

**Issue**: "Failed to create checkout session"
- ✅ Check `PAYSTACK_SECRET_KEY` is set
- ✅ Check user has email address
- ✅ Check server logs for detailed error
- ✅ Verify Paystack API is accessible

### Webhook Not Processing

**Issue**: Webhooks received but not processed
- ✅ Check webhook signature verification (may be disabled in dev)
- ✅ Check `payment_events` table for logged events
- ✅ Check server logs for processing errors
- ✅ Verify event structure matches Paystack format

### Subscription Not Updating

**Issue**: Payment successful but subscription not active
- ✅ Check webhook was received and processed
- ✅ Check `payment_events` table for event status
- ✅ Check `subscriptions` table for updated status
- ✅ Verify metadata contains correct `businessId` and `planId`

---

## Quick Test Checklist

### Phase 16 ✅
- [ ] Landing page loads
- [ ] Pricing page loads and shows plans
- [ ] Security page loads
- [ ] Privacy page loads
- [ ] Terms page loads
- [ ] Help center loads
- [ ] Help articles render
- [ ] Navigation links work
- [ ] Footer links work

### Phase 17 ✅
- [ ] Migration SQL applied
- [ ] Plans have planKey set
- [ ] Checkout session creation works
- [ ] Paystack redirect works
- [ ] Test payment completes
- [ ] Webhook receives events
- [ ] Subscription status updates
- [ ] Billing status endpoint works
- [ ] Settings page shows subscription
- [ ] Features unlock after payment

---

## Next Steps After Local Testing

Once local testing is successful:

1. **Test in staging** (if you have a staging environment)
2. **Set up Paystack production keys**
3. **Configure production webhook URL**
4. **Test with real (small) transactions**
5. **Monitor payment_events table**
6. **Set up alerts for failed webhooks**

---

## Paystack Test Resources

- **Test Cards**: https://paystack.com/docs/payments/test-payments
- **Webhook Testing**: https://dashboard.paystack.com/#/settings/developer
- **API Docs**: https://paystack.com/docs/api

