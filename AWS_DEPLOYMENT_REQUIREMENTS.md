# AWS Deployment Requirements - Complete Checklist

**System:** Secure Gate Access Management  
**Analysis Date:** October 28, 2025  
**Current Status:** 🔴 NOT READY (43% complete)  
**Estimated Time to Deploy:** 20-26 hours

---

## 🚨 CRITICAL BLOCKERS (Must Fix First)

### 1. Email Service Configuration ❌
**Status:** BROKEN - Placeholder password  
**Time:** 1-2 hours

**Fix Required:**
```bash
# Option A: Mailgun (Recommended)
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=<your-api-key>
MAILGUN_DOMAIN=securegate.com
MAILGUN_BASE_URL=https://api.mailgun.net

# Option B: AWS SES
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@securegate.com
```

### 2. SMS Service Configuration ❌
**Status:** NOT CONFIGURED  
**Time:** 2 hours

**Fix Required:**
```bash
# Option A: Twilio
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
TWILIO_FROM=+1234567890

# Option B: AWS SNS
SMS_PROVIDER=sns
AWS_SNS_REGION=us-east-1
```

### 3. Backend Health Check ⚠️
**Status:** Container unhealthy  
**Time:** 30 minutes

**Fix:** Resolve queryPerformanceMonitor error in code

---

## ☁️ AWS INFRASTRUCTURE REQUIREMENTS

### A. Compute & Containers

**1. ECR (Elastic Container Registry)**
```bash
# Create repositories
aws ecr create-repository --repository-name secure-gate/backend
aws ecr create-repository --repository-name secure-gate/frontend

# Build and push
docker build -t secure-gate-backend .
docker tag secure-gate-backend:latest <account>.dkr.ecr.us-east-1.amazonaws.com/secure-gate/backend:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/secure-gate/backend:latest
```

**2. ECS/EKS (Container Orchestration)**
- Choose: ECS (easier) or EKS (more features)
- Create cluster
- Define task definitions
- Configure auto-scaling (min: 2, max: 10 instances)
- Set up service discovery

**3. EC2 (Alternative to ECS)**
- Instance type: t3.medium (2 vCPU, 4GB RAM)
- Quantity: 2 minimum (for HA)
- AMI: Amazon Linux 2
- Storage: 30GB gp3

---

### B. Database & Cache

**4. RDS PostgreSQL**
```bash
# Requirements:
- Engine: PostgreSQL 15
- Instance: db.t3.medium
- Storage: 100GB gp3
- Multi-AZ: Yes (for HA)
- Backup retention: 7 days
- Encryption: Enabled

# Connection string needed:
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/secure_gate
PGSSL=true  # MUST enable SSL
```

**5. ElastiCache Redis**
```bash
# Requirements:
- Engine: Redis 7.x
- Node type: cache.t3.small
- Nodes: 2 (primary + replica)
- Encryption: In-transit and at-rest

# Connection needed:
REDIS_URL=redis://cache-endpoint:6379
REDIS_TLS=true
```

---

### C. Storage & CDN

**6. S3 Buckets**
```bash
# Create buckets:
aws s3 mb s3://secure-gate-frontend
aws s3 mb s3://secure-gate-uploads
aws s3 mb s3://secure-gate-backups

# Configure:
- Frontend: Public read, static website hosting
- Uploads: Private, lifecycle policy
- Backups: Private, versioning enabled
```

**7. CloudFront CDN**
```bash
# Setup:
- Origin: S3 bucket (frontend)
- Alternate domain: securegate.com
- SSL certificate: ACM
- Cache behavior: Optimize for web
- Compression: Enabled
```

---

### D. Networking & Security

**8. VPC Configuration**
```
VPC: 10.0.0.0/16
├── Public Subnet 1:  10.0.1.0/24 (us-east-1a)
├── Public Subnet 2:  10.0.2.0/24 (us-east-1b)
├── Private Subnet 1: 10.0.11.0/24 (us-east-1a) - App servers
├── Private Subnet 2: 10.0.12.0/24 (us-east-1b) - App servers
├── Private Subnet 3: 10.0.21.0/24 (us-east-1a) - RDS
└── Private Subnet 4: 10.0.22.0/24 (us-east-1b) - RDS
```

**9. Security Groups**
```bash
# ALB Security Group
- Inbound: Port 80, 443 from 0.0.0.0/0
- Outbound: All

# Application Security Group
- Inbound: Port 5000 from ALB SG
- Outbound: All

# RDS Security Group
- Inbound: Port 5432 from Application SG
- Outbound: None

# Redis Security Group
- Inbound: Port 6379 from Application SG
- Outbound: None
```

**10. Application Load Balancer**
```bash
# Configuration:
- Type: Application Load Balancer
- Scheme: Internet-facing
- Subnets: Public subnets (2 AZs)
- Target group: ECS tasks/EC2 instances
- Health check: /api/health
- SSL: ACM certificate attached
```

---

### E. DNS & SSL

**11. Route 53**
```bash
# Create hosted zone:
aws route53 create-hosted-zone --name securegate.com

# Records needed:
- A record: securegate.com → CloudFront
- A record: api.securegate.com → ALB
- CNAME: www.securegate.com → securegate.com
```

**12. ACM Certificates**
```bash
# Request certificates:
aws acm request-certificate \
  --domain-name securegate.com \
  --subject-alternative-names *.securegate.com \
  --validation-method DNS

# Attach to:
- CloudFront distribution
- Application Load Balancer
```

---

### F. Secrets & Configuration

**13. AWS Secrets Manager**
```json
{
  "secure-gate/production": {
    "JWT_SECRET": "...",
    "JWT_REFRESH_SECRET": "...",
    "SESSION_SECRET": "...",
    "POSTGRES_PASSWORD": "...",
    "REDIS_PASSWORD": "...",
    "MAILGUN_API_KEY": "...",
    "TWILIO_AUTH_TOKEN": "...",
    "ENCRYPTION_KEY": "..."
  }
}
```

**14. Systems Manager Parameter Store**
```bash
# Non-sensitive configs:
/secure-gate/production/frontend-url
/secure-gate/production/api-url
/secure-gate/production/rate-limit-window
```

---

### G. Monitoring & Logging

**15. CloudWatch**
```bash
# Log Groups:
/aws/ecs/secure-gate-backend
/aws/ecs/secure-gate-frontend
/aws/rds/secure-gate-db
/aws/elasticache/secure-gate-cache

# Metrics:
- Application metrics
- Database metrics
- Cache hit/miss rates
- API response times

# Alarms:
- High CPU (>80%)
- High memory (>85%)
- Error rate (>1%)
- Response time (>500ms)
```

**16. CloudWatch Dashboards**
- API Performance Dashboard
- Database Performance Dashboard
- Security Events Dashboard
- Business Metrics Dashboard

---

### H. Backup & DR

**17. Backup Configuration**
```bash
# RDS Automated Backups:
- Retention: 7 days
- Backup window: 03:00-04:00 UTC

# Manual Snapshots:
- Weekly full snapshots
- Retention: 30 days

# S3 Versioning:
- Enabled on all buckets
- Lifecycle: Delete after 90 days
```

**18. Disaster Recovery**
- Multi-AZ deployment
- Cross-region replication (optional)
- Recovery Time Objective (RTO): 1 hour
- Recovery Point Objective (RPO): 15 minutes

---

## 🔐 IAM ROLES & POLICIES

### 19. IAM Roles

**A. ECS Task Execution Role**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ],
    "Resource": "*"
  }]
}
```

**B. ECS Task Role**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue",
      "s3:GetObject",
      "s3:PutObject",
      "ses:SendEmail",
      "sns:Publish"
    ],
    "Resource": "*"
  }]
}
```

---

## 📋 DEPLOYMENT CHECKLIST

### Phase 1: Pre-Deployment (4-6 hours)
- [ ] Fix email service (Mailgun/SES)
- [ ] Fix SMS service (Twilio/SNS)
- [ ] Fix backend health check
- [ ] Create performance_metrics table
- [ ] Re-enable audit middleware
- [ ] Remove test users
- [ ] Run security audit
- [ ] Update documentation

### Phase 2: AWS Setup (8-12 hours)
- [ ] Create VPC and subnets
- [ ] Configure security groups
- [ ] Setup RDS PostgreSQL
- [ ] Setup ElastiCache Redis
- [ ] Create S3 buckets
- [ ] Request ACM certificates
- [ ] Setup Route 53 DNS
- [ ] Create IAM roles
- [ ] Setup Secrets Manager
- [ ] Create ECR repositories

### Phase 3: Deploy Application (4-6 hours)
- [ ] Build Docker images
- [ ] Push to ECR
- [ ] Create ECS cluster/task definitions
- [ ] Setup Application Load Balancer
- [ ] Deploy backend service
- [ ] Deploy frontend to S3
- [ ] Configure CloudFront
- [ ] Run database migrations
- [ ] Verify health checks

### Phase 4: Configure Monitoring (2-4 hours)
- [ ] Setup CloudWatch logs
- [ ] Create CloudWatch alarms
- [ ] Build dashboards
- [ ] Configure SNS notifications
- [ ] Setup PagerDuty/OpsGenie
- [ ] Test alerting

### Phase 5: Testing (4-6 hours)
- [ ] Smoke tests
- [ ] Integration tests
- [ ] Performance tests
- [ ] Security tests
- [ ] User acceptance testing
- [ ] Load testing

### Phase 6: Go Live (2-4 hours)
- [ ] DNS cutover
- [ ] Monitor for 1 hour
- [ ] Verify all endpoints
- [ ] Check error rates
- [ ] Validate performance
- [ ] User communication

---

## 💰 AWS COST ESTIMATE

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| EC2/ECS | 2x t3.medium | $60 |
| RDS PostgreSQL | db.t3.medium Multi-AZ | $140 |
| ElastiCache | cache.t3.small 2-node | $70 |
| ALB | Standard | $25 |
| CloudFront | ~1TB transfer | $85 |
| S3 | 100GB storage | $3 |
| Route 53 | 1 hosted zone | $1 |
| CloudWatch | Logs + metrics | $15 |
| Secrets Manager | 10 secrets | $4 |
| Data Transfer | Outbound | $50 |
| **TOTAL** | | **~$453/month** |

**Annual:** ~$5,436  
**With Reserved Instances:** ~$4,000/year (26% savings)

---

## ⏱️ DEPLOYMENT TIMELINE

| Phase | Duration | Total Hours |
|-------|----------|-------------|
| Phase 1: Pre-Deployment | 4-6 hours | 6 |
| Phase 2: AWS Setup | 8-12 hours | 10 |
| Phase 3: Deploy Application | 4-6 hours | 5 |
| Phase 4: Configure Monitoring | 2-4 hours | 3 |
| Phase 5: Testing | 4-6 hours | 5 |
| Phase 6: Go Live | 2-4 hours | 3 |
| **TOTAL** | **24-38 hours** | **~32 hours** |

**Timeline:** 4-5 business days

---

## 🎯 SUCCESS CRITERIA

### Technical Criteria:
- [ ] All services healthy
- [ ] API response time p95 < 200ms
- [ ] Error rate < 0.1%
- [ ] Uptime > 99.9%
- [ ] All tests passing
- [ ] Zero critical security issues

### Business Criteria:
- [ ] All user journeys functional
- [ ] Email notifications working
- [ ] SMS notifications working
- [ ] QR code generation working
- [ ] OTP verification working

---

## 📞 NEXT STEPS

1. **TODAY:** Fix critical bugs (email, SMS, health check) - 4 hours
2. **THIS WEEK:** Create AWS account, plan infrastructure - 4 hours
3. **NEXT WEEK:** Provision AWS resources - 12 hours
4. **WEEK 3:** Deploy and test - 10 hours
5. **WEEK 4:** Go live and monitor - Ongoing

---

**Document Created:** October 28, 2025  
**Based on:** Comprehensive system analysis  
**Status:** Complete requirements documented  
**Ready:** To begin AWS deployment after fixing critical bugs
