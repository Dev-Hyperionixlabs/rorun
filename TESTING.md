# Testing Guide - Rorun MVP

This guide will help you test all the components that have been set up.

## Prerequisites

Before testing, ensure you have:
- Node.js 18+ installed
- PostgreSQL installed (or use Docker)
- Redis installed (or use Docker)
- Docker and Docker Compose (optional, for easy setup)

## Quick Start with Docker (Recommended)

### 1. Start All Services

```bash
cd server
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- MinIO (S3-compatible) on ports 9000 (API) and 9001 (Console)
- API server on port 3000

### 2. Set Up Database

```bash
# In a new terminal
cd server

# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed initial data (categories, plans)
npm run prisma:seed
```

### 3. Start Backend API

```bash
cd server
npm run dev
```

API will be available at: http://localhost:3000
API Docs (Swagger): http://localhost:3000/api
Health Check: http://localhost:3000/health

## Testing the API

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-..."}
```

### 2. Request OTP (Authentication)

```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678"}'
```

**Note**: In development, OTP will be logged to console. Check the server logs for the OTP code.

### 3. Verify OTP

```bash
# Replace 123456 with the OTP from console logs
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678", "otp": "123456"}'
```

Expected response:
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "...",
    "phone": "+2348012345678",
    ...
  }
}
```

**Save the `access_token` for subsequent requests!**

### 4. Get Current User

```bash
# Replace YOUR_TOKEN with the access_token from step 3
curl http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Create a Business

```bash
curl -X POST http://localhost:3000/businesses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Business Ltd",
    "legalForm": "Limited Liability Company",
    "sector": "Technology",
    "state": "Lagos",
    "estimatedTurnoverBand": "small"
  }'
```

Save the `id` from the response.

### 6. Evaluate Eligibility

```bash
# Replace BUSINESS_ID with the id from step 5
curl -X POST "http://localhost:3000/businesses/BUSINESS_ID/eligibility/evaluate" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 7. Create a Transaction

```bash
curl -X POST "http://localhost:3000/businesses/BUSINESS_ID/transactions" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "income",
    "amount": 50000,
    "currency": "NGN",
    "date": "2024-01-15",
    "description": "Sales revenue"
  }'
```

### 8. Get Transactions

```bash
curl "http://localhost:3000/businesses/BUSINESS_ID/transactions" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 9. Get Yearly Summary

```bash
curl "http://localhost:3000/businesses/BUSINESS_ID/reports/2024/summary" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 10. View API Documentation

Open in browser: http://localhost:3000/api

You can test all endpoints directly from the Swagger UI!

## Testing the Mobile App

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Start Expo

```bash
npm start
```

### 3. Run on Device/Simulator

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

### 4. Test Authentication Flow

1. Enter phone number
2. Request OTP
3. Check server console for OTP
4. Enter OTP to login
5. View dashboard

## Testing the Admin Interface

### 1. Install Dependencies

```bash
cd admin
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access Admin

Open: http://localhost:3002

### 4. Login

- Enter admin key (from `server/.env.local` - `ADMIN_SECRET_KEY`)
- View businesses dashboard

## Testing the AI Service

### 1. Install Dependencies

```bash
cd ai-service
npm install
```

### 2. Start Service

```bash
npm run dev
```

Service runs on: http://localhost:3001

### 3. Test Health Check

```bash
curl http://localhost:3001/health
```

### 4. Test OCR (requires image file)

```bash
curl -X POST http://localhost:3001/ai/ocr \
  -F "image=@/path/to/receipt.jpg"
```

## Testing Database

### 1. Open Prisma Studio

```bash
cd server
npm run prisma:studio
```

Opens at: http://localhost:5555

You can view and edit all database tables through the UI.

## Testing Checklist

### Backend API
- [ ] Health check endpoint works
- [ ] OTP request sends (check console for OTP)
- [ ] OTP verification returns JWT token
- [ ] Protected routes require authentication
- [ ] Can create business
- [ ] Can evaluate eligibility
- [ ] Can create transactions
- [ ] Can retrieve transactions
- [ ] Can generate reports
- [ ] Swagger documentation accessible

### Database
- [ ] Migrations run successfully
- [ ] Seed data created (categories, plans)
- [ ] Can query via Prisma Studio
- [ ] Relationships work correctly

### Mobile App
- [ ] App starts without errors
- [ ] Authentication screen displays
- [ ] Can request OTP
- [ ] Can verify OTP and login
- [ ] Dashboard loads
- [ ] Navigation works

### Admin Interface
- [ ] Admin interface loads
- [ ] Can login with admin key
- [ ] Can view businesses
- [ ] API calls work

### AI Service
- [ ] Service starts
- [ ] Health check works
- [ ] OCR endpoint accessible

### Docker Setup
- [ ] All containers start
- [ ] Services are healthy
- [ ] Can access MinIO console (http://localhost:9001)
- [ ] Can access API

## Common Issues & Solutions

### Issue: Database connection failed
**Solution**: 
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env.local`
- Check Docker container: `docker ps`

### Issue: Redis connection failed
**Solution**:
- Check Redis is running: `redis-cli ping`
- Verify REDIS_HOST and REDIS_PORT
- Check Docker container: `docker ps`

### Issue: Port already in use
**Solution**:
- Change PORT in `.env.local`
- Or stop the service using the port: `lsof -ti:3000 | xargs kill`

### Issue: Prisma migration fails
**Solution**:
- Make sure database exists
- Check DATABASE_URL is correct
- Try: `npm run prisma:generate` first

### Issue: OTP not received
**Solution**:
- In development, check server console logs
- OTP is logged, not sent via SMS
- Configure Twilio for actual SMS

## Next Steps After Testing

1. ✅ Verify all endpoints work
2. ✅ Test authentication flow
3. ✅ Create test data
4. ✅ Verify database operations
5. ✅ Test mobile app
6. ✅ Test admin interface
7. ✅ Set up production environment variables
8. ✅ Deploy to staging
9. ✅ Run integration tests
10. ✅ Deploy to production

## Automated Testing

Run the test suite:

```bash
cd server
npm test
```

For coverage:

```bash
npm run test:cov
```

For end-to-end tests:

```bash
npm run test:e2e
```

