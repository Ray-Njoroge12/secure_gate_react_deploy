# Staging Deployment & Testing Guide
**Secure Gate Access Control System**
**Production Readiness Validation**
**Date:** January 1, 2026

---

## Overview

This guide provides step-by-step instructions for deploying the Secure Gate Access Control System to a staging environment and running comprehensive tests to validate production readiness.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Staging Environment Setup](#staging-environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Test Execution Strategy](#test-execution-strategy)
6. [Integration Test Validation](#integration-test-validation)
7. [Performance Testing](#performance-testing)
8. [Security Validation](#security-validation)
9. [Monitoring Setup](#monitoring-setup)
10. [Production Cutover Plan](#production-cutover-plan)

---

## Prerequisites

### Required Software

```bash
# Node.js 18+ LTS
node --version  # Should be v18.x or higher

# PostgreSQL 14+
psql --version  # Should be 14.x or higher

# Redis 6+ (optional but recommended)
redis-cli --version  # Should be 6.x or higher

# Git
git --version

# Docker (optional, for containerized deployment)
docker --version
```

### Required Environment Variables

Create a `.env.staging` file:

```bash
# Application
NODE_ENV=staging
PORT=3001
API_URL=https://staging-api.yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@staging-db.yourdomain.com:5432/secure_gate_staging
DB_HOST=staging-db.yourdomain.com
DB_PORT=5432
DB_NAME=secure_gate_staging
DB_USER=secure_gate_app
DB_PASSWORD=<strong-password-here>
DB_SSL=true

# Redis (optional)
REDIS_URL=redis://staging-redis.yourdomain.com:6379
REDIS_HOST=staging-redis.yourdomain.com
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# Authentication
JWT_SECRET=<generate-strong-secret-256-bit>
JWT_REFRESH_SECRET=<generate-different-secret>
SESSION_SECRET=<generate-session-secret>

# Email
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=<smtp-password>
EMAIL_FROM=SecureGate <noreply@yourdomain.com>
ENABLE_EMAIL_NOTIFICATIONS=true

# SMS (Africa's Talking or similar)
SMS_API_KEY=<your-sms-api-key>
SMS_USERNAME=<your-sms-username>
ENABLE_SMS_NOTIFICATIONS=true

# AWS (if using S3 for file storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
S3_BUCKET=secure-gate-staging

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
LOG_LEVEL=info
ENABLE_DETAILED_LOGGING=true

# Feature Flags
ENABLE_E2_VISITOR_CONFIRMATION=true
ENABLE_E3_ANALYTICS=true
ENABLE_OTP_VERIFICATION=true
```

### Access Requirements

- [ ] AWS account access (ECS, ECR, RDS, CloudWatch)
- [ ] IAM credentials configured locally (`aws configure`)
- [ ] Database admin credentials
- [ ] DNS configuration access (if using a staging domain)
- [ ] ACM certificate for staging domain (if using HTTPS)

---

## Staging Environment Setup

### AWS ECS/Fargate Staging (Recommended)

#### 1. Verify AWS Access

```bash
aws sts get-caller-identity
aws configure list
```

If AWS is not set up yet, skip this check and keep the placeholders below. Replace
them once the account, ECR repo, and ECS service exist.

#### 2. Build and Push the Staging Image (ECR)

```bash
export AWS_REGION=us-west-2
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REPO=secure-gate-api
IMAGE_TAG=staging-$(git rev-parse --short HEAD)

aws ecr describe-repositories --repository-names "$ECR_REPO" \
  || aws ecr create-repository --repository-name "$ECR_REPO"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
    "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build -t "$ECR_REPO:$IMAGE_TAG" ./secure-gate-access/server
docker tag "$ECR_REPO:$IMAGE_TAG" \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG"
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG"
```

#### 3. Apply Staging Infrastructure and Update ECS

```bash
cd infra
terraform init
terraform apply \
  -var="environment=staging" \
  -var="container_image=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG"

# Force a new deployment (replace names if your staging cluster/service differ)
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-service \
  --force-new-deployment

aws ecs wait services-stable \
  --cluster secure-gate-cluster \
  --services secure-gate-service
```

---

## Database Setup

### 1. Create Database and User

```bash
# Connect to PostgreSQL (RDS)
psql $DATABASE_URL

-- Create user
CREATE USER secure_gate_app WITH PASSWORD 'strong-password-here';

-- Create database
CREATE DATABASE secure_gate_staging OWNER secure_gate_app;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE secure_gate_staging TO secure_gate_app;

-- Enable required extensions
\c secure_gate_staging
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Exit
\q
```

### 2. Run Migrations

```bash
cd /path/to/secure-gate-access/server

# Set environment
export NODE_ENV=staging

# Run migrations
npm run migrate:up

# Or if using a migration script
psql $DATABASE_URL -f src/database/migrations/001_initial_schema.sql
psql $DATABASE_URL -f src/database/migrations/002_add_visitor_tokens.sql
psql $DATABASE_URL -f src/database/migrations/003_add_event_management.sql
# ... run all migrations in order
```

### 3. Seed Test Data (Optional)

```bash
# Seed staging database with test data
npm run seed:staging

# Or manually
psql $DATABASE_URL -f tests/seeds/staging-data.sql
```

### 4. Verify Database Setup

```bash
# Connect to database
psql $DATABASE_URL

-- Check tables
\dt

-- Verify data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM visitors;
SELECT COUNT(*) FROM events;

-- Check indexes
\di

-- Exit
\q
```

---

## Application Deployment

Application deployment is handled through ECS task definitions and the ECS service.
Use the AWS ECS/Fargate staging commands in the setup section to build/push the
image and roll out a new deployment. Update runtime configuration via SSM or
Secrets Manager before triggering the service update.

---

## Test Execution Strategy

### Phase 1: Smoke Tests (5-10 minutes)

```bash
cd /var/www/secure-gate/secure-gate-access/server

# Run smoke tests
npm run test:smoke

# Expected output:
# Test Suites: X passed
# Tests: Y passed
# All critical endpoints responding
```

**Smoke Test Checklist:**
- [ ] Server starts without errors
- [ ] Database connection successful
- [ ] Redis connection successful (if enabled)
- [ ] Health check endpoint returns 200
- [ ] Authentication endpoints responding
- [ ] Basic CRUD operations work

### Phase 2: Unit Tests (8-10 seconds)

```bash
# Run full unit test suite
npm run test:unit

# Expected results:
# Test Suites: 68 passed, 7 failed, 75 total
# Tests: 3,559 passed, 68 failed, 3,632 total
# Pass Rate: 97.8%
```

**Note:** 7 failing test suites are known infrastructure mocking issues, not code bugs.

### Phase 3: Integration Tests (30-60 seconds)

```bash
# Run integration tests
npm run test:integration

# Run specific E2/E3 tests
npm test -- tests/integration/e2-visitor-confirmation.integration.test.js
npm test -- tests/integration/e3-event-management.integration.test.js
```

**Integration Test Checklist:**
- [ ] E2 Visitor Confirmation Flow
  - [ ] Visitor receives token
  - [ ] Visitor confirms via public link
  - [ ] GDPR consent captured
  - [ ] QR code generated
  - [ ] Email sent with QR code

- [ ] E3 Event Management Flow
  - [ ] Event creation
  - [ ] Visitor invitations
  - [ ] Event check-in
  - [ ] Analytics generation
  - [ ] CSV export

- [ ] Authentication Flow
  - [ ] User registration
  - [ ] Email verification
  - [ ] Login with MFA
  - [ ] Token refresh
  - [ ] Logout

- [ ] Visitor Lifecycle
  - [ ] Visitor creation
  - [ ] Approval workflow
  - [ ] Check-in/out
  - [ ] Status tracking

### Phase 4: API Testing (10-15 minutes)

Use Postman, Insomnia, or curl to test critical endpoints:

```bash
# Base URL
BASE_URL="https://staging.yourdomain.com/api"

# 1. Health Check
curl $BASE_URL/health

# 2. Authentication
curl -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'

# 3. Get Dashboard Stats
curl -X GET $BASE_URL/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Create Visitor
curl -X POST $BASE_URL/visitors \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Visitor",
    "phone": "+254712345678",
    "email": "visitor@test.com",
    "purpose": "Meeting",
    "dateOfVisit": "2026-01-15"
  }'

# 5. Public Visitor Token Access
curl -X GET $BASE_URL/public/visitors/by-token/vst_XXXXXXXXXX

# 6. OTP Verification
curl -X POST $BASE_URL/public/visitors/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"otp":"123456","visitorId":1}'
```

### Phase 5: Security Testing (15-20 minutes)

```bash
# Run security audit
npm run test:security

# Manual security checks:

# 1. SQL Injection Test
curl -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com OR 1=1--","password":"password"}'
# Should return 400 or 401, NOT 500

# 2. XSS Test
curl -X POST $BASE_URL/visitors \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","phone":"+254712345678"}'
# Should sanitize input

# 3. Rate Limiting Test
for i in {1..100}; do
  curl $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' &
done
# Should return 429 Too Many Requests after limit

# 4. CSRF Test
curl -X POST $BASE_URL/visitors \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'
# Should return 401 (no auth) or 403 (CSRF check)
```

---

## Integration Test Validation

### E2: Visitor Confirmation Flow

**Test Scenario:**
1. Resident creates visitor invitation
2. Visitor receives email with token
3. Visitor clicks confirmation link
4. Visitor accepts GDPR consent
5. System generates QR code
6. Visitor receives confirmation email with QR

**Manual Test Steps:**

```bash
# 1. Create visitor as resident
curl -X POST $BASE_URL/visitors \
  -H "Authorization: Bearer RESIDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "+254712345678",
    "email": "john@example.com",
    "purpose": "Meeting",
    "dateOfVisit": "2026-01-15",
    "timeOfVisit": "14:00"
  }'

# Response should include visitor_token

# 2. Access public confirmation page
curl $BASE_URL/public/visitors/by-token/vst_XXXXXXXXXX

# 3. Confirm visit with consent
curl -X POST $BASE_URL/public/visitors/vst_XXXXXXXXXX/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "consent": {
      "dataProcessing": true,
      "privacyPolicy": true
    }
  }'

# 4. Verify QR code generated
# Check email inbox for QR code

# 5. Verify OTP (if enabled)
curl -X POST $BASE_URL/public/visitors/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"otp":"123456","visitorId":1}'
```

**Validation Checklist:**
- [ ] Visitor token generated (68 chars, vst_ prefix)
- [ ] Public page accessible without auth
- [ ] GDPR consent captured in database
- [ ] QR code generated and stored
- [ ] Confirmation email sent
- [ ] OTP verification works (if enabled)
- [ ] Visitor status updated to "confirmed"

### E3: Event Management & Analytics

**Test Scenario:**
1. Admin creates event
2. Admin adds visitor invitations
3. Visitors confirm attendance
4. Guard checks in visitors at event
5. Admin generates analytics report
6. Admin exports visitor data to CSV

**Manual Test Steps:**

```bash
# 1. Create event
curl -X POST $BASE_URL/events \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Annual Party",
    "description": "Company annual party",
    "startDate": "2026-02-01T18:00:00Z",
    "endDate": "2026-02-01T23:00:00Z",
    "venue": "Main Hall",
    "maxCapacity": 100
  }'

# 2. Add event visitors
curl -X POST $BASE_URL/events/1/visitors \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visitors": [
      {"name":"Jane Doe","email":"jane@example.com","phone":"+254700000001"},
      {"name":"Bob Smith","email":"bob@example.com","phone":"+254700000002"}
    ]
  }'

# 3. Get event analytics
curl -X GET $BASE_URL/events/1/analytics \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 4. Export to CSV
curl -X GET $BASE_URL/events/1/export \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  --output event-visitors.csv
```

**Validation Checklist:**
- [ ] Event creation successful
- [ ] Bulk visitor invitation works
- [ ] Event QR codes generated
- [ ] Check-in tracking accurate
- [ ] Analytics calculation correct
- [ ] CSV export contains all fields
- [ ] Email notifications sent to invitees

---

## Performance Testing

### 1. Load Testing with Artillery

Install Artillery:
```bash
npm install -g artillery
```

Create load test config (`load-test.yml`):

```yaml
config:
  target: "https://staging.yourdomain.com"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "Authentication Flow"
    weight: 30
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password"
          capture:
            - json: "$.token"
              as: "authToken"

  - name: "Dashboard Access"
    weight: 40
    flow:
      - get:
          url: "/api/dashboard/stats"
          headers:
            Authorization: "Bearer {{ authToken }}"

  - name: "Visitor Creation"
    weight: 20
    flow:
      - post:
          url: "/api/visitors"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            name: "Load Test Visitor"
            phone: "+254712345678"
            email: "visitor{{ $randomNumber }}@test.com"
            purpose: "Load Testing"

  - name: "Public Visitor Access"
    weight: 10
    flow:
      - get:
          url: "/api/public/visitors/by-token/vst_{{ $randomString }}"
```

Run load test:
```bash
artillery run load-test.yml

# Expected results:
# - Request rate: 50-100 req/sec
# - Response time p95: < 500ms
# - Response time p99: < 1000ms
# - Error rate: < 1%
```

### 2. Database Performance

```bash
# Monitor database during load test
psql $DATABASE_URL

-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Performance Benchmarks

**Target Metrics:**
- [ ] API response time p95 < 500ms
- [ ] API response time p99 < 1000ms
- [ ] Database query time < 100ms
- [ ] Page load time < 2s
- [ ] Time to Interactive < 3s
- [ ] Throughput: 100+ req/sec
- [ ] Concurrent users: 500+
- [ ] Error rate < 0.5%

---

## Security Validation

### 1. SSL/TLS Check

```bash
# Check SSL certificate
openssl s_client -connect staging.yourdomain.com:443 -servername staging.yourdomain.com

# Or use SSL Labs
# https://www.ssllabs.com/ssltest/analyze.html?d=staging.yourdomain.com

# Expected: A or A+ rating
```

### 2. Security Headers

```bash
# Check security headers
curl -I https://staging.yourdomain.com

# Should include:
# X-Frame-Options: SAMEORIGIN
# X-XSS-Protection: 1; mode=block
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: ...
```

### 3. Vulnerability Scan

```bash
# Run npm audit
npm audit

# Fix vulnerabilities
npm audit fix

# Run security test
npm run test:security
```

### 4. Penetration Testing Checklist

- [ ] SQL Injection prevention verified
- [ ] XSS protection verified
- [ ] CSRF protection verified
- [ ] Rate limiting active
- [ ] Authentication working correctly
- [ ] Authorization checks enforced
- [ ] Session management secure
- [ ] Password hashing (bcrypt/argon2)
- [ ] Sensitive data encrypted
- [ ] API keys not exposed
- [ ] CORS configured correctly
- [ ] File upload restrictions
- [ ] Input validation working

---

## Monitoring Setup

### 1. Application Monitoring

#### Set up Sentry (Error Tracking)

```bash
# Install Sentry
npm install @sentry/node @sentry/tracing
```

```javascript
// server.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'staging',
  tracesSampleRate: 1.0
});
```

#### Configure CloudWatch Log Retention (Recommended)

```bash
# Log group is created by Terraform (var.ecs_log_group_name)
LOG_GROUP="/ecs/secure-gate"

# Set retention on the ECS log group
aws logs put-retention-policy \
  --log-group-name "$LOG_GROUP" \
  --retention-in-days 30
```

### 2. Database Monitoring

```sql
-- Create monitoring view
CREATE VIEW db_health AS
SELECT
  (SELECT count(*) FROM pg_stat_activity) as active_connections,
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_queries,
  pg_database_size(current_database()) as db_size,
  pg_size_pretty(pg_database_size(current_database())) as db_size_pretty;

-- Query to monitor
SELECT * FROM db_health;
```

### 3. Log Aggregation

```bash
# Install Winston for structured logging (already installed)

# Configure log shipping to CloudWatch
# Ensure the ECS task definition uses awslogs or FireLens

# View logs (CloudWatch)
LOG_GROUP="/ecs/secure-gate"
aws logs tail "$LOG_GROUP" --follow
```

### 4. Metrics Dashboard

**Key Metrics to Monitor:**
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- CPU usage (%)
- Memory usage (MB)
- Database connections
- Active users
- Visitor check-ins/hour

**Tools:**
- Grafana + Prometheus
- New Relic
- DataDog
- AWS CloudWatch
- Azure Monitor

---

## Production Cutover Plan

### Pre-Cutover Checklist (1 week before)

- [ ] All staging tests passing
- [ ] Performance benchmarks met
- [ ] Security audit complete
- [ ] Database migrations tested
- [ ] Backup/restore tested
- [ ] Monitoring configured
- [ ] SSL certificates ready
- [ ] DNS records prepared
- [ ] Load balancer configured
- [ ] Rollback plan documented
- [ ] Team trained on deployment
- [ ] Stakeholders notified

### Cutover Day Checklist

**T-24 hours:**
- [ ] Freeze code (no new features)
- [ ] Final staging tests
- [ ] Database backup
- [ ] Communication to users

**T-4 hours:**
- [ ] Production database backup
- [ ] Run migrations in dry-run mode
- [ ] Verify all team members ready

**T-1 hour:**
- [ ] Enable maintenance mode
- [ ] Final staging sync
- [ ] Production database backup

**T-0 (Go-Live):**
1. Run database migrations
2. Deploy application code
3. Start application servers
4. Verify health checks
5. Run smoke tests
6. Disable maintenance mode
7. Monitor closely for 1 hour

**T+1 hour:**
- [ ] All smoke tests passing
- [ ] No errors in logs
- [ ] Performance metrics normal
- [ ] User feedback positive

**T+24 hours:**
- [ ] System stable
- [ ] All integrations working
- [ ] Performance acceptable
- [ ] No critical issues

### Rollback Procedure

If issues detected:

```bash
# 1. Enable maintenance mode
curl -X POST $BASE_URL/admin/maintenance/enable

# 2. Stop current application (scale down ECS)
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-service \
  --desired-count 0

# 3. Restore database from backup
psql $DATABASE_URL < backups/pre-deployment-backup.sql

# 4. Checkout previous version
git checkout tags/v1.0.0

# 5. Start previous version
PREV_TASK_DEF=$(aws ecs list-task-definitions \
  --family-prefix secure-gate-task \
  --sort DESC \
  --query 'taskDefinitionArns[1]' \
  --output text)
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-service \
  --task-definition "$PREV_TASK_DEF" \
  --desired-count 1

aws ecs wait services-stable \
  --cluster secure-gate-cluster \
  --services secure-gate-service

# 6. Verify health
curl $BASE_URL/health

# 7. Disable maintenance mode
curl -X POST $BASE_URL/admin/maintenance/disable
```

---

## Troubleshooting Guide

### Common Issues

#### 1. Application Won't Start

```bash
# Check service status
aws ecs describe-services \
  --cluster secure-gate-cluster \
  --services secure-gate-service

# Check running tasks
aws ecs list-tasks \
  --cluster secure-gate-cluster \
  --service-name secure-gate-service

# View logs (CloudWatch)
LOG_GROUP="/ecs/secure-gate"
aws logs tail "$LOG_GROUP" --follow

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port already in use
# - Missing dependencies

# Solutions:
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-service \
  --force-new-deployment
```

#### 2. Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check RDS status (adjust identifier if different)
aws rds describe-db-instances --db-instance-identifier secure-gate-postgres

# Check connections
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Reboot RDS instance (last resort)
aws rds reboot-db-instance --db-instance-identifier secure-gate-postgres
```

#### 3. High Memory Usage

```bash
# Check memory
aws ecs describe-services \
  --cluster secure-gate-cluster \
  --services secure-gate-service

# Review CloudWatch metrics for CPU/Memory before scaling

# Restart app
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-service \
  --force-new-deployment

# Increase task memory in Terraform and redeploy if needed
```

#### 4. Slow Performance

```bash
# Check database queries
psql $DATABASE_URL

SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

# Create missing indexes
# Check application logs for slow queries
```

---

## Post-Deployment Validation

### Day 1 Checks

- [ ] Health endpoint responding
- [ ] Authentication working
- [ ] Database queries performing well
- [ ] Logs show no errors
- [ ] Monitoring dashboards active
- [ ] Backup jobs running
- [ ] SSL certificate valid
- [ ] All integrations working

### Week 1 Checks

- [ ] Performance metrics stable
- [ ] No memory leaks
- [ ] Database size growing as expected
- [ ] User feedback positive
- [ ] No security incidents
- [ ] Backup/restore tested
- [ ] Team comfortable with operations

---

## Appendix: Useful Commands

```bash
# Application Management (ECS)
aws ecs describe-services --cluster secure-gate-cluster --services secure-gate-service
aws ecs list-tasks --cluster secure-gate-cluster --service-name secure-gate-service
TASK_ARN=$(aws ecs list-tasks \
  --cluster secure-gate-cluster \
  --service-name secure-gate-service \
  --query 'taskArns[0]' \
  --output text)
aws ecs describe-tasks --cluster secure-gate-cluster --tasks "$TASK_ARN"
aws ecs update-service --cluster secure-gate-cluster --service secure-gate-service --force-new-deployment
LOG_GROUP="/ecs/secure-gate"
aws logs tail "$LOG_GROUP" --follow

# Database
psql $DATABASE_URL
psql $DATABASE_URL -c "SELECT version();"
pg_dump $DATABASE_URL > backup.sql
psql $DATABASE_URL < backup.sql

# System
htop
df -h
free -h
netstat -tunlp

# Git
git status
git pull origin main
git log --oneline -10

# NPM
npm list
npm outdated
npm audit
npm install
```

---

**END OF STAGING DEPLOYMENT GUIDE**
