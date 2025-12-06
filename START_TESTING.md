# 🚀 Quick Start Testing Guide

## Current Situation

Docker is not installed. We'll set up the services manually or use cloud alternatives.

## Option 1: Manual Setup (Recommended for Testing)

### Step 1: Install Dependencies

```bash
cd server
npm install
```

### Step 2: Set Up Database

You have two options:

#### Option A: Use Supabase (Free, Cloud Database)
1. Go to https://supabase.com and sign up
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string
5. Update `server/.env.local`:
   ```
   DATABASE_URL="your-supabase-connection-string"
   ```

#### Option B: Install PostgreSQL Locally
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb rorun
```

Then update `server/.env.local`:
```
DATABASE_URL="postgresql://your_username@localhost:5432/rorun?schema=public"
```

### Step 3: Set Up Redis (Optional for Basic Testing)

Redis is only needed for background jobs. For basic API testing, you can skip this.

#### Option A: Use Upstash (Free Cloud Redis)
1. Go to https://upstash.com and sign up
2. Create a Redis database
3. Copy the connection details
4. Update `server/.env.local`:
   ```
   REDIS_HOST=your-upstash-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-upstash-password
   ```

#### Option B: Install Redis Locally
```bash
# macOS
brew install redis
brew services start redis
```

### Step 4: Set Up File Storage (Optional for Basic Testing)

For basic API testing, you can skip S3. Document uploads won't work, but everything else will.

#### Option A: Use AWS S3 (Free Tier)
1. Sign up at https://aws.amazon.com/s3/
2. Create a bucket
3. Create IAM user with S3 access
4. Update `server/.env.local` with credentials

#### Option B: Skip for Now
Leave S3 credentials empty - document features won't work but API will.

### Step 5: Configure Environment

```bash
cd server
cp .env.example .env.local
```

Edit `.env.local` and fill in:
- `DATABASE_URL` (required)
- `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- `REDIS_HOST` (optional)
- `AWS_*` (optional)

### Step 6: Set Up Database Schema

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Step 7: Start the API Server

```bash
cd server
npm run dev
```

The API will start on http://localhost:3000

## Option 2: Install Docker (For Full Setup)

If you want to use Docker:

### macOS:
```bash
# Install Docker Desktop
brew install --cask docker
# Or download from: https://www.docker.com/products/docker-desktop
```

Then run:
```bash
cd server
docker-compose up -d
```

## 🧪 Testing the API

Once the server is running, open a new terminal and test:

### 1. Health Check
```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### 2. Request OTP
```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678"}'
```

**Check the server console** - the OTP will be logged there (e.g., `[DEV] OTP for +2348012345678: 123456`)

### 3. Verify OTP
```bash
# Replace 123456 with the OTP from console
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678", "otp": "123456"}'
```

Save the `access_token` from the response!

### 4. Test Protected Endpoint
```bash
# Replace YOUR_TOKEN with the access_token from step 3
curl http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. View API Documentation
Open in browser: http://localhost:3000/api

You can test all endpoints directly from Swagger UI!

## 📱 Testing Mobile App

```bash
cd mobile
npm install
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Or scan QR code with Expo Go app

## 🖥️ Testing Admin Interface

```bash
cd admin
npm install
npm run dev
```

Open: http://localhost:3002

## 🎯 Quick Test Checklist

- [ ] API server starts without errors
- [ ] Health check returns OK
- [ ] Can request OTP (check console for code)
- [ ] Can verify OTP and get token
- [ ] Can access protected endpoints with token
- [ ] Swagger UI loads at /api
- [ ] Can create a business
- [ ] Can create transactions

## 🆘 Troubleshooting

### "Cannot connect to database"
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env.local`
- Try: `npm run prisma:generate` again

### "Port 3000 already in use"
- Change PORT in `.env.local`
- Or kill the process: `lsof -ti:3000 | xargs kill`

### "Prisma migration fails"
- Make sure database exists
- Check DATABASE_URL format
- Try: `npm run prisma:generate` first

## Next Steps

1. Start with minimal setup (just database)
2. Test basic API endpoints
3. Add services as needed (Redis, S3)
4. Test mobile app
5. Test admin interface

