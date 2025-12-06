# Rorun Production Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│   Render    │────▶│  Supabase   │
│  (Frontend) │     │  (Backend)  │     │ (Database)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Step 1: Supabase Database Setup

### 1.1 Create Project
1. Go to https://supabase.com and log in
2. Create a new project (or use existing)
3. Note your project URL and keys from Settings → API

### 1.2 Get Connection Strings
Go to **Settings → Database** and copy:
- **URI** (Connection string) → This is your `DATABASE_URL`
- Replace `[YOUR-PASSWORD]` with your database password

Example:
```
postgresql://postgres.xxxxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 1.3 Run Migrations
```bash
cd server
npm run prisma:migrate:deploy
```

### 1.4 Seed Initial Data
```bash
npm run prisma:seed
```

---

## Step 2: Render Backend Deployment

### 2.1 Create Web Service
1. Go to https://render.com and log in
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `rorun-api`
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm run start:prod`
   - **Instance Type**: Free or Starter ($7/mo)

### 2.2 Environment Variables
Add these in Render's Environment section:

```
NODE_ENV=production
PORT=10000

# Database (from Supabase)
DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Auth (generate with: openssl rand -base64 32)
JWT_SECRET=<generated-secret>
JWT_EXPIRES_IN=7d
ADMIN_SECRET_KEY=<generated-admin-key>

# Frontend URL for CORS
FRONTEND_URL=https://rorun.vercel.app
ALLOWED_ORIGINS=https://rorun.vercel.app,https://www.rorun.ng

# Optional: Twilio for SMS OTP
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Optional: Firebase for push notifications
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```

### 2.3 Deploy
Click **Create Web Service** and wait for deployment.
Note your URL: `https://rorun-api.onrender.com`

---

## Step 3: Vercel Frontend Deployment

### 3.1 Create Project
1. Go to https://vercel.com and log in
2. Click **Add New → Project**
3. Import your GitHub repo
4. Configure:
   - **Root Directory**: `web`
   - **Framework Preset**: Next.js

### 3.2 Environment Variables
Add in Vercel's Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://rorun-api.onrender.com
NEXT_PUBLIC_USE_MOCK_API=false
```

### 3.3 Deploy
Click **Deploy** and wait for build to complete.

---

## Step 4: Post-Deployment Verification

### 4.1 Test Backend Health
```bash
curl https://rorun-api.onrender.com/api
```

### 4.2 Test Database Connection
```bash
curl https://rorun-api.onrender.com/api/health
```

### 4.3 Test Frontend
Visit your Vercel URL and:
1. Go to login page
2. Check browser console for API calls
3. Verify no CORS errors

---

## Step 5: Domain Configuration (Optional)

### 5.1 Vercel Custom Domain
1. Go to Vercel project → Settings → Domains
2. Add your domain (e.g., `app.rorun.ng`)
3. Configure DNS as instructed

### 5.2 Render Custom Domain
1. Go to Render service → Settings → Custom Domains
2. Add your domain (e.g., `api.rorun.ng`)
3. Configure DNS as instructed

### 5.3 Update CORS
After adding custom domains, update `ALLOWED_ORIGINS` in Render:
```
ALLOWED_ORIGINS=https://app.rorun.ng,https://www.rorun.ng
```

---

## Environment Variables Reference

### Backend (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | Render uses `10000` |
| `DATABASE_URL` | Yes | Supabase connection string |
| `JWT_SECRET` | Yes | Random 32-byte base64 string |
| `JWT_EXPIRES_IN` | No | Default: `7d` |
| `ADMIN_SECRET_KEY` | Yes | Random string for admin access |
| `FRONTEND_URL` | Yes | Your Vercel URL |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed origins |
| `TWILIO_ACCOUNT_SID` | No | For SMS OTP |
| `TWILIO_AUTH_TOKEN` | No | For SMS OTP |
| `TWILIO_PHONE_NUMBER` | No | For SMS OTP |
| `FIREBASE_PROJECT_ID` | No | For push notifications |
| `FIREBASE_PRIVATE_KEY` | No | For push notifications |
| `FIREBASE_CLIENT_EMAIL` | No | For push notifications |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Your Render backend URL |
| `NEXT_PUBLIC_USE_MOCK_API` | No | Set to `false` for production |

---

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` includes your frontend URL
- Check browser console for the exact origin being blocked

### Database Connection Failed
- Verify `DATABASE_URL` is correct
- Ensure Supabase project is not paused
- Check if connection pooling is enabled (use pooler URL)

### Build Failures
- Check Render/Vercel logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify Prisma client is generated in build step

### Slow Initial Load
- Render free tier sleeps after 15 mins of inactivity
- First request may take 30-60 seconds
- Consider upgrading to Starter tier ($7/mo) for always-on

---

## Security Checklist

- [ ] All secrets are random and unique
- [ ] `JWT_SECRET` is at least 32 characters
- [ ] `ADMIN_SECRET_KEY` is at least 32 characters
- [ ] Database password is strong
- [ ] CORS origins are specific (not `*`)
- [ ] HTTPS is enabled for all endpoints
- [ ] Environment variables are not committed to git

