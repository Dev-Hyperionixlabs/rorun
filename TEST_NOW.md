# 🧪 Testing Started! Here's How to Begin

## ✅ What's Been Set Up

1. ✅ Node.js dependencies installed
2. ✅ PostgreSQL database created (`rorun`)
3. ✅ Database migrations run
4. ✅ Seed data loaded (categories, plans)
5. ✅ API server starting...

## 🚀 Server Status

The API server is starting in the background. Check if it's running:

```bash
curl http://localhost:3000/health
```

If you see `{"status":"ok",...}`, the server is ready!

## 📝 Quick Test Commands

### 1. Check Server Health
```bash
curl http://localhost:3000/health
```

### 2. Request OTP (Authentication)
```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678"}'
```

**Important**: Check the server console/logs for the OTP code!
It will look like: `[DEV] OTP for +2348012345678: 123456`

### 3. Verify OTP and Get Token
```bash
# Replace 123456 with the OTP from server logs
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678", "otp": "123456"}'
```

**Save the `access_token` from the response!**

### 4. Test Protected Endpoint
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
    "name": "My Test Business",
    "legalForm": "Limited Liability Company",
    "sector": "Technology",
    "state": "Lagos",
    "estimatedTurnoverBand": "small"
  }'
```

Save the `id` from the response for next steps.

### 6. Evaluate Tax Eligibility
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

### 8. Get All Transactions
```bash
curl "http://localhost:3000/businesses/BUSINESS_ID/transactions" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🌐 Interactive API Testing

**Best Option**: Use the Swagger UI!

1. Open your browser: http://localhost:3000/api
2. Click "Authorize" button (top right)
3. Enter: `Bearer YOUR_TOKEN` (from step 3)
4. Test all endpoints directly from the UI!

## 📊 View Database

```bash
cd server
npm run prisma:studio
```

Opens at: http://localhost:5555
- View all tables
- Browse data
- Edit records

## 📱 Test Mobile App

In a new terminal:

```bash
cd mobile
npm install
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Or scan QR code with Expo Go app

## 🖥️ Test Admin Interface

In a new terminal:

```bash
cd admin
npm install
npm run dev
```

Open: http://localhost:3002
- Login with admin key (from `server/.env.local` - `ADMIN_SECRET_KEY`)

## 📋 Testing Checklist

- [ ] Server health check works
- [ ] Can request OTP (check logs for code)
- [ ] Can verify OTP and get token
- [ ] Can access protected endpoints
- [ ] Swagger UI loads and works
- [ ] Can create business
- [ ] Can evaluate eligibility
- [ ] Can create transactions
- [ ] Can view transactions
- [ ] Database accessible via Prisma Studio

## 🆘 Troubleshooting

### Server not responding?
```bash
# Check if server is running
ps aux | grep "node.*dist/main"

# Check server logs
tail -f /tmp/rorun-server.log

# Restart server
cd server
npm run dev
```

### Database connection error?
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -d rorun -c "SELECT 1;"
```

### Port 3000 in use?
```bash
# Find what's using it
lsof -ti:3000

# Kill it
lsof -ti:3000 | xargs kill
```

## 🎯 Next Steps

1. ✅ Test authentication flow
2. ✅ Create test business
3. ✅ Add some transactions
4. ✅ Test reporting
5. ✅ Test mobile app
6. ✅ Test admin interface

## 💡 Pro Tips

- Use Swagger UI for easiest testing: http://localhost:3000/api
- OTP codes are logged to console (not sent via SMS in dev)
- All data persists in PostgreSQL database
- Use Prisma Studio to view/edit data visually

Happy Testing! 🚀

