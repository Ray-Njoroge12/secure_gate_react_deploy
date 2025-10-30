# Fix: ECS Tasks Cannot Pull Images from ECR

**Date:** October 28, 2025  
**Issue:** ResourceInitializationError - Tasks cannot reach ECR  
**Root Cause:** Tasks in private subnets without internet access  

---

## 🚨 PROBLEM SUMMARY

**Error Message:**
```
ResourceInitializationError: unable to pull secrets or registry auth: 
The task cannot pull registry auth from Amazon ECR: There is a connection 
issue between the task and Amazon ECR. Check your task network configuration.
```

**Root Cause:**
- Backend service uses subnets: `subnet-0adee998936c0ab34`, `subnet-01cb8a5a9ce72a828`
- These subnets have NO route to Internet Gateway (private subnets)
- Service has `assignPublicIp: DISABLED`
- **Result:** Tasks cannot reach ECR to pull Docker images ❌

---

## ✅ THE SOLUTION (3 Options)

### **Option 1: Use Public Subnets (QUICKEST - RECOMMENDED)**

**Time:** 5 minutes  
**Cost:** $0  
**Security:** Good for development, acceptable for production with ALB

**Available Public Subnets:**
- `subnet-0a1d89b3aa0e01a04` (10.0.1.0/24, af-south-1a) ✅
- `subnet-025d8d5e86db8c91c` (10.0.3.0/24, af-south-1b) ✅

**Implementation:**

```bash
# Update backend service to use public subnets
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-backend-service-x4m7r3sd \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-0a1d89b3aa0e01a04,subnet-025d8d5e86db8c91c],
    securityGroups=[sg-06f1c8515846af911],
    assignPublicIp=ENABLED
  }" \
  --force-new-deployment \
  --region af-south-1

# Update frontend service (same fix)
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-frontend-service-9yt8jele \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-0a1d89b3aa0e01a04,subnet-025d8d5e86db8c91c],
    securityGroups=[sg-06f1c8515846af911],
    assignPublicIp=ENABLED
  }" \
  --force-new-deployment \
  --region af-south-1
```

**Advantages:**
- ✅ Immediate fix (5 minutes)
- ✅ No additional costs
- ✅ Simple configuration
- ✅ Works perfectly with ALB

**Disadvantages:**
- ⚠️ Tasks get public IPs (mitigated by security groups)

---

### **Option 2: Add VPC Endpoints for ECR (MOST SECURE)**

**Time:** 30 minutes  
**Cost:** ~$14/month per endpoint ($42/month total)  
**Security:** Best practice for production

**Required VPC Endpoints:**
1. `com.amazonaws.af-south-1.ecr.api`
2. `com.amazonaws.af-south-1.ecr.dkr`
3. `com.amazonaws.af-south-1.s3` (gateway endpoint - free)

**Implementation:**

```bash
# Get VPC ID
VPC_ID=$(aws ec2 describe-subnets --subnet-ids subnet-0adee998936c0ab34 \
  --region af-south-1 --query 'Subnets[0].VpcId' --output text)

# Create security group for VPC endpoints
aws ec2 create-security-group \
  --group-name secure-gate-vpce-sg \
  --description "Security group for VPC endpoints" \
  --vpc-id $VPC_ID \
  --region af-south-1

# Allow HTTPS from VPC
aws ec2 authorize-security-group-ingress \
  --group-id <vpce-sg-id> \
  --protocol tcp \
  --port 443 \
  --cidr 10.0.0.0/16 \
  --region af-south-1

# Create ECR API endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.af-south-1.ecr.api \
  --subnet-ids subnet-0adee998936c0ab34 subnet-01cb8a5a9ce72a828 \
  --security-group-ids <vpce-sg-id> \
  --region af-south-1

# Create ECR Docker endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.af-south-1.ecr.dkr \
  --subnet-ids subnet-0adee998936c0ab34 subnet-01cb8a5a9ce72a828 \
  --security-group-ids <vpce-sg-id> \
  --region af-south-1

# Create S3 gateway endpoint
aws ec2 create-vpc-endpoint \
  --vpc-id $VPC_ID \
  --vpc-endpoint-type Gateway \
  --service-name com.amazonaws.af-south-1.s3 \
  --route-table-ids <route-table-id> \
  --region af-south-1
```

**Advantages:**
- ✅ Most secure (no public IPs)
- ✅ Private subnet deployment
- ✅ Production best practice

**Disadvantages:**
- ⚠️ Additional cost ($42/month)
- ⚠️ More complex setup

---

### **Option 3: Add NAT Gateway (NOT RECOMMENDED)**

**Time:** 20 minutes  
**Cost:** ~$32/month + data transfer  
**Security:** Good, but most expensive

**Why Not Recommended:**
- Most expensive option
- VPC endpoints are better for ECR access
- Still need VPC endpoints for CloudWatch logs

---

## 🎯 RECOMMENDED APPROACH

### **For Immediate Fix (TODAY):**
Use **Option 1 - Public Subnets**
- Takes 5 minutes
- Zero additional cost
- Gets your deployment working immediately

### **For Production (LATER):**
Migrate to **Option 2 - VPC Endpoints**
- Set up during Phase 6-7
- More secure architecture
- Production best practice

---

## 📋 STEP-BY-STEP FIX (Option 1)

### Step 1: Update Backend Service Network Config

```bash
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-backend-service-x4m7r3sd \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-0a1d89b3aa0e01a04,subnet-025d8d5e86db8c91c],
    securityGroups=[sg-06f1c8515846af911],
    assignPublicIp=ENABLED
  }" \
  --force-new-deployment \
  --region af-south-1
```

### Step 2: Monitor Deployment

```bash
# Watch service events
watch -n 5 'aws ecs describe-services \
  --cluster secure-gate-cluster \
  --services secure-gate-backend-service-x4m7r3sd \
  --region af-south-1 \
  --query "services[0].{Running:runningCount,Pending:pendingCount,Event:events[0].message}"'
```

### Step 3: Check Task Status (after 2-3 minutes)

```bash
# List running tasks
aws ecs list-tasks \
  --cluster secure-gate-cluster \
  --service-name secure-gate-backend-service-x4m7r3sd \
  --desired-status RUNNING \
  --region af-south-1

# If task is running, check logs
aws logs tail /ecs/secure-gate-backend-logs --follow --region af-south-1
```

### Step 4: Verify Success

**Success Indicators:**
- ✅ Task status: RUNNING (for 5+ minutes)
- ✅ Logs show: "Server listening on port 5000" or similar
- ✅ Service runningCount = desiredCount
- ✅ No "unable to pull" errors

### Step 5: Update Frontend Service (Same Fix)

```bash
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-frontend-service-9yt8jele \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-0a1d89b3aa0e01a04,subnet-025d8d5e86db8c91c],
    securityGroups=[sg-06f1c8515846af911],
    assignPublicIp=ENABLED
  }" \
  --force-new-deployment \
  --region af-south-1
```

---

## 🔍 VERIFICATION COMMANDS

```bash
# 1. Check service status
aws ecs describe-services \
  --cluster secure-gate-cluster \
  --services secure-gate-backend-service-x4m7r3sd \
  --region af-south-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,LastEvent:events[0].message}'

# 2. Get task details
TASK_ARN=$(aws ecs list-tasks \
  --cluster secure-gate-cluster \
  --service-name secure-gate-backend-service-x4m7r3sd \
  --desired-status RUNNING \
  --region af-south-1 \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster secure-gate-cluster \
  --tasks $TASK_ARN \
  --region af-south-1 \
  --query 'tasks[0].{Status:lastStatus,Health:healthStatus,Started:startedAt}'

# 3. Check logs
aws logs tail /ecs/secure-gate-backend-logs --since 5m --region af-south-1

# 4. Get task public IP (if successful)
aws ecs describe-tasks \
  --cluster secure-gate-cluster \
  --tasks $TASK_ARN \
  --region af-south-1 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text | xargs -I {} aws ec2 describe-network-interfaces \
  --network-interface-ids {} \
  --region af-south-1 \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text

# 5. Test health endpoint (if task has public IP)
curl http://<public-ip>:5000/health
```

---

## 🚨 TROUBLESHOOTING

### If tasks still fail after network fix:

**Check 1: Security Group Rules**
```bash
aws ec2 describe-security-groups \
  --group-ids sg-06f1c8515846af911 \
  --region af-south-1

# Ensure it allows:
# - Outbound: All traffic to 0.0.0.0/0 (for ECR/internet access)
# - Inbound: Port 5000 from ALB security group (for health checks)
```

**Check 2: Task Definition**
```bash
aws ecs describe-task-definition \
  --task-definition secure-gate-backend:1 \
  --region af-south-1 \
  --query 'taskDefinition.containerDefinitions[0].{Image:image,CPU:cpu,Memory:memory,Env:environment}'

# Verify:
# - Image URI is correct
# - CPU/Memory are sufficient (512/1024 minimum)
# - Environment variables are set
```

**Check 3: CloudWatch Logs**
```bash
# If you can now pull images but application crashes
aws logs tail /ecs/secure-gate-backend-logs --follow --region af-south-1

# Look for:
# - Database connection errors → Check DB_HOST
# - Redis errors → Check REDIS_URL
# - Missing env vars → Update task definition
```

---

## 📊 EXPECTED TIMELINE

```
T+0 min:  Run update-service command
T+1 min:  ECS begins deployment
T+2 min:  Task provisioning (pulls image from ECR)
T+3 min:  Container starts
T+4 min:  Application initialization
T+5 min:  Task reaches RUNNING state
T+6 min:  Health checks begin passing

SUCCESS: Task stable for 5+ minutes with no restarts
```

---

## 📈 NEXT STEPS AFTER FIX

Once both services are running:

1. **Verify Health** (10 minutes)
   - Check tasks are stable
   - Review application logs
   - Test endpoints

2. **Setup Load Balancer** (2 hours)
   - Create Application Load Balancer
   - Configure target groups
   - Update services to use ALB

3. **SSL & DNS** (1 hour)
   - Request ACM certificate
   - Configure Route 53
   - Add HTTPS listener

4. **Security Hardening** (30 minutes)
   - Remove public IPs (move to VPC endpoints)
   - Update security groups
   - Enable WAF

---

**Status:** Ready to fix  
**Estimated Fix Time:** 5 minutes  
**Impact:** Resolves all deployment blockers  
**Next Action:** Run the update-service commands above
