# Deployment Architecture

This document outlines the deployment architecture for Rorun MVP across different environments.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Production Stack                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │   Nginx      │───▶│  API Server │                 │
│  │ (Load Bal.)  │    │  (NestJS)    │                 │
│  └──────────────┘    └──────────────┘                 │
│         │                   │                           │
│         │                   ├──▶ PostgreSQL (RDS)      │
│         │                   ├──▶ Redis (ElastiCache)    │
│         │                   └──▶ S3 (File Storage)     │
│         │                                                 │
│         └──▶ AI Service (OCR)                           │
│                                                         │
│  ┌──────────────┐                                       │
│  │  Mobile App  │───▶ API via HTTPS                    │
│  │  (Expo)      │                                       │
│  └──────────────┘                                       │
│                                                         │
│  ┌──────────────┐                                       │
│  │ Admin Panel  │───▶ API via HTTPS                    │
│  │  (React)     │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

## Environment Configurations

### Development
- **Location**: Local machine
- **Database**: Local PostgreSQL or Docker
- **Storage**: MinIO (local S3-compatible)
- **Queue**: Local Redis
- **Deployment**: Docker Compose
- **Hot Reload**: Enabled

### Staging
- **Location**: Cloud (AWS/Render/Vercel)
- **Database**: Managed PostgreSQL (Supabase/RDS)
- **Storage**: S3 (staging bucket)
- **Queue**: Managed Redis
- **Deployment**: Automated via CI/CD
- **Purpose**: Pre-production testing

### Production
- **Location**: Cloud (AWS/Render/Vercel)
- **Database**: Managed PostgreSQL (RDS/Cloud SQL)
- **Storage**: S3 (production bucket)
- **Queue**: Managed Redis cluster
- **Deployment**: Automated via CI/CD with approvals
- **Monitoring**: Full observability stack

## Deployment Platforms

### Option 1: Render (Recommended for MVP)
- **Backend**: Render Web Service
- **Database**: Render PostgreSQL
- **Redis**: Render Redis
- **Storage**: AWS S3
- **Pros**: Simple, managed, free tier
- **Cons**: Less control

### Option 2: AWS (Production Scale)
- **Backend**: ECS Fargate or EC2
- **Database**: RDS PostgreSQL
- **Redis**: ElastiCache
- **Storage**: S3
- **Pros**: Full control, scalable
- **Cons**: More complex setup

### Option 3: Vercel + Supabase
- **Backend**: Vercel Serverless
- **Database**: Supabase PostgreSQL
- **Redis**: Upstash
- **Storage**: Supabase Storage or S3
- **Pros**: Great for serverless
- **Cons**: Cold starts

## CI/CD Pipeline

### GitHub Actions Workflow

1. **On Push to `development`**:
   - Run tests
   - Build Docker images
   - Deploy to staging
   - Run smoke tests

2. **On Push to `main`**:
   - Run full test suite
   - Build and tag Docker images
   - Deploy to production (with approval)
   - Run health checks

### Deployment Steps

```bash
# 1. Build Docker images
docker build -t rorun-api:latest ./server
docker build -t rorun-ai-service:latest ./ai-service

# 2. Push to registry
docker push your-registry/rorun-api:latest
docker push your-registry/rorun-ai-service:latest

# 3. Deploy (example with Docker Compose)
docker-compose -f deploy/docker-compose.production.yml pull
docker-compose -f deploy/docker-compose.production.yml up -d

# 4. Run migrations
docker exec rorun-api-prod npm run prisma:migrate deploy

# 5. Verify deployment
curl https://api.rorun.app/health
```

## Environment Variables Management

### Development
- Use `.env.local` files (gitignored)
- Store in local filesystem

### Staging/Production
- Use cloud secrets management:
  - AWS Secrets Manager
  - Google Secret Manager
  - Azure Key Vault
  - Render Environment Variables
  - Vercel Environment Variables

## Monitoring & Observability

### Metrics
- Application performance (response times, error rates)
- Database performance (query times, connections)
- Infrastructure (CPU, memory, disk)

### Logging
- Centralized logging (CloudWatch, Datadog, LogRocket)
- Structured JSON logs
- Log aggregation and search

### Alerting
- Error rate thresholds
- Response time degradation
- Database connection issues
- Disk space warnings

## Scaling Strategy

### Horizontal Scaling
- API servers: 2-10 instances behind load balancer
- Database: Read replicas for heavy read workloads
- Redis: Cluster mode for high availability

### Vertical Scaling
- Increase container resources as needed
- Optimize database queries
- Add caching layers

## Backup & Recovery

### Database
- Automated daily backups
- Point-in-time recovery (7-30 days)
- Cross-region backups

### File Storage
- S3 versioning enabled
- Lifecycle policies for old files
- Cross-region replication

### Disaster Recovery
- RTO (Recovery Time Objective): < 4 hours
- RPO (Recovery Point Objective): < 1 hour
- Documented recovery procedures

## Security

### Network
- HTTPS/TLS everywhere
- VPC isolation (AWS)
- Firewall rules
- DDoS protection

### Application
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- CORS configuration

### Secrets
- No secrets in code
- Rotate secrets regularly
- Use secrets management services
- Audit secret access

## Cost Optimization

### Development
- Use free tiers where possible
- Local development with Docker
- Shared staging environment

### Production
- Right-size instances
- Use reserved instances for predictable workloads
- Auto-scaling based on demand
- Archive old data to cheaper storage

## Next Steps

1. Choose deployment platform
2. Set up CI/CD pipeline
3. Configure environment variables
4. Set up monitoring
5. Create backup procedures
6. Document runbooks
7. Set up alerting
8. Load testing
9. Security audit
10. Go live! 🚀

