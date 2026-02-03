# AWS Cost Audit Report - Secure Gate

**Audit Date:** February 2, 2026  
**Region:** af-south-1 (Cape Town)  
**AWS Console Shows:** Current month cost $0.00, Forecast $0.16

---

## ✅ CLEANUP COMPLETED SUCCESSFULLY

**Cleanup Performed:** February 2, 2026

### Resources Deleted (Savings: ~$86-112/month)

| Resource | Status | Monthly Savings |
|----------|--------|-----------------|
| ✅ Elastic IPs (2x unassociated) | Deleted | ~$7.20 |
| ✅ ElastiCache Redis (2 nodes) | Deleted | ~$48-60 |
| ✅ Application Load Balancer | Deleted | ~$16-20 |
| ✅ ECS Fargate Services (3) | Deleted | ~$15-25 |
| ✅ ECS Cluster | Deleted | - |
| ✅ Target Groups (2) | Deleted | - |

### Application Status After Cleanup: ✅ ALL WORKING

- ✅ Backend API: http://13.245.141.234/ - **Healthy**
- ✅ Frontend: https://d26qn40o6wybhw.cloudfront.net/ - **Working**
- ✅ Database: Connected and returning data

### New Monthly Cost Estimate: ~$24-28/month

| Resource | Cost |
|----------|------|
| EC2 t3.micro | ~$7.50 |
| RDS db.t3.micro | ~$15-18 |
| S3 + CloudFront | ~$1-2 |
| EBS 8GB | ~$0.80 |
| **Total** | **~$24-28** |

**With $60 in credits: ~2+ months of coverage ✅**

---

## 🚨 CRITICAL FINDINGS - UNNECESSARY COSTS

### Summary of Wasteful Resources

| Resource | Type | Status | Monthly Cost | Action Required |
|----------|------|--------|--------------|-----------------|
| **Elastic IPs (2x)** | Unassociated | ⚠️ WASTING | ~$7.20/month | **DELETE NOW** |
| **ElastiCache Redis** | cache.t3.small x2 | ⚠️ WASTING | ~$48-60/month | **DELETE NOW** |
| **Application Load Balancer** | ALB | ⚠️ WASTING | ~$16-20/month | **DELETE NOW** |
| **ECS Fargate Service** | Running task | ⚠️ WASTING | ~$15-25/month | **DELETE NOW** |
| **Non-default VPC** | vpc-0c6fe872fda17c0ce | ⚠️ UNUSED | Free (but adds complexity) | Consider deleting |

**Total Wasteful Spending: ~$86-112/month** (exceeds your $60 credits!)

---

## 📊 Detailed Resource Analysis

### 1. Elastic IPs - ⚠️ DELETE IMMEDIATELY
**Cost: ~$3.60/month per unassociated EIP = $7.20/month total**

```
| Allocation ID                  | Public IP        | Associated | Status  |
|--------------------------------|------------------|------------|---------|
| eipalloc-0ebc3f73062dcae5e     | 13.245.201.187   | None       | WASTING |
| eipalloc-0b16eef681c59b667     | 13.247.14.110    | None       | WASTING |
```

**Why wasteful:** Elastic IPs cost money when NOT attached to a running instance. You're using the EC2's auto-assigned public IP (13.245.141.234) instead.

**Action:** Delete both Elastic IPs immediately.

---

### 2. ElastiCache Redis Cluster - ⚠️ DELETE IMMEDIATELY
**Cost: cache.t3.small = ~$24-30/month per node × 2 nodes = ~$48-60/month**

```
| Cluster ID               | Node Type      | Status    |
|--------------------------|----------------|-----------|
| secure-gate-redis-001    | cache.t3.small | available |
| secure-gate-redis-002    | cache.t3.small | available |
```

**Why wasteful:** 
- Your backend is configured to work WITHOUT Redis (`REDIS_ENABLED=false` in .env)
- The application gracefully falls back to in-memory caching
- Redis is only needed for horizontal scaling with multiple backend instances

**Action:** Delete the entire ElastiCache replication group.

---

### 3. Application Load Balancer - ⚠️ DELETE IMMEDIATELY
**Cost: ~$16-20/month (base cost) + LCU charges**

```
| Name             | Type         | State  |
|------------------|--------------|--------|
| secure-gate-alb  | application  | active |
```

**Why wasteful:**
- You're using Nginx on EC2 as a reverse proxy (working correctly!)
- ALB is redundant since we have a single EC2 instance
- ALB is designed for distributing traffic across multiple instances

**Also delete associated Target Groups:**
- secure-gate-tg (port 3000)
- sg-backend-tg-1762193252 (port 5000)

**Action:** Delete ALB and all target groups.

---

### 4. ECS Fargate Cluster & Services - ⚠️ DELETE IMMEDIATELY
**Cost: ~$15-25/month (varies by CPU/memory usage)**

```
| Service                                | Launch Type | Desired | Running |
|----------------------------------------|-------------|---------|---------|
| secure-gate-backend-service            | FARGATE     | 1       | 1       |
| secure-gate-frontend-service-9yt8jele  | None        | 1       | 0       |
| secure-gate-backend-service-x4m7r3sd   | None        | 1       | 0       |
```

**Why wasteful:**
- Your backend is running on EC2 with PM2 (working correctly!)
- Frontend is hosted on S3 + CloudFront (working correctly!)
- ECS Fargate is completely redundant

**Action:** 
1. Set all ECS service desired count to 0
2. Delete all ECS services
3. Delete ECS cluster
4. Delete CloudWatch log groups for ECS

---

### 5. Non-Default VPC - Consider Deleting
**Cost: Free, but adds complexity**

```
| VPC ID                    | CIDR         | Default |
|---------------------------|--------------|---------|
| vpc-0c6fe872fda17c0ce     | 10.0.0.0/16  | False   | ← Unused
| vpc-06fa75289f6baad8d     | 172.31.0.0/16| True    | ← In use
```

**Associated security groups in unused VPC:**
- secure-gate-web-sg
- secure-gate-db-sg
- default

**Action:** If not using, delete the non-default VPC and associated security groups.

---

## ✅ Required Resources (Keep These)

| Resource | Configuration | Monthly Cost | Purpose |
|----------|---------------|--------------|---------|
| **EC2 Instance** | t3.micro | ~$7.50 | Backend API (PM2 + Nginx) |
| **RDS PostgreSQL** | db.t3.micro, 20GB | ~$15-18 | Database |
| **S3 Bucket** | securegate-frontend-af, ~4.5MB | ~$0.10 | Frontend hosting |
| **CloudFront** | d26qn40o6wybhw.cloudfront.net | ~$1-2 | CDN for frontend |
| **EBS Volume** | 8GB gp2 | ~$0.80 | EC2 root volume |

**Total Required Costs: ~$24-28/month**

---

## 📋 Cleanup Commands

### Step 1: Delete Elastic IPs
```bash
aws ec2 release-address --region af-south-1 --allocation-id eipalloc-0ebc3f73062dcae5e
aws ec2 release-address --region af-south-1 --allocation-id eipalloc-0b16eef681c59b667
```

### Step 2: Delete ElastiCache Redis
```bash
# Delete the replication group (this will delete both cache clusters)
aws elasticache delete-replication-group --region af-south-1 \
  --replication-group-id secure-gate-redis \
  --no-final-snapshot
```

### Step 3: Delete ECS Services and Cluster
```bash
# Scale down all services first
aws ecs update-service --region af-south-1 --cluster secure-gate-cluster \
  --service secure-gate-backend-service --desired-count 0

aws ecs update-service --region af-south-1 --cluster secure-gate-cluster \
  --service secure-gate-frontend-service-9yt8jele --desired-count 0

aws ecs update-service --region af-south-1 --cluster secure-gate-cluster \
  --service secure-gate-backend-service-x4m7r3sd --desired-count 0

# Wait for tasks to stop, then delete services
aws ecs delete-service --region af-south-1 --cluster secure-gate-cluster \
  --service secure-gate-backend-service --force

aws ecs delete-service --region af-south-1 --cluster secure-gate-cluster \
  --service secure-gate-frontend-service-9yt8jele --force

aws ecs delete-service --region af-south-1 --cluster secure-gate-cluster \
  --service secure-gate-backend-service-x4m7r3sd --force

# Delete the cluster
aws ecs delete-cluster --region af-south-1 --cluster secure-gate-cluster
```

### Step 4: Delete Application Load Balancer
```bash
# Get ALB ARN first
ALB_ARN=$(aws elbv2 describe-load-balancers --region af-south-1 \
  --names secure-gate-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Delete ALB
aws elbv2 delete-load-balancer --region af-south-1 --load-balancer-arn $ALB_ARN

# Delete target groups
TG1_ARN=$(aws elbv2 describe-target-groups --region af-south-1 \
  --names secure-gate-tg --query 'TargetGroups[0].TargetGroupArn' --output text)
aws elbv2 delete-target-group --region af-south-1 --target-group-arn $TG1_ARN

TG2_ARN=$(aws elbv2 describe-target-groups --region af-south-1 \
  --names sg-backend-tg-1762193252 --query 'TargetGroups[0].TargetGroupArn' --output text)
aws elbv2 delete-target-group --region af-south-1 --target-group-arn $TG2_ARN
```

### Step 5: Delete CloudWatch Log Groups (optional, they're empty)
```bash
aws logs delete-log-group --region af-south-1 --log-group-name /ecs/secure-gate-backend
aws logs delete-log-group --region af-south-1 --log-group-name /ecs/secure-gate-backend-logs
aws logs delete-log-group --region af-south-1 --log-group-name /ecs/secure-gate-frontend-logs
aws logs delete-log-group --region af-south-1 --log-group-name secure-gate-redis-engine-logs
aws logs delete-log-group --region af-south-1 --log-group-name secure-gate-redis-slow-logs
```

### Step 6: Delete RDS Snapshots (optional, to save storage costs)
```bash
# Only if you don't need the old snapshots
aws rds delete-db-snapshot --region af-south-1 \
  --db-snapshot-identifier "final-secure-gate-db418b896e-555d-4001-927d-db73fdf3cce5"
```

---

## 💰 Cost Comparison

| Scenario | Monthly Cost | Fits in $60 Credits? |
|----------|--------------|---------------------|
| **Current (with waste)** | ~$110-140 | ❌ NO - Will exceed by ~$50-80 |
| **After cleanup** | ~$24-28 | ✅ YES - ~2 months coverage |

---

## ⚠️ Important Notes

1. **Do NOT delete:**
   - EC2 instance (i-05fc6d31ccf321ca1) - this is your backend
   - RDS instance (securegate-db) - this is your database
   - S3 bucket (securegate-frontend-af) - this is your frontend
   - CloudFront distribution - this serves your frontend
   - Security groups used by EC2 and RDS

2. **The console shows $0.00** because:
   - It's early in the billing cycle
   - Some charges take 24-48 hours to appear
   - The forecast of $0.16 seems too low and may not include all resources

3. **Verify after cleanup** that your application still works:
   - Frontend: https://d26qn40o6wybhw.cloudfront.net/
   - Backend: http://13.245.141.234/

---

**Recommendation:** Execute the cleanup commands immediately to avoid unnecessary charges. The application is already working correctly with just EC2 + RDS + S3 + CloudFront.
