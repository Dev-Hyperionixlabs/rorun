# Deployment Guide

This directory contains deployment configurations for different environments.

## Structure

```
deploy/
├── docker-compose.production.yml  # Production Docker Compose
├── nginx/
│   └── nginx.conf                 # Nginx reverse proxy config
└── README.md                      # This file
```

## Environments

### Development
- Uses `docker-compose.yml` in `server/` directory
- Local services: PostgreSQL, Redis, MinIO
- Hot reload enabled
- Debug logging

### Staging
- Mirrors production infrastructure
- Uses staging database and services
- Automated deployment on `development` branch push
- Testing environment for QA

### Production
- Full production stack
- Managed databases (RDS, Cloud SQL, etc.)
- CDN and load balancing
- Monitoring and alerting
- Automated deployment on `main` branch push

## Deployment Steps

### 1. Development Setup

```bash
cd server
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- MinIO on ports 9000 (API) and 9001 (Console)
- API server on port 3000

### 2. Staging Deployment

1. Set environment variables in your CI/CD platform
2. Build and push Docker images
3. Deploy using Kubernetes, ECS, or your platform

### 3. Production Deployment

1. **Set up secrets** in your cloud provider:
   - Database credentials
   - JWT secrets
   - AWS credentials
   - Twilio credentials
   - Firebase credentials

2. **Deploy infrastructure**:
   ```bash
   # Using Docker Compose (for single server)
   docker-compose -f deploy/docker-compose.production.yml up -d
   
   # Or using Kubernetes
   kubectl apply -f k8s/
   ```

3. **Run database migrations**:
   ```bash
   docker exec rorun-api-prod npm run prisma:migrate deploy
   ```

4. **Seed initial data** (optional):
   ```bash
   docker exec rorun-api-prod npm run prisma:seed
   ```

## Environment Variables

Set these in your deployment platform:

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Strong random secret
- `REDIS_HOST` - Redis server address
- `AWS_ACCESS_KEY_ID` - S3 access key
- `AWS_SECRET_ACCESS_KEY` - S3 secret key

### Optional (for full functionality)
- `TWILIO_ACCOUNT_SID` - SMS OTP
- `TWILIO_AUTH_TOKEN` - SMS OTP
- `FIREBASE_PROJECT_ID` - Push notifications
- `FIREBASE_PRIVATE_KEY` - Push notifications
- `FIREBASE_CLIENT_EMAIL` - Push notifications

## Monitoring

### Health Checks
- API: `GET /health`
- AI Service: `GET /health`

### Logs
```bash
# View API logs
docker logs -f rorun-api-prod

# View all services
docker-compose -f deploy/docker-compose.production.yml logs -f
```

## Scaling

### Horizontal Scaling
- Use load balancer (Nginx, AWS ALB, etc.)
- Run multiple API instances
- Use managed Redis cluster
- Use managed PostgreSQL (RDS, Cloud SQL)

### Vertical Scaling
- Increase container resources
- Optimize database queries
- Add caching layers

## Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/TLS
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Use secrets management (AWS Secrets Manager, etc.)
- [ ] Enable database encryption at rest
- [ ] Set up firewall rules
- [ ] Enable DDoS protection
- [ ] Regular security updates
- [ ] Enable audit logging

## Backup Strategy

1. **Database Backups**:
   - Automated daily backups
   - Point-in-time recovery
   - Test restore procedures

2. **File Storage**:
   - S3 versioning enabled
   - Cross-region replication

3. **Configuration**:
   - Version control all configs
   - Document all changes

## Rollback Procedure

1. Identify the last known good version
2. Update Docker image tag
3. Restart services
4. Verify health checks
5. Monitor for issues

## Support

For deployment issues, check:
- Application logs
- Database connection
- Redis connectivity
- S3 access
- Network configuration

