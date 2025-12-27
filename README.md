# Rorun MVP

A mobile-first compliance and clarity tool for Nigerian SMEs.

## Project Structure

- `server/` - NestJS backend API
- `mobile/` - React Native (Expo) mobile application
- `admin/` - Admin web interface (React)
- `ai-service/` - AI/OCR microservice
- `shared/` - Shared types and utilities

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis (for job queues)
- AWS S3 or compatible object storage

### Environment Setup

1. Copy `.env.example` files in each service directory to `.env.local` (or `.env`)
2. Fill in the required environment variables

Minimum local dev env vars:
- `web/.env.local`: set `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `admin/.env`: set `VITE_API_URL=http://localhost:3001`

### Development

**Backend:**
```bash
cd server
npm install
npm run dev
```
Backend defaults to `http://localhost:3001` (health: `/health`).

**Web App (Next.js):**
```bash
cd web
npm install
npm run dev
```
Web defaults to `http://localhost:3000`.

**Mobile App:**
```bash
cd mobile
npm install
npm start
```

**Admin Interface:**
```bash
cd admin
npm install
npm run dev
```
Admin defaults to `http://localhost:5173` (Vite).

**AI Service:**
```bash
cd ai-service
npm install
npm run dev
```

## Architecture

See `# Rorun MVP – Technical Specification v0.2.md` for detailed architecture and requirements.

## Tech Stack

- **Backend**: NestJS, PostgreSQL, Prisma, Redis, BullMQ
- **Mobile**: React Native (Expo), React Navigation
- **Admin**: React, Vite
- **AI/OCR**: Python/FastAPI or Node.js service
- **Storage**: S3-compatible object storage
- **Notifications**: Firebase Cloud Messaging (FCM) / APNs

