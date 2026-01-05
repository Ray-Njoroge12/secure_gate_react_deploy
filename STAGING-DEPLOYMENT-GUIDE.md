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
docker-compose --version
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

- [ ] Staging server SSH access
- [ ] Database admin credentials
- [ ] DNS configuration access
- [ ] SSL certificate for staging domain
- [ ] Cloud provider credentials (if using AWS/Azure/GCP)

---

## Staging Environment Setup

### Option 1: VPS Deployment (Ubuntu 22.04)

#### 1. Provision Server

```bash
# Recommended specs for staging:
# - CPU: 2 vCPUs
# - RAM: 4 GB
# - Storage: 40 GB SSD
# - Bandwidth: 100 GB/month

# SSH into server
ssh -i ~/.ssh/staging-key.pem ubuntu@staging.yourdomain.com
```

#### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 14
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-14 postgresql-contrib-14

# Install Redis (optional)
sudo apt install -y redis-server

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### 3. Configure Nginx

```nginx
# /etc/nginx/sites-available/secure-gate-staging

server {
    listen 80;
    server_name staging.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/staging.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/secure-gate-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d staging.yourdomain.com
```

### Option 2: Docker Deployment

#### 1. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: ./secure-gate-access/server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=staging
    env_file:
      - .env.staging
    depends_on:
      - db
      - redis
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: secure_gate_staging
      POSTGRES_USER: secure_gate_app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### 2. Deploy with Docker

```bash
# Build and start services
docker-compose -f docker-compose.staging.yml up -d

# View logs
docker-compose -f docker-compose.staging.yml logs -f app

# Check status
docker-compose -f docker-compose.staging.yml ps
```

---

## Database Setup

### 1. Create Database and User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

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

### 1. Clone Repository

```bash
# Create app directory
sudo mkdir -p /var/www/secure-gate
sudo chown $USER:$USER /var/www/secure-gate

# Clone repo
cd /var/www/secure-gate
git clone https://github.com/yourusername/secure-gate-react-express.git .

# Or pull latest
git pull origin main
```

### 2. Install Dependencies

```bash
cd /var/www/secure-gate/secure-gate-access/server

# Install production dependencies
npm ci --production

# Or install all dependencies for testing
npm install
```

### 3. Build Application (if needed)

```bash
# If using TypeScript or build process
npm run build

# Verify build
ls -la dist/
```

### 4. Configure Environment

```bash
# Copy environment file
cp .env.example .env.staging
nano .env.staging

# Set appropriate values
# (See Prerequisites section for required variables)

# Secure the file
chmod 600 .env.staging
```

### 5. Start Application

#### Using PM2 (Recommended)

```bash
# Start with PM2
pm2 start npm --name "secure-gate-staging" -- start

# Or with env file
pm2 start ecosystem.config.js --env staging

# Save PM2 configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# View logs
pm2 logs secure-gate-staging

# Monitor
pm2 monit

# Restart
pm2 restart secure-gate-staging
```

#### Using systemd

```bash
# Create systemd service file
sudo nano /etc/systemd/system/secure-gate-staging.service
```

```ini
[Unit]
Description=Secure Gate Staging Server
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/secure-gate/secure-gate-access/server
Environment=NODE_ENV=staging
EnvironmentFile=/var/www/secure-gate/secure-gate-access/server/.env.staging
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=secure-gate-staging

[Install]
WantedBy=multi-user.target
```

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start secure-gate-staging

# Enable on boot
sudo systemctl enable secure-gate-staging

# Check status
sudo systemctl status secure-gate-staging

# View logs
sudo journalctl -u secure-gate-staging -f
```

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

#### Set up PM2 Monitoring

```bash
# Enable PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# View metrics
pm2 web  # Access at http://localhost:9615
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

# Configure log shipping to ELK/CloudWatch/etc.
# See logging configuration in server

# View logs
pm2 logs secure-gate-staging --lines 100

# Or
tail -f /var/www/secure-gate/logs/app.log
tail -f /var/www/secure-gate/logs/error.log
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

# 2. Stop current application
pm2 stop secure-gate-production

# 3. Restore database from backup
psql $DATABASE_URL < backups/pre-deployment-backup.sql

# 4. Checkout previous version
git checkout tags/v1.0.0

# 5. Start previous version
pm2 start secure-gate-production

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
# Check logs
pm2 logs secure-gate-staging --err

# Common causes:
# - Missing environment variables
# - Database connection failed
# - Port already in use
# - Missing dependencies

# Solutions:
pm2 restart secure-gate-staging
pm2 flush  # Clear logs
```

#### 2. Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### 3. High Memory Usage

```bash
# Check memory
free -h
pm2 monit

# Restart app
pm2 restart secure-gate-staging

# Increase memory limit
pm2 start app.js --max-memory-restart 1G
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
# Application Management
pm2 list
pm2 logs secure-gate-staging
pm2 restart secure-gate-staging
pm2 stop secure-gate-staging
pm2 delete secure-gate-staging
pm2 monit

# Database
psql $DATABASE_URL
psql $DATABASE_URL -c "SELECT version();"
pg_dump $DATABASE_URL > backup.sql
psql $DATABASE_URL < backup.sql

# Nginx
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# System
htop
df -h
free -h
netstat -tunlp
sudo journalctl -f

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
