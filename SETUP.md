# Rorun MVP - Setup Guide

This guide will help you obtain all the necessary credentials and set up the Rorun MVP project.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Redis installed (for job queues)
- Git installed

## Step 1: Database Setup (PostgreSQL)

### Option A: Local PostgreSQL
1. Install PostgreSQL: https://www.postgresql.org/download/
2. Create a database:
   ```bash
   createdb rorun
   ```
3. Update `server/.env.local`:
   ```
   DATABASE_URL="postgresql://your_username:your_password@localhost:5432/rorun?schema=public"
   ```

### Option B: Cloud PostgreSQL (Recommended for Production)
- **Supabase** (Free tier available): https://supabase.com
  1. Sign up at https://supabase.com
  2. Create a new project
  3. Go to Settings → Database
  4. Copy the connection string
  5. Update `server/.env.local` with the connection string

- **Other options**: AWS RDS, Google Cloud SQL, Azure Database

## Step 2: AWS S3 Setup (File Storage)

1. **Sign up for AWS**: https://aws.amazon.com/
2. **Create an S3 bucket**:
   - Go to S3 in AWS Console
   - Create bucket (e.g., `rorun-documents`)
   - Choose a region (e.g., `us-east-1`)
3. **Create IAM User**:
   - Go to IAM → Users → Add User
   - Enable "Programmatic access"
   - Attach policy: `AmazonS3FullAccess` (or create custom policy with read/write permissions)
   - Save the Access Key ID and Secret Access Key
4. **Update `server/.env.local`**:
   ```
   AWS_ACCESS_KEY_ID=your_access_key_id
   AWS_SECRET_ACCESS_KEY=your_secret_access_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=rorun-documents
   ```

### Alternative: Use LocalStack or MinIO for Development
- **MinIO** (S3-compatible): https://min.io/
- Set `AWS_S3_ENDPOINT=http://localhost:9000` in `.env.local`

## Step 3: Twilio Setup (SMS OTP)

1. **Sign up for Twilio**: https://www.twilio.com/
2. **Get Account Credentials**:
   - Go to Console Dashboard
   - Copy Account SID and Auth Token
3. **Get a Phone Number**:
   - Go to Phone Numbers → Buy a Number
   - Choose a number (can use trial number for testing)
4. **Update `server/.env.local`**:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### Alternative: Use Console Logging for Development
- Leave Twilio credentials empty
- OTPs will be logged to console in development mode

## Step 4: Firebase Setup (Push Notifications)

1. **Create Firebase Project**: https://console.firebase.google.com/
2. **Enable Cloud Messaging**:
   - Go to Project Settings → Cloud Messaging
   - Enable Cloud Messaging API
3. **Create Service Account**:
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file
4. **Extract Credentials**:
   - From the JSON file, get:
     - `project_id` → `FIREBASE_PROJECT_ID`
     - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the \n characters)
     - `client_email` → `FIREBASE_CLIENT_EMAIL`
5. **Update `server/.env.local`**:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   ```

### Alternative: Skip for Development
- Leave Firebase credentials empty
- Push notifications will be logged to console

## Step 5: Redis Setup (Job Queue)

### Option A: Local Redis
1. **Install Redis**:
   - macOS: `brew install redis`
   - Linux: `sudo apt-get install redis-server`
   - Windows: https://redis.io/download
2. **Start Redis**:
   ```bash
   redis-server
   ```
3. **Update `server/.env.local`**:
   ```
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Option B: Cloud Redis
- **Redis Cloud** (Free tier): https://redis.com/try-free/
- **AWS ElastiCache**
- Update `.env.local` with cloud connection details

## Step 6: Generate JWT Secret

Generate a secure random string for JWT:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Update `server/.env.local`:
```
JWT_SECRET=your_generated_secret_here
```

## Step 7: Set Admin Secret Key

Generate another secure key for admin access:

```bash
openssl rand -base64 32
```

Update `server/.env.local`:
```
ADMIN_SECRET_KEY=your_admin_secret_here
```

## Step 8: Install Dependencies

```bash
# Backend
cd server
npm install

# Mobile App
cd ../mobile
npm install

# Admin Interface
cd ../admin
npm install

# AI Service
cd ../ai-service
npm install
```

## Step 9: Database Migration & Seeding

```bash
cd server

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed initial data (categories, plans)
npm run prisma:seed
```

## Step 10: Start Development Servers

### Terminal 1 - Backend API
```bash
cd server
npm run dev
```
Server runs on: http://localhost:3000
API Docs: http://localhost:3000/api

### Terminal 2 - Mobile App
```bash
cd mobile
npm start
```
Then press `i` for iOS simulator or `a` for Android emulator

### Terminal 3 - Admin Interface
```bash
cd admin
npm run dev
```
Admin runs on: http://localhost:3002

### Terminal 4 - AI Service (Optional)
```bash
cd ai-service
npm run dev
```
AI Service runs on: http://localhost:3001

## Quick Setup Script

Create a setup script to automate some steps:

```bash
#!/bin/bash
# setup.sh

echo "Setting up Rorun MVP..."

# Copy env files
echo "Creating .env.local files..."
cp server/.env.example server/.env.local
cp mobile/.env.example mobile/.env.local
cp ai-service/.env.example ai-service/.env.local
cp admin/.env.example admin/.env.local

# Generate secrets
echo "Generating secrets..."
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_SECRET=$(openssl rand -base64 32)

# Update server .env.local
sed -i '' "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/" server/.env.local
sed -i '' "s/change-this-in-production/$ADMIN_SECRET/" server/.env.local

echo "✅ Environment files created!"
echo ""
echo "⚠️  IMPORTANT: Edit server/.env.local and fill in:"
echo "   - DATABASE_URL"
echo "   - AWS credentials (or use MinIO for local dev)"
echo "   - Twilio credentials (optional for dev)"
echo "   - Firebase credentials (optional for dev)"
echo ""
echo "Then run:"
echo "  cd server && npm install && npm run prisma:migrate && npm run prisma:seed"
```

## Testing the Setup

1. **Test Backend**:
   ```bash
   curl http://localhost:3000/api
   ```

2. **Test Database Connection**:
   ```bash
   cd server
   npm run prisma:studio
   ```
   Opens Prisma Studio at http://localhost:5555

3. **Test Auth Flow**:
   - Use the mobile app or Postman
   - Request OTP: `POST /auth/request-otp` with `{"phone": "+2348012345678"}`
   - Check console/logs for OTP (in dev mode)
   - Verify OTP: `POST /auth/verify-otp`

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running: `pg_isready`
- Verify connection string format
- Check firewall/network settings

### Redis Connection Issues
- Check Redis is running: `redis-cli ping`
- Should return `PONG`

### AWS S3 Issues
- Verify IAM user has correct permissions
- Check bucket name and region match
- For local dev, consider using MinIO

### Port Already in Use
- Change PORT in `.env.local` files
- Or stop the service using the port

## Next Steps

1. ✅ Set up all credentials
2. ✅ Run database migrations
3. ✅ Start all services
4. ✅ Test authentication flow
5. ✅ Create your first business
6. ✅ Add transactions
7. ✅ Test document upload

For production deployment, see the technical specification document for infrastructure requirements.

