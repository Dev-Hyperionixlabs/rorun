# Rorun MVP - Required Services Checklist

This document lists all services needed for the Rorun MVP, categorized by priority and use case.

## 🔴 Core Services (Required for MVP)

### 1. Database - PostgreSQL
**Status**: ✅ Required  
**Options**:
- **Local**: Install PostgreSQL locally
- **Supabase** (Recommended): https://supabase.com (Free tier: 500MB database)
- **AWS RDS**: https://aws.amazon.com/rds/
- **Google Cloud SQL**: https://cloud.google.com/sql
- **Azure Database**: https://azure.microsoft.com/services/postgresql/

**What you need**: Connection string (DATABASE_URL)

---

### 2. Object Storage - S3-Compatible
**Status**: ✅ Required  
**Purpose**: Store documents (receipts, invoices, PDFs)

**Options**:
- **AWS S3**: https://aws.amazon.com/s3/ (Free tier: 5GB for 12 months)
- **MinIO** (Local Dev): https://min.io/ (Self-hosted, S3-compatible)
- **DigitalOcean Spaces**: https://www.digitalocean.com/products/spaces
- **Cloudflare R2**: https://www.cloudflare.com/products/r2/ (No egress fees)

**What you need**: Access Key ID, Secret Access Key, Bucket Name, Region

---

### 3. Message Queue - Redis
**Status**: ✅ Required  
**Purpose**: Background job processing (OCR, PDF generation, notifications)

**Options**:
- **Local Redis**: Install locally (`brew install redis` or `apt-get install redis`)
- **Redis Cloud**: https://redis.com/try-free/ (Free tier: 30MB)
- **AWS ElastiCache**: https://aws.amazon.com/elasticache/
- **Upstash**: https://upstash.com/ (Serverless Redis, free tier)

**What you need**: Host, Port, Password (optional)

---

### 4. SMS Service - Twilio
**Status**: ✅ Required  
**Purpose**: OTP verification for phone-based login

**Options**:
- **Twilio**: https://www.twilio.com/ (Free trial: $15.50 credit)
- **Vonage (Nexmo)**: https://www.vonage.com/
- **AWS SNS**: https://aws.amazon.com/sns/ (SMS via SNS)
- **Termii**: https://termii.com/ (Nigerian-focused, good rates)

**What you need**: Account SID, Auth Token, Phone Number

**Note**: For development, you can skip this - OTPs will log to console

---

### 5. Push Notifications - Firebase
**Status**: ✅ Required  
**Purpose**: Mobile push notifications for alerts and reminders

**Options**:
- **Firebase Cloud Messaging**: https://firebase.google.com/ (Free tier)
- **OneSignal**: https://onesignal.com/ (Free tier: 10,000 subscribers)
- **Pusher Beams**: https://pusher.com/beams (Free tier: 200 MAU)

**What you need**: Project ID, Private Key, Client Email

**Note**: For development, you can skip this - notifications will log to console

---

## 🟡 Important Services (Recommended)

### 6. Analytics - PostHog or Mixpanel
**Status**: 🟡 Recommended  
**Purpose**: Track user behavior, feature usage, conversion funnels

**Options**:
- **PostHog**: https://posthog.com/ (Open source, free tier: 1M events/month)
- **Mixpanel**: https://mixpanel.com/ (Free tier: 20M events/month)
- **Amplitude**: https://amplitude.com/ (Free tier: 10M events/month)
- **Google Analytics**: https://analytics.google.com/ (Free)

**What you need**: API Key / Project Key

**Implementation**: Add to mobile app for tracking events (onboarding, transactions, etc.)

---

### 7. Monitoring & Logging
**Status**: 🟡 Recommended  
**Purpose**: Monitor API health, errors, performance

**Options**:
- **AWS CloudWatch**: https://aws.amazon.com/cloudwatch/ (Free tier: 5GB logs)
- **Sentry**: https://sentry.io/ (Free tier: 5K errors/month)
- **Datadog**: https://www.datadoghq.com/ (Free tier: 5 hosts)
- **LogRocket**: https://logrocket.com/ (Free tier: 1K sessions/month)
- **ELK Stack** (Self-hosted): Elasticsearch, Logstash, Kibana

**What you need**: API Key / Access credentials

**Implementation**: Add error tracking to backend and mobile app

---

### 8. CI/CD Pipeline
**Status**: 🟡 Recommended  
**Purpose**: Automated testing, building, and deployment

**Options**:
- **GitHub Actions**: https://github.com/features/actions (Free for public repos)
- **GitLab CI/CD**: https://about.gitlab.com/features/ci-cd/ (Free tier)
- **CircleCI**: https://circleci.com/ (Free tier: 6,000 build minutes/month)
- **AWS CodePipeline**: https://aws.amazon.com/codepipeline/
- **Vercel** (Frontend): https://vercel.com/ (Free tier)
- **Render** (Backend): https://render.com/ (Free tier available)

**What you need**: Repository access, deployment credentials

---

## 🟢 Optional Services (Future/Production)

### 9. Payment Processing
**Status**: 🟢 Future  
**Purpose**: Handle subscription payments (mentioned as "can be added later")

**Options**:
- **Stripe**: https://stripe.com/ (2.9% + $0.30 per transaction)
- **Paystack**: https://paystack.com/ (Nigerian-focused, 1.5% + ₦100)
- **Flutterwave**: https://flutterwave.com/ (African-focused)
- **Paddle**: https://paddle.com/ (Subscription-focused)

**What you need**: API Keys, Webhook endpoints

**Note**: Architecture supports subscriptions, but billing integration is deferred

---

### 10. Email Service
**Status**: 🟢 Optional  
**Purpose**: Transactional emails, notifications (alternative to SMS)

**Options**:
- **SendGrid**: https://sendgrid.com/ (Free tier: 100 emails/day)
- **Mailgun**: https://www.mailgun.com/ (Free tier: 5K emails/month)
- **AWS SES**: https://aws.amazon.com/ses/ (Free tier: 62K emails/month)
- **Resend**: https://resend.com/ (Free tier: 3K emails/month)

**What you need**: API Key

**Note**: MVP uses phone-based auth, email is optional

---

### 11. Container Registry
**Status**: 🟢 Production  
**Purpose**: Store Docker images for deployment

**Options**:
- **Docker Hub**: https://hub.docker.com/ (Free tier: 1 private repo)
- **AWS ECR**: https://aws.amazon.com/ecr/ (Free tier: 500MB/month)
- **Google Container Registry**: https://cloud.google.com/container-registry
- **GitHub Container Registry**: https://github.com/features/packages (Free)

**What you need**: Account, repository setup

---

### 12. Container Orchestration
**Status**: 🟢 Production  
**Purpose**: Deploy and manage containers (mentioned in spec: ECS/Kubernetes)

**Options**:
- **AWS ECS**: https://aws.amazon.com/ecs/ (Pay for compute only)
- **AWS EKS**: https://aws.amazon.com/eks/ (Kubernetes on AWS)
- **Google Kubernetes Engine**: https://cloud.google.com/kubernetes-engine
- **DigitalOcean Kubernetes**: https://www.digitalocean.com/products/kubernetes
- **Render**: https://render.com/ (Simplified container hosting)

**What you need**: Cloud account, configuration

---

## 📊 Service Summary by Priority

### MVP Minimum (Can Start Development)
1. ✅ PostgreSQL (Database)
2. ✅ Redis (Job Queue)
3. ⚠️ S3 (File Storage) - Can use MinIO locally
4. ⚠️ Twilio (SMS) - Can skip in dev (logs to console)
5. ⚠️ Firebase (Push) - Can skip in dev (logs to console)

### Recommended for Better Experience
6. 🟡 Analytics (PostHog/Mixpanel)
7. 🟡 Monitoring (Sentry/CloudWatch)
8. 🟡 CI/CD (GitHub Actions)

### Production Ready
9. 🟢 Payment Processing (Stripe/Paystack)
10. 🟢 Email Service (SendGrid/Mailgun)
11. 🟢 Container Registry (Docker Hub/ECR)
12. 🟢 Container Orchestration (ECS/Kubernetes)

## 💰 Cost Estimate (Monthly)

### Free Tier Options (MVP)
- PostgreSQL (Supabase): **$0** (500MB)
- Redis (Upstash): **$0** (10K commands/day)
- S3 (AWS): **$0** (5GB for 12 months)
- Twilio: **$0** (Trial credit)
- Firebase: **$0** (Free tier)
- PostHog: **$0** (1M events/month)
- Sentry: **$0** (5K errors/month)
- GitHub Actions: **$0** (Public repos)

**Total MVP Cost: $0/month** (using free tiers)

### Production Estimate (1K users)
- PostgreSQL (Supabase Pro): **$25/month**
- Redis (Upstash): **$10/month**
- S3 (AWS): **~$5/month** (50GB storage)
- Twilio: **~$20/month** (10K SMS)
- Firebase: **$0** (Free tier sufficient)
- PostHog: **$0** (Free tier sufficient)
- Sentry: **$0** (Free tier sufficient)
- Payment Processing: **2-3% of revenue**

**Estimated Production Cost: ~$60/month** (excluding payment processing fees)

## 🚀 Quick Setup Priority

1. **Start Development**: PostgreSQL + Redis + MinIO (all local)
2. **Add SMS**: Twilio (for OTP)
3. **Add Push**: Firebase (for notifications)
4. **Add Storage**: AWS S3 (for production)
5. **Add Monitoring**: Sentry (for error tracking)
6. **Add Analytics**: PostHog (for user insights)
7. **Add Payments**: Stripe/Paystack (when ready to monetize)

## 📝 Notes

- **Development**: You can run everything locally (PostgreSQL, Redis, MinIO)
- **Staging**: Use free tiers of cloud services
- **Production**: Upgrade to paid tiers as needed
- **Nigerian Services**: Consider Paystack/Termii for better local rates and support

