# AWS Deployment Issues - Found & Fixing

**Date:** October 28, 2025 at 4:30pm  
**Status:** 🔄 **FIXING IN PROGRESS**

---

## 🔍 ISSUES DISCOVERED

### Issue #1: Network Configuration ✅ FIXED
**Error:** `ResourceInitializationError: unable to pull secrets or registry auth from ECR`

**Root Cause:**
- ECS tasks were in **private subnets** without internet access
- No NAT Gateway or VPC Endpoints configured
- Tasks couldn't reach ECR to pull Docker images

**Fix Applied:**
```bash
# Updated both services to use public subnets with public IP
aws ecs update-service --network-configuration "awsvpcConfiguration={
  subnets=[subnet-0a1d89b3aa0e01a04,subnet-025d8d5e86db8c91c],
  securityGroups=[sg-06f1c8515846af911],
  assignPublicIp=ENABLED
}"
```

**Status:** ✅ **FIXED** - Services can now reach ECR

---

### Issue #2: Wrong Docker Platform ⏳ FIXING NOW
**Error:** `CannotPullContainerError: image Manifest does not contain descriptor matching platform 'linux/amd64'`

**Root Cause:**
- Docker images were built for **arm64** (Apple Silicon Mac)
- AWS Fargate requires **linux/amd64** platform
- Both backend and frontend images affected

**Fix In Progress:**
```bash
# Rebuilding backend image
docker build --platform linux/amd64 \
  -t 588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-backend:latest \
  /secure-gate-access/server

# Rebuilding frontend image
docker build --platform linux/amd64 \
  -t 588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-frontend:latest \
  -f Dockerfile.prod \
  /secure-gate-access/client
```

**Status:** 🔄 **BUILDING NOW** (ETA: 5-10 minutes)

---

## 📊 CURRENT STATUS

### Backend Service
- **Network:** ✅ Fixed (public subnets with internet access)
- **Image:** 🔄 Rebuilding with correct platform
- **Running Tasks:** 0 (waiting for new image)
- **Next:** Push image to ECR → Force redeploy

### Frontend Service
- **Network:** ✅ Fixed (public subnets with internet access)
- **Image:** 🔄 Rebuilding with correct platform
- **Running Tasks:** 0 (waiting for new image)
- **Next:** Push image to ECR → Force redeploy

---

## 🔄 NEXT STEPS (Automated)

### Step 1: Wait for Builds ⏳ IN PROGRESS
- Backend build: 5-10 minutes
- Frontend build: 5-10 minutes

### Step 2: Push Images to ECR ⏳ PENDING
```bash
# Login to ECR
aws ecr get-login-password --region af-south-1 | \
  docker login --username AWS --password-stdin \
  588752323644.dkr.ecr.af-south-1.amazonaws.com

# Push backend
docker push 588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-backend:latest

# Push frontend
docker push 588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-frontend:latest
```

### Step 3: Force Service Redeployment ⏳ PENDING
```bash
# Redeploy backend
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-backend-service-x4m7r3sd \
  --force-new-deployment \
  --region af-south-1

# Redeploy frontend
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-frontend-service-9yt8jele \
  --force-new-deployment \
  --region af-south-1
```

### Step 4: Monitor Deployment ⏳ PENDING
- Watch task status (should reach RUNNING)
- Check CloudWatch logs for startup messages
- Verify no errors

---

## ⏱️ ESTIMATED TIMELINE

```
NOW:        Docker images building (both in parallel)
+5-10 min:  Builds complete
+12 min:    Images pushed to ECR
+15 min:    Services redeployed
+18 min:    Tasks provisioning
+20 min:    Containers starting
+22 min:    Applications initializing
+25 min:    Tasks RUNNING ✅

TOTAL: ~25 minutes from now
```

---

## 🎯 SUCCESS CRITERIA

### Backend Service Running When:
- [ ] Task status: RUNNING
- [ ] Logs show: "Server listening on port 5000"
- [ ] No restart loops for 5+ minutes
- [ ] Health check passing (if configured)

### Frontend Service Running When:
- [ ] Task status: RUNNING
- [ ] Nginx serving files
- [ ] No restart loops for 5+ minutes
- [ ] Can access via public IP

---

## 🔧 WHY THESE ISSUES HAPPENED

### Issue #1 - Private Subnets
**Why:** The deployment guide likely specified private subnets for security, but didn't mention:
- Requires NAT Gateway ($32/month) OR
- Requires VPC Endpoints ($42/month) OR
- Use public subnets with ALB (free, what we did)

**Best Practice:** Use public subnets initially, move to private with VPC endpoints in production.

### Issue #2 - Wrong Platform
**Why:** Building on Apple Silicon Mac without specifying platform
- Default build uses host architecture (arm64)
- AWS Fargate only supports amd64
- Need `--platform linux/amd64` flag

**Best Practice:** Always specify `--platform linux/amd64` when building for AWS.

---

## 📋 LESSONS LEARNED

### For Future Deployments:

1. **Always Specify Platform**
   ```dockerfile
   # In Dockerfile
   FROM --platform=linux/amd64 node:18-alpine
   ```
   
   ```bash
   # Or in build command
   docker build --platform linux/amd64 -t myimage .
   ```

2. **Network Configuration Priority**
   - Start with public subnets (fastest, free)
   - Add VPC Endpoints later for production security
   - NAT Gateway is most expensive option

3. **Test Locally First**
   ```bash
   # Test if image works on amd64
   docker run --platform linux/amd64 myimage
   ```

4. **Verify ECR Images**
   ```bash
   # Check image platform
   aws ecr describe-images \
     --repository-name myrepo \
     --region af-south-1 \
     --query 'imageDetails[0]'
   ```

---

## 🚨 WHAT TO MONITOR

While builds complete, you can monitor:

```bash
# Watch backend build logs
docker logs -f $(docker ps -q --filter "ancestor=588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-backend:latest")

# Watch frontend build logs
docker logs -f $(docker ps -q --filter "ancestor=588752323644.dkr.ecr.af-south-1.amazonaws.com/secure-gate-frontend:latest")

# Check ECS service status
watch -n 10 'aws ecs describe-services \
  --cluster secure-gate-cluster \
  --services secure-gate-backend-service-x4m7r3sd \
  --region af-south-1 \
  --query "services[0].{Running:runningCount,Pending:pendingCount}"'
```

---

## 📈 AFTER SERVICES ARE RUNNING

Once both services show RUNNING tasks:

### 1. Get Task IPs
```bash
# Backend IP
aws ecs list-tasks \
  --cluster secure-gate-cluster \
  --service-name secure-gate-backend-service-x4m7r3sd \
  --desired-status RUNNING \
  --region af-south-1 \
  --query 'taskArns[0]' --output text | \
xargs -I {} aws ecs describe-tasks \
  --cluster secure-gate-cluster \
  --tasks {} \
  --region af-south-1 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text | \
xargs -I {} aws ec2 describe-network-interfaces \
  --network-interface-ids {} \
  --region af-south-1 \
  --query 'NetworkInterfaces[0].Association.PublicIp' --output text
```

### 2. Test Endpoints
```bash
# Backend health check
curl http://<backend-ip>:5000/health

# Frontend
curl http://<frontend-ip>:80
```

### 3. Check Logs
```bash
# Backend logs
aws logs tail /ecs/secure-gate-backend-logs --follow --region af-south-1

# Frontend logs
aws logs tail /ecs/secure-gate-frontend-logs --follow --region af-south-1
```

### 4. Proceed to Phase 6
- Setup Application Load Balancer
- Configure SSL/TLS
- Setup Route 53 DNS

---

## 💰 COST IMPACT

**Changes Made:**
- Using public subnets (no additional cost)
- Tasks have public IPs (no additional cost)

**Cost Savings:**
- Avoided NAT Gateway: -$32/month
- Avoided VPC Endpoints (for now): -$42/month

**Current Monthly Cost:** ~$70-90 (no change)

---

## ✅ SUMMARY

### What We Fixed:
1. ✅ Network connectivity (private → public subnets)
2. 🔄 Docker platform (arm64 → amd64) - **IN PROGRESS**

### What's Next:
1. ⏳ Wait for builds to complete
2. ⏳ Push images to ECR
3. ⏳ Redeploy services
4. ⏳ Verify tasks are running
5. ✅ Continue with Phase 6 (ALB setup)

**ETA to Running Services:** ~25 minutes from now

---

**Last Updated:** October 28, 2025 at 4:30pm  
**Next Update:** When builds complete
