# Updated AWS Requirements - Based on Current Deployment State

**Date:** October 28, 2025  
**Current Progress:** 33% Complete (Phase 5 of 15)  
**Status:** 🟡 **DEPLOYMENT IN PROGRESS - TROUBLESHOOTING NEEDED**

---

## 🎯 EXECUTIVE SUMMARY

Based on your actual deployment file, you're **actively deploying** to AWS and have made significant progress:

### ✅ What You've Successfully Deployed:
1. **VPC & Networking** - Complete with multi-AZ support
2. **Security Groups** - All 4 groups configured
3. **RDS PostgreSQL** - Running (fixed Multi-AZ issue)
4. **ElastiCache Redis** - Running  
5. **ECR Repositories** - Created and images pushed
6. **ECS Cluster** - Created

### 🚨 Current Blockers (Need Immediate Attention):
1. **Backend ECS tasks failing** - Insufficient resources or application errors
2. **Frontend build issues** - Case-sensitive import problems (partially fixed)
3. **Task definition not using latest revision** - Services may be using old configs

### ⏳ Still Required (Not Started):
1. Application Load Balancer
2. SSL Certificates
3. DNS Configuration
4. Monitoring Setup
5. Auto-scaling
6. Production testing

---

## 📊 CURRENT AWS INFRASTRUCTURE

### What's Actually Running in Your AWS Account

**Account ID:** 588752323644  
**Region:** af-south-1 (Cape Town, South Africa)

```
INFRASTRUCTURE STATUS:

✅ VPC: secure-gate-vpc (10.0.0.0/16)
   ├── Public Subnets: 2 (af-south-1a, af-south-1b)
   ├── Private Subnets: 2 (af-south-1a, af-south-1b)
   └── Database Subnets: 2 (af-south-1a, af-south-1b)

✅ Security Groups: 4
   ├── secure-gate-web-sg (ports 80, 443, 22)
   ├── secure-gate-app-sg (port 5000, 22)
   ├── secure-gate-db-sg (port 5432)
   └── secure-gate-cache-sg (port 6379)

✅ RDS PostgreSQL:
   - Instance: secure-gate-db
   - Engine: PostgreSQL
   - Multi-AZ: Yes
   - Status: Available
   - Endpoint: <check AWS console>

✅ ElastiCache Redis:
   - Cluster: secure-gate-redis
   - Engine: Redis
   - Status: Available
   - Endpoint: <check AWS console>

✅ ECR Repositories:
   - secure-gate-backend (images pushed)
   - secure-gate-frontend (build in progress)

🔄 ECS Cluster: secure-gate-cluster
   ├── Backend Service: ❌ Tasks failing
   └── Frontend Service: ⏳ Not deployed yet

❌ Application Load Balancer: Not created
❌ Route 53: Not configured
❌ ACM Certificate: Not requested
❌ CloudWatch Alarms: Not configured
```

---

## 🚨 IMMEDIATE ISSUES TO RESOLVE

### Issue #1: Backend Tasks Keep Failing

**Symptoms:**
- ECS tasks start but immediately stop
- Service shows "deployment failed"
- Tasks using old CPU/Memory config (256/512)

**Root Causes (Multiple Possibilities):**

#### A. Insufficient Resources
```yaml
Current: CPU 256 (0.25 vCPU), Memory 512 MB
Required: CPU 512-1024 (0.5-1 vCPU), Memory 1024-2048 MB

Why: Node.js application needs more resources
Fix: Update task definition and force new deployment
```

#### B. Wrong Docker Platform
```bash
Current build might be: linux/arm64 or mixed
Required: linux/amd64 (AWS Fargate requirement)

Fix:
docker build --platform linux/amd64 -t backend .
```

#### C. Environment Variables Missing
```bash
Required env vars that might be missing:
- DB_HOST (RDS endpoint)
- DB_PASSWORD (from Secrets Manager)
- REDIS_URL (ElastiCache endpoint)
- JWT_SECRET
- SESSION_SECRET

Check: Task definition environment section
```

#### D. Application Errors
```bash
Possible errors in CloudWatch Logs:
- Database connection refused
- Redis connection timeout
- Missing npm dependencies
- Port binding issues

Check: /ecs/secure-gate-backend logs
```

**Immediate Fix Steps:**

```bash
# Step 1: Get the actual error from logs
aws logs tail /ecs/secure-gate-backend \
  --since 30m \
  --region af-south-1

# Step 2: Get stopped task details
aws ecs describe-tasks \
  --cluster secure-gate-cluster \
  --tasks $(aws ecs list-tasks --cluster secure-gate-cluster --service-name secure-gate-backend-service --desired-status STOPPED --region af-south-1 --query 'taskArns[0]' --output text) \
  --region af-south-1 \
  --query 'tasks[0].{StoppedReason:stoppedReason,Containers:containers[0].reason}'

# Step 3: Check current task definition
aws ecs describe-task-definition \
  --task-definition secure-gate-backend \
  --region af-south-1 \
  --query 'taskDefinition.{CPU:cpu,Memory:memory,Containers:containerDefinitions[0].{Name:name,Image:image,Env:environment}}'
```

**Based on the Error, Apply Fix:**

```bash
# If error = "OutOfMemoryError" or "Essential container exited"
# → Increase resources

# If error = "CannotPullContainerError"
# → Rebuild and push image with correct platform

# If error contains "ECONNREFUSED" or database errors
# → Fix environment variables

# If error = "Port 5000 already in use"
# → Check port mapping in task definition
```

---

### Issue #2: Frontend Import Case Sensitivity

**Problem:**
React components using lowercase imports that work locally but fail in production builds.

**Files Affected:**
- `PrivacyPolicy.jsx`
- Other component files using `card`, `badge`, etc.

**Fix Applied (Verify Completion):**
```javascript
// Updated exports in components/ui/index.js:
export { default as Card, CardHeader, CardTitle, CardContent } from './Card';
export { default as Badge } from './Badge';

// Updated imports in consuming files:
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
```

**Rebuild Required:**
```bash
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client

# Build with correct platform
docker build --platform linux/amd64 \
  -t 588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-frontend:latest \
  -f Dockerfile.prod .

# Test build locally first
docker run -p 80:80 --rm \
  588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-frontend:latest

# If successful, push to ECR
aws ecr get-login-password --region af-south-1 | \
  docker login --username AWS --password-stdin \
  588752323644.dkr.ecr.af-south-1.amazonaws.com

docker push 588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-frontend:latest
```

---

### Issue #3: Service Not Using Latest Task Definition

**Problem:**
You created a new task definition revision with updated CPU/Memory, but the service is still using the old one.

**Diagnosis:**
```bash
# Check which revision the service is actually using
aws ecs describe-services \
  --cluster secure-gate-cluster \
  --services secure-gate-backend-service \
  --region af-south-1 \
  --query 'services[0].{TaskDef:taskDefinition,DesiredCount:desiredCount,RunningCount:runningCount}'
```

**Fix:**
```bash
# Option 1: Update service to use latest revision explicitly
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-backend-service \
  --task-definition secure-gate-backend:2 \
  --force-new-deployment \
  --region af-south-1

# Option 2: Via AWS Console
# 1. ECS → Clusters → secure-gate-cluster
# 2. Services → secure-gate-backend-service → Update
# 3. Revision: Select latest
# 4. Force new deployment: Check
# 5. Update service
```

---

## 🔧 COMPLETE FIX PROCEDURE

### Step-by-Step Resolution Plan

#### Phase A: Diagnose Backend Failure (15 minutes)

```bash
# 1. Get CloudWatch logs
aws logs tail /ecs/secure-gate-backend --since 1h --region af-south-1 > backend-logs.txt

# 2. Look for error patterns in logs:
grep -i "error\|failed\|exception" backend-logs.txt

# 3. Get task failure reasons
aws ecs list-tasks \
  --cluster secure-gate-cluster \
  --service-name secure-gate-backend-service \
  --desired-status STOPPED \
  --region af-south-1 \
  --max-items 5

# 4. Get detailed task info
aws ecs describe-tasks \
  --cluster secure-gate-cluster \
  --tasks <task-arn-from-step-3> \
  --region af-south-1
```

#### Phase B: Fix Based on Diagnosis (30-60 minutes)

**Scenario 1: Application Crash (most likely)**

```bash
# Check logs show database connection errors:
# "Error: connect ECONNREFUSED" or "Database connection failed"

# Get RDS endpoint
aws rds describe-db-instances \
  --db-instance-identifier secure-gate-db \
  --region af-south-1 \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text

# Update task definition with correct DB_HOST
# AWS Console → ECS → Task Definitions → secure-gate-backend
# → Create new revision
# → Environment variables:
#    DB_HOST=<rds-endpoint-from-above>
#    DB_PORT=5432
#    DB_NAME=secure_gate
#    DB_USER=secure_gate_user
#    DB_PASSWORD=<your-password>

# Also add Redis endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id secure-gate-redis \
  --show-cache-node-info \
  --region af-south-1 \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text

# Add to task definition:
#    REDIS_URL=redis://<redis-endpoint>:6379
```

**Scenario 2: Resource Constraints**

```bash
# Create new task definition with more resources
# Via AWS Console:
# - CPU: 1024 (1 vCPU)
# - Memory: 2048 (2 GB)

# Or via CLI (create new task def JSON first)
aws ecs register-task-definition \
  --cli-input-json file://task-definition-updated.json \
  --region af-south-1
```

**Scenario 3: Wrong Platform**

```bash
# Rebuild backend for correct platform
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server

docker build --platform linux/amd64 \
  -t 588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-backend:latest .

# Push
aws ecr get-login-password --region af-south-1 | \
  docker login --username AWS --password-stdin \
  588752323644.dkr.ecr.af-south-1.amazonaws.com

docker push 588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-backend:latest

# Force redeployment
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-backend-service \
  --force-new-deployment \
  --region af-south-1
```

#### Phase C: Verify Fix (15 minutes)

```bash
# 1. Watch task status
watch -n 5 'aws ecs list-tasks \
  --cluster secure-gate-cluster \
  --service-name secure-gate-backend-service \
  --desired-status RUNNING \
  --region af-south-1'

# 2. Monitor logs in real-time
aws logs tail /ecs/secure-gate-backend --follow --region af-south-1

# 3. Success indicators:
# - Task stays in RUNNING state for 5+ minutes
# - Logs show "Server listening on port 5000"
# - No error messages in logs
```

---

## 📋 REMAINING AWS REQUIREMENTS

Once backend/frontend services are running, you still need:

### 1. Application Load Balancer (2-3 hours)
```yaml
Purpose: Route traffic to ECS tasks
Configuration:
  - Type: Application Load Balancer
  - Scheme: Internet-facing
  - Subnets: Both public subnets
  - Security Group: secure-gate-web-sg
  - Target Groups:
      - Backend: Port 5000, path /api/health
      - Frontend: Port 80, path /
  - Listeners:
      - HTTP:80 → Redirect to HTTPS
      - HTTPS:443 → Route to targets
```

### 2. SSL Certificate (30 minutes)
```bash
# Request certificate via ACM
aws acm request-certificate \
  --domain-name securegate.com \
  --subject-alternative-names *.securegate.com \
  --validation-method DNS \
  --region af-south-1

# Add DNS validation records to your domain
# Wait for certificate status to become "ISSUED"
```

### 3. Route 53 DNS (1 hour)
```bash
# Create hosted zone (if not exists)
aws route53 create-hosted-zone \
  --name securegate.com \
  --caller-reference $(date +%s)

# Create A record pointing to ALB
# Get ALB DNS name
aws elbv2 describe-load-balancers \
  --names secure-gate-alb \
  --region af-south-1 \
  --query 'LoadBalancers[0].DNSName'

# Create alias record in Route 53
```

### 4. CloudWatch Monitoring (1-2 hours)
```bash
# Create alarms for:
- ECS Service CPU > 80%
- ECS Service Memory > 85%
- RDS CPU > 80%
- RDS Storage < 20% free
- Application errors > 10/minute

# Create dashboard with:
- API request rate
- Response times
- Error rates
- Database connections
- Cache hit rate
```

### 5. Auto-scaling (1 hour)
```bash
# Configure ECS service auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/secure-gate-cluster/secure-gate-backend-service \
  --min-capacity 1 \
  --max-capacity 4 \
  --region af-south-1

# Add scaling policies for CPU and memory
```

---

## ⏱️ REALISTIC TIMELINE

### TODAY (4-6 hours):
- [ ] Fix backend service (diagnose + fix + verify): 2-3 hours
- [ ] Complete frontend build and deploy: 1-2 hours
- [ ] Verify both services running: 30 minutes
- [ ] Basic connectivity testing: 30 minutes

### TOMORROW (4-6 hours):
- [ ] Setup Application Load Balancer: 2 hours
- [ ] Configure target groups and health checks: 1 hour
- [ ] Request SSL certificate: 30 minutes
- [ ] Initial Route 53 setup: 1 hour
- [ ] Testing: 1 hour

### DAY 3 (3-4 hours):
- [ ] CloudWatch monitoring setup: 2 hours
- [ ] Auto-scaling configuration: 1 hour
- [ ] Security review: 1 hour

### DAY 4 (2-3 hours):
- [ ] Performance testing: 1 hour
- [ ] Final security checks: 1 hour
- [ ] Documentation: 1 hour

### DAY 5 (1-2 hours):
- [ ] Production launch prep
- [ ] Final validation
- [ ] Go live

**Total Time:** 14-21 hours over 5 days

---

## 💰 ACTUAL AWS COSTS (Your Current Setup)

### Monthly Cost Breakdown:
```
VPC & Networking:
  - NAT Gateway: $32/month
  - Data Transfer: $10/month

ECS Fargate:
  - Backend tasks (2x): $15/month
  - Frontend tasks (2x): $15/month

RDS PostgreSQL:
  - db.t3.micro (or larger): $15-30/month
  - Multi-AZ adds: 2x cost
  - Storage (100GB): $12/month

ElastiCache Redis:
  - cache.t3.micro: $12/month

Application Load Balancer: $16/month
Data Transfer Out: $20/month
CloudWatch: $5/month

ESTIMATED TOTAL: $140-180/month
ANNUAL: $1,680-2,160/year
```

---

## ✅ SUCCESS CHECKLIST

### Current Phase Complete When:
- [ ] Backend ECS tasks running (1+ healthy tasks for 30+ minutes)
- [ ] Frontend ECS tasks running (1+ healthy tasks)
- [ ] Can curl backend health endpoint from within VPC
- [ ] Frontend serves static files correctly
- [ ] CloudWatch logs showing normal operation
- [ ] No task restarts or crashes

### Ready for Production When:
- [ ] ALB distributing traffic correctly
- [ ] HTTPS working with valid certificate
- [ ] Domain resolving to ALB
- [ ] All health checks passing
- [ ] Monitoring and alarms configured
- [ ] Backup strategy verified
- [ ] Load testing completed
- [ ] Security audit passed

---

**Status:** Updated based on actual deployment state  
**Next Action:** Run diagnostic commands to identify backend failure cause  
**Priority:** Fix backend tasks first, then complete frontend deployment  
**Est. Time to Resolution:** 4-6 hours for current issues, 14-21 hours total to production
