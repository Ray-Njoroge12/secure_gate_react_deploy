# Secure Gate Access - AWS Deployment Guide

**Created:** February 2, 2026  
**Target Region:** Africa (Cape Town) - `af-south-1`  
**AWS Credits Available:** US$20 of US$100 (with US$80 more available through activities)

---

## Table of Contents

1. [AWS Credits Strategy](#1-aws-credits-strategy)
2. [Architecture Overview](#2-architecture-overview)
3. [Deployment Options Comparison](#3-deployment-options-comparison)
4. [Option A: Cost-Optimized Deployment (Recommended)](#4-option-a-cost-optimized-deployment)
5. [Option B: Production-Grade Deployment](#5-option-b-production-grade-deployment)
6. [Step-by-Step Deployment Instructions](#6-step-by-step-deployment-instructions)
7. [Environment Configuration](#7-environment-configuration)
8. [Post-Deployment Checklist](#8-post-deployment-checklist)
9. [Cost Estimation](#9-cost-estimation)
10. [Monitoring & Maintenance](#10-monitoring--maintenance)

---

## 1. AWS Credits Strategy

### Maximize Your Free Credits

Based on your AWS console, you can earn **US$100 total** by completing these activities:

| Activity | Reward | Status | Priority |
|----------|--------|--------|----------|
| Create an Aurora or RDS database | US$20 | ✅ Completed | - |
| Launch an instance using EC2 | US$20 | Not started | 🔴 High |
| Set up a cost budget using AWS Budgets | US$20 | Not started | 🔴 High |
| Create a web app using AWS Lambda | US$20 | Not started | 🟡 Medium |
| Use a foundation model in Amazon Bedrock | US$20 | Not started | 🟢 Low |

### Recommended Actions (Do These First!)

1. **Set up AWS Budgets** → Earn US$20 + protect from unexpected charges
2. **Launch EC2 instance** → Earn US$20 + needed for deployment
3. **Create Lambda function** → Earn US$20 (optional for our app, but free credits)

This gives you **US$80 in credits** to work with!

---

## 2. Architecture Overview

### AWS Architecture for Secure Gate Access

```
                                    ┌─────────────────────────────────┐
                                    │         Route 53 (DNS)          │
                                    │    securegate.yourdomain.com    │
                                    └───────────────┬─────────────────┘
                                                    │
                                    ┌───────────────▼─────────────────┐
                                    │      CloudFront (CDN)           │
                                    │   - SSL/TLS termination         │
                                    │   - Edge caching                │
                                    │   - DDoS protection             │
                                    └───────────────┬─────────────────┘
                                                    │
                        ┌───────────────────────────┼───────────────────────────┐
                        │                           │                           │
                        ▼                           ▼                           │
            ┌───────────────────────┐   ┌───────────────────────┐              │
            │    S3 Bucket          │   │   Application Load    │              │
            │  (React Frontend)     │   │   Balancer (ALB)      │              │
            │  - Static hosting     │   │   - Health checks     │              │
            │  - Versioned builds   │   │   - SSL termination   │              │
            └───────────────────────┘   └───────────┬───────────┘              │
                                                    │                           │
                                    ┌───────────────▼─────────────────┐        │
                                    │        ECS Fargate / EC2        │        │
                                    │      (Express.js Backend)       │        │
                                    │   - Auto-scaling                │        │
                                    │   - Container orchestration     │        │
                                    └───────────────┬─────────────────┘        │
                                                    │                           │
                        ┌───────────────────────────┼───────────────────────────┤
                        │                           │                           │
                        ▼                           ▼                           ▼
            ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
            │    RDS PostgreSQL     │   │    ElastiCache        │   │    SES / SNS          │
            │  (Already created!)   │   │    (Redis)            │   │    (Notifications)    │
            │  - Multi-AZ optional  │   │    - Session store    │   │    - Email/SMS        │
            │  - Automated backups  │   │    - Caching          │   │                       │
            └───────────────────────┘   └───────────────────────┘   └───────────────────────┘
```

---

## 3. Deployment Options Comparison

### Option A: Cost-Optimized (Best for Credits)

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| EC2 | t3.micro (Free Tier eligible) | ~$0-8 |
| RDS PostgreSQL | db.t3.micro | ~$15-20 |
| S3 | Static hosting | ~$1-2 |
| CloudFront | CDN | ~$1-5 |
| **Total** | | **~$17-35/month** |

### Option B: Production-Grade

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| ECS Fargate | 0.5 vCPU, 1GB RAM | ~$15-25 |
| RDS PostgreSQL | db.t3.small + Multi-AZ | ~$30-50 |
| ElastiCache | cache.t3.micro | ~$12 |
| ALB | Application Load Balancer | ~$20 |
| S3 + CloudFront | Static + CDN | ~$5 |
| **Total** | | **~$82-112/month** |

### Recommendation

**Start with Option A** to maximize your credits usage, then scale to Option B as needed.

---

## 4. Option A: Cost-Optimized Deployment

### Architecture (Simplified)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CloudFront    │────▶│   S3 Bucket     │     │   EC2 Instance  │
│   (CDN)         │     │   (Frontend)    │     │   (Backend)     │
└────────┬────────┘     └─────────────────┘     └────────┬────────┘
         │                                               │
         │              ┌─────────────────┐              │
         └─────────────▶│   RDS           │◀─────────────┘
                        │   (PostgreSQL)  │
                        └─────────────────┘
```

### Services Used

1. **S3** - React frontend hosting
2. **CloudFront** - CDN with SSL
3. **EC2 t3.micro** - Express.js backend (Free Tier eligible)
4. **RDS db.t3.micro** - PostgreSQL database (you already have this!)

---

## 5. Option B: Production-Grade Deployment

### For Future Scaling (When Credits Run Out)

Uses ECS Fargate for container orchestration, ALB for load balancing, and ElastiCache for Redis. More expensive but production-ready.

---

## 6. Step-by-Step Deployment Instructions

### Phase 1: Earn More Credits First! (10 minutes)

#### Step 1.1: Set Up AWS Budgets (+$20 credits)

```bash
# Via AWS Console:
# 1. Go to AWS Budgets
# 2. Click "Create budget"
# 3. Choose "Cost budget"
# 4. Set monthly budget: $50
# 5. Add alert at 80% threshold
# 6. Add your email for notifications
```

Or use AWS CLI:
```bash
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget '{
    "BudgetName": "SecureGate-Monthly",
    "BudgetLimit": {"Amount": "50", "Unit": "USD"},
    "BudgetType": "COST",
    "TimeUnit": "MONTHLY"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE"
    },
    "Subscribers": [{
      "SubscriptionType": "EMAIL",
      "Address": "your-email@example.com"
    }]
  }]'
```

#### Step 1.2: Launch EC2 Instance (+$20 credits)

This will also be our backend server! Go to EC2 console and launch an instance.

---

### Phase 2: Deploy Backend to EC2

#### Step 2.1: Create EC2 Instance

**Via AWS Console:**

1. Go to **EC2** → **Launch Instance**
2. Configure:
   - **Name:** `securegate-api`
   - **AMI:** Amazon Linux 2023
   - **Instance type:** `t3.micro` (Free Tier eligible)
   - **Key pair:** Create new or use existing
   - **Network settings:**
     - Allow SSH (port 22)
     - Allow HTTP (port 80)
     - Allow HTTPS (port 443)
     - Allow Custom TCP (port 3001)
   - **Storage:** 20 GB gp3

3. Click **Launch Instance**

#### Step 2.2: Connect and Setup Server

```bash
# Connect to your instance
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

# Update system
sudo dnf update -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Install Git
sudo dnf install -y git

# Install PM2 for process management
sudo npm install -g pm2

# Clone your repository
git clone https://github.com/Ray-Njoroge12/secure_gate_react_deploy.git
cd secure_gate_react_deploy/secure-gate-access/server

# Install dependencies
npm install

# Create environment file
nano .env
```

#### Step 2.3: Configure Environment Variables

Create `.env` file on EC2:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Database (Use your existing RDS!)
PGHOST=your-rds-endpoint.af-south-1.rds.amazonaws.com
PGPORT=5432
PGDATABASE=secure_gate
PGUSER=securegate_user
PGPASSWORD=YOUR_SECURE_PASSWORD

# JWT Secrets (generate these!)
JWT_SECRET=YOUR_64_CHAR_SECRET_HERE
JWT_REFRESH_SECRET=YOUR_64_CHAR_REFRESH_SECRET_HERE

# Client Origin
CLIENT_ORIGIN=https://your-cloudfront-domain.cloudfront.net

# Email (Mailgun or SES)
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=your-mailgun-domain

# SMS (Africa's Talking)
AT_API_KEY=your-africastalking-key
AT_USERNAME=your-username

# Security
TRUST_PROXY=true
ENFORCE_HTTPS=true
```

#### Step 2.4: Start the Server

```bash
# Run database migrations
npm run db:migrate

# Start with PM2
pm2 start server.js --name securegate-api

# Save PM2 config for auto-restart
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs securegate-api
```

#### Step 2.5: Setup Nginx as Reverse Proxy

```bash
# Install Nginx
sudo dnf install -y nginx

# Configure Nginx
sudo nano /etc/nginx/conf.d/securegate.conf
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;

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
# Test and start Nginx
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

### Phase 3: Deploy Frontend to S3 + CloudFront

#### Step 3.1: Build the Frontend

```bash
# On your local machine
cd secure-gate-access/client

# Set production API URL
export REACT_APP_API_URL=https://your-api-domain.com

# Build for production
npm run build:production
```

#### Step 3.2: Create S3 Bucket

```bash
# Create bucket (use unique name)
aws s3 mb s3://securegate-frontend-prod --region af-south-1

# Enable static website hosting
aws s3 website s3://securegate-frontend-prod \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync build/ s3://securegate-frontend-prod --delete

# Set bucket policy for public read
aws s3api put-bucket-policy --bucket securegate-frontend-prod --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::securegate-frontend-prod/*"
  }]
}'
```

#### Step 3.3: Create CloudFront Distribution

```bash
# Via AWS Console:
# 1. Go to CloudFront → Create Distribution
# 2. Origin domain: securegate-frontend-prod.s3.af-south-1.amazonaws.com
# 3. Origin access: Origin access control settings (recommended)
# 4. Default cache behavior:
#    - Viewer protocol policy: Redirect HTTP to HTTPS
#    - Allowed HTTP methods: GET, HEAD
# 5. Settings:
#    - Price class: Use only North America and Europe (cheaper) or All edge locations
#    - Default root object: index.html
# 6. Create custom error response:
#    - Error code: 403, 404
#    - Response page path: /index.html
#    - Response code: 200 (for SPA routing)
```

---

### Phase 4: Configure RDS Database

You already created an RDS database (earned $20 credit!). Now configure it:

#### Step 4.1: Get RDS Endpoint

```bash
# Via AWS Console:
# 1. Go to RDS → Databases
# 2. Click your database
# 3. Copy the "Endpoint" (e.g., securegate-db.xxxxx.af-south-1.rds.amazonaws.com)
```

#### Step 4.2: Allow EC2 to Connect

```bash
# 1. Go to RDS → Your database → Security → VPC security groups
# 2. Edit inbound rules
# 3. Add rule:
#    - Type: PostgreSQL
#    - Port: 5432
#    - Source: Your EC2 security group ID
```

#### Step 4.3: Run Migrations

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Navigate to server
cd secure_gate_react_deploy/secure-gate-access/server

# Run migrations
npm run db:migrate
```

---

## 7. Environment Configuration

### Backend Environment Variables (EC2)

```bash
# ===========================================
# SERVER
# ===========================================
NODE_ENV=production
PORT=3001
TRUST_PROXY=true

# ===========================================
# DATABASE (RDS)
# ===========================================
PGHOST=securegate-db.xxxxx.af-south-1.rds.amazonaws.com
PGPORT=5432
PGDATABASE=secure_gate
PGUSER=securegate_admin
PGPASSWORD=YOUR_STRONG_PASSWORD

# ===========================================
# JWT SECRETS
# ===========================================
# Generate with: openssl rand -base64 64
JWT_SECRET=your-64-char-secret
JWT_REFRESH_SECRET=your-64-char-refresh-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# ===========================================
# CLIENT ORIGIN (CloudFront URL)
# ===========================================
CLIENT_ORIGIN=https://d1234567890.cloudfront.net
ADDITIONAL_ORIGINS=https://securegate.yourdomain.com

# ===========================================
# EMAIL (Choose one)
# ===========================================
# Option 1: Mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mg.yourdomain.com

# Option 2: AWS SES (recommended for AWS)
# AWS_SES_REGION=af-south-1
# AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# ===========================================
# SMS (Africa's Talking)
# ===========================================
AT_API_KEY=your-africastalking-api-key
AT_USERNAME=your-username
AT_SENDER_ID=SecureGate

# ===========================================
# ENCRYPTION
# ===========================================
ENCRYPTION_KEY=your-32-char-encryption-key
ENCRYPTION_METHOD=local

# ===========================================
# MONITORING
# ===========================================
SENTRY_DSN=your-sentry-dsn
```

### Frontend Environment Variables (Build time)

```bash
REACT_APP_API_URL=https://api.securegate.yourdomain.com
REACT_APP_WS_URL=wss://api.securegate.yourdomain.com
REACT_APP_SENTRY_DSN=your-frontend-sentry-dsn
```

---

## 8. Post-Deployment Checklist

### Immediate Actions

- [ ] Verify backend health: `curl https://your-api-url/api/health`
- [ ] Verify frontend loads correctly
- [ ] Test user registration/login
- [ ] Verify database connectivity
- [ ] Check CloudWatch logs for errors

### Security Hardening

- [ ] Enable AWS WAF on CloudFront (optional, adds cost)
- [ ] Configure security groups (restrict SSH to your IP)
- [ ] Enable RDS encryption at rest
- [ ] Set up IAM roles (least privilege)
- [ ] Enable CloudTrail for audit logging

### Monitoring Setup

- [ ] Set up CloudWatch alarms for:
  - EC2 CPU > 80%
  - RDS connections > 80%
  - 5xx error rate > 1%
- [ ] Configure SNS notifications for alarms
- [ ] Set up log retention policies

---

## 9. Cost Estimation

### With US$100 Credits (Cost-Optimized Setup)

| Service | Monthly Cost | Credits Coverage |
|---------|--------------|------------------|
| EC2 t3.micro | ~$8 | ~12 months |
| RDS db.t3.micro | ~$15 | ~6 months |
| S3 | ~$1 | ~100 months |
| CloudFront | ~$2 | ~50 months |
| Data Transfer | ~$5 | ~20 months |
| **Total** | **~$31/month** | **~3 months** |

### Tips to Extend Credits

1. **Use Free Tier** - EC2 t2.micro has 750 hours/month free for 12 months
2. **Reserved Instances** - Up to 72% savings for 1-year commitment
3. **Spot Instances** - Up to 90% savings (but can be interrupted)
4. **Right-size** - Start small, scale up as needed

---

## 10. Monitoring & Maintenance

### CloudWatch Dashboards

Create a dashboard with these widgets:

1. **EC2 Metrics**
   - CPU Utilization
   - Network In/Out
   - Status Checks

2. **RDS Metrics**
   - CPU Utilization
   - Database Connections
   - Free Storage Space
   - Read/Write IOPS

3. **Application Metrics**
   - Request count (via ALB or CloudWatch Logs)
   - Error rate
   - Response time

### Log Management

```bash
# View application logs on EC2
pm2 logs securegate-api

# Send logs to CloudWatch
# Install CloudWatch agent on EC2
sudo yum install -y amazon-cloudwatch-agent

# Configure agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### Automated Backups

- **RDS:** Enable automated backups (7-day retention minimum)
- **EC2:** Create AMI snapshots weekly
- **S3:** Enable versioning for frontend bucket

---

## Quick Start Commands

### Deploy Backend Update

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Pull latest code
cd secure_gate_react_deploy
git pull origin main

# Install dependencies and restart
cd secure-gate-access/server
npm install
pm2 restart securegate-api
```

### Deploy Frontend Update

```bash
# On local machine
cd secure-gate-access/client
npm run build:production

# Sync to S3
aws s3 sync build/ s3://securegate-frontend-prod --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## Troubleshooting

### Backend Not Starting

```bash
# Check PM2 logs
pm2 logs securegate-api --lines 100

# Check if port is in use
sudo lsof -i :3001

# Verify environment variables
cat .env
```

### Database Connection Failed

```bash
# Test connection from EC2
psql -h your-rds-endpoint -U securegate_user -d secure_gate

# Check security group allows EC2 → RDS
# Check RDS is in same VPC or has public access
```

### Frontend Not Loading

```bash
# Check S3 bucket policy
aws s3api get-bucket-policy --bucket securegate-frontend-prod

# Check CloudFront distribution status
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID
```

---

## Next Steps

1. **Complete the AWS credit activities** to get your full US$100
2. **Set up AWS Budgets** to monitor spending
3. **Launch EC2 instance** for the backend
4. **Configure your existing RDS** database
5. **Deploy frontend** to S3 + CloudFront
6. **Test the complete system**
7. **Set up monitoring** and alerts

---

*Guide created: February 2, 2026*  
*Target Region: af-south-1 (Africa - Cape Town)*
