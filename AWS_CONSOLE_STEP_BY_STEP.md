# AWS Console Step-by-Step Guide: Update Task Definition

**Time Required:** 15 minutes  
**Difficulty:** Easy - Just copy and paste!

---

## 📋 PREPARATION

**Files You Need:**
- `TASK_DEFINITION_ENV_VARS.txt` (in your workspace)
- Your RDS database password

**What You'll Replace:**
- `YOUR_DATABASE_PASSWORD_HERE` → Your actual RDS password

---

## 🖥️ STEP-BY-STEP INSTRUCTIONS

### Step 1: Open AWS ECS Console (1 minute)

1. **Go to:** https://af-south-1.console.aws.amazon.com/ecs/home?region=af-south-1
2. **Click:** "Task Definitions" in the left sidebar
3. **Click:** "secure-gate-backend" 
4. **Click:** Orange "Create new revision" button (top right)

---

### Step 2: Scroll to Container Definitions (30 seconds)

1. **Scroll down** to the "Container Definitions" section
2. **Click:** "backend" container (the blue text link)
3. A sidebar will open on the right

---

### Step 3: Add Environment Variables (10 minutes)

1. **Scroll down** in the sidebar to "Environment variables"
2. **Remove** any existing environment variables (if any)
3. **Click:** "Add environment variable" button

**Now add each variable below:**

#### Required Variables (Add these):

| Name | Value |
|------|-------|
| `DB_HOST` | `secure-gate-db.c58q0qawe8a7.af-south-1.rds.amazonaws.com` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `secure_gate` |
| `DB_USER` | `secure_gate_user` |
| `DB_PASSWORD` | **YOUR_ACTUAL_PASSWORD** ⚠️ |
| `REDIS_HOST` | `master.secure-gate-redis.ntfrmt.afs1.cache.amazonaws.com` |
| `REDIS_PORT` | `6379` |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `ENFORCE_HTTPS` | `false` |
| `JWT_SECRET` | `8f7d6c5b4a3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c` |
| `JWT_EXPIRE` | `15m` |
| `JWT_REFRESH_EXPIRE` | `7d` |
| `SESSION_SECRET` | `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2` |
| `SESSION_EXPIRE` | `86400000` |
| `COOKIE_SECRET` | `x9y8z7a6b5c4d3e2f1g0h9i8j7k6l5m4n3o2p1q0r9s8t7u6v5w4x3y2z1a0b9c8` |
| `CORS_ORIGIN` | `*` |
| `RATE_LIMIT_WINDOW` | `900000` |
| `RATE_LIMIT_MAX` | `100` |
| `API_VERSION` | `v1` |
| `LOG_LEVEL` | `info` |
| `LOG_FORMAT` | `json` |

#### Optional Variables (Add for completeness):

| Name | Value |
|------|-------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `admin@securegate.com` |
| `SMTP_PASS` | `PLACEHOLDER` |
| `SMTP_FROM` | `noreply@securegate.com` |
| `SMTP_SECURE` | `false` |

**Note:** For each variable:
1. Click "Add environment variable"
2. Enter the **Name** in the left field
3. Enter the **Value** in the right field
4. Click outside to confirm

---

### Step 4: Save Container Configuration (30 seconds)

1. **Scroll to bottom** of the sidebar
2. **Click:** "Update" button (blue button at bottom)
3. The sidebar will close

---

### Step 5: Create New Revision (30 seconds)

1. **Scroll to bottom** of the main page
2. **Click:** "Create" button (orange button at bottom)
3. **Wait** for the green success message
4. **Note** the new revision number (should be ":2")

---

### Step 6: Update the Service (2 minutes)

1. **Click:** "Deploy" dropdown (top right)
2. **Select:** "Update service"
3. **Or go to:** Clusters → secure-gate-cluster → Services tab

**In the Update Service page:**

4. **Family:** secure-gate-backend (should be pre-selected)
5. **Revision:** Select the **latest** revision (the one you just created)
6. **Scroll down** to "Deployment configuration"
7. **Check:** ☑️ "Force new deployment"
8. **Click:** "Skip to review" (bottom right)
9. **Click:** "Update" (orange button)

---

### Step 7: Monitor Deployment (5 minutes)

1. **Stay on** the service details page
2. **Click:** "Events" tab
3. **Watch for:**
   - "has started 1 tasks"
   - Wait ~3-5 minutes

4. **Click:** "Tasks" tab
5. **Verify:** One task shows "RUNNING" status

---

### Step 8: Verify Success (2 minutes)

1. **Go to:** CloudWatch Logs
   - Or directly: https://af-south-1.console.aws.amazon.com/cloudwatch/home?region=af-south-1#logsV2:log-groups/log-group/$252Fecs$252Fsecure-gate-backend-logs

2. **Click:** Latest log stream
3. **Look for:**
   ```
   ✅ "Database connected successfully"
   ✅ "Redis connected successfully"
   ✅ "Server listening on port 5000"
   ❌ NO errors about connection failures
   ```

---

## ✅ SUCCESS CHECKLIST

After completing all steps, verify:

- [ ] Task definition revision created (revision :2)
- [ ] Service updated to use new revision
- [ ] New task is RUNNING (1/1)
- [ ] CloudWatch logs show:
  - [ ] "Database connected successfully"
  - [ ] "Redis connected successfully"
  - [ ] "Server listening on port 5000"
- [ ] No errors in last 5 minutes of logs

---

## 🚨 TROUBLESHOOTING

### If Task Won't Start:

**Check Events Tab:**
- Look for error messages
- Common issues: Wrong DB password, security group blocks

**Check CloudWatch Logs:**
- If logs show "Connection refused" → Security group issue
- If logs show "Authentication failed" → Wrong DB password
- If logs show "ENOTFOUND" → Wrong hostname

### If Database Connection Fails:

1. **Verify** DB_HOST is exactly: `secure-gate-db.c58q0qawe8a7.af-south-1.rds.amazonaws.com`
2. **Verify** DB_PASSWORD matches your RDS password
3. **Check** RDS security group allows traffic from ECS security group

### If Redis Connection Fails:

1. **Verify** REDIS_HOST is exactly: `master.secure-gate-redis.ntfrmt.afs1.cache.amazonaws.com`
2. **Verify** REDIS_PORT is `6379` (not in hostname)
3. **Check** ElastiCache security group allows traffic

---

## 📞 QUICK REFERENCE

**Task Definition:** secure-gate-backend  
**Current Revision:** 1  
**New Revision:** 2 (after you create it)  
**Service:** secure-gate-backend-service-x4m7r3sd  
**Cluster:** secure-gate-cluster  

**Database Endpoint:** `secure-gate-db.c58q0qawe8a7.af-south-1.rds.amazonaws.com:5432`  
**Redis Endpoint:** `master.secure-gate-redis.ntfrmt.afs1.cache.amazonaws.com:6379`

---

## 🎯 WHAT HAPPENS NEXT

Once backend is running successfully:

1. **Test Endpoints** (I'll do this)
2. **Setup Application Load Balancer** (2 hours)
3. **Configure SSL/TLS Certificate** (30 min)
4. **Setup Route 53 DNS** (1 hour)
5. **Production Launch** 🚀

---

**Estimated Time:** 15-20 minutes  
**Difficulty:** ⭐⭐☆☆☆ (Easy)  
**Impact:** Makes backend fully operational ✅
