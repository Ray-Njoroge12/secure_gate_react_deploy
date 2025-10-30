# Automated AWS Deployment Guide

**Status:** Scripts ready to execute  
**Prerequisites:** Phase 5 complete (backend operational)  
**Execution:** Mostly automated with prompts

---

## 📦 AVAILABLE AUTOMATION SCRIPTS

### ✅ Phase 6: Application Load Balancer
**File:** `phase6-alb-setup-commands.sh`  
**Time:** 5 minutes (automated)  
**Manual Steps:** None  
**What it does:**
- Creates ALB security group
- Creates Application Load Balancer
- Creates target groups (backend + frontend)
- Configures health checks
- Sets up routing rules (/api/* → backend, / → frontend)
- Updates ECS services to use ALB

**To run:**
```bash
./phase6-alb-setup-commands.sh
```

**Output:**
- ALB DNS name (for testing)
- Target group ARNs
- Configuration file (`alb-config.txt`)

---

### ✅ Phase 7: SSL/TLS Certificate
**File:** `phase7-ssl-setup.sh`  
**Time:** 30 minutes (mostly waiting for DNS validation)  
**Manual Steps:** Add DNS validation records to your domain  
**What it does:**
- Requests SSL certificate from ACM
- Shows DNS validation records
- (Optional) Waits for validation
- Creates HTTPS listener
- Configures HTTP → HTTPS redirect

**To run:**
```bash
./phase7-ssl-setup.sh yourdomain.com
```

**Manual action required:**
1. Script shows DNS validation records
2. You add them to your domain's DNS
3. Wait for validation (5-30 minutes)
4. Script continues automatically

---

## 🚀 EXECUTION WORKFLOW

### Current State:
```
✅ Phase 1-4: Infrastructure deployed
🔄 Phase 5: Backend needs env vars (YOU'RE DOING THIS)
⏳ Phase 6: ALB ready to deploy (AUTOMATED)
⏳ Phase 7: SSL ready to deploy (SEMI-AUTOMATED)
⏳ Phase 8-15: Documented, not yet automated
```

### After You Complete Task Definition Update:

#### Step 1: Verify Backend (5 minutes)
```bash
# I'll run these to verify:
aws ecs describe-services \
  --cluster secure-gate-cluster \
  --services secure-gate-backend-service-x4m7r3sd \
  --region af-south-1

aws logs tail /ecs/secure-gate-backend-logs \
  --follow \
  --region af-south-1
```

**Success indicators:**
- ✅ Task RUNNING
- ✅ Logs show "Database connected successfully"
- ✅ Logs show "Redis connected successfully"
- ✅ Logs show "Server listening on port 5000"

#### Step 2: Deploy Load Balancer (5 minutes)
```bash
./phase6-alb-setup-commands.sh
```

**This will:**
1. Create ALB in ~2 minutes
2. Create target groups
3. Configure routing
4. Update ECS services
5. Show ALB DNS name

**Test after:**
```bash
# Get ALB DNS from output, then:
curl http://<alb-dns>/health
curl http://<alb-dns>/api/health
```

#### Step 3: Setup SSL (30 minutes)
```bash
./phase7-ssl-setup.sh yourdomain.com
```

**This will:**
1. Request certificate from ACM
2. Show DNS validation records
3. You add records to your domain
4. (Optional) Wait for validation
5. Create HTTPS listener
6. Configure redirect HTTP → HTTPS

**Test after:**
```bash
curl https://yourdomain.com/api/health
```

#### Step 4: Configure DNS (Manual - 1 hour)
**File:** Documentation in `DEPLOYMENT_NEXT_STEPS.md`

Not yet automated - requires:
1. Create Route 53 hosted zone (if needed)
2. Create A record pointing to ALB
3. Update nameservers at domain registrar
4. Wait for propagation

#### Step 5-15: Additional Phases
**Files:** Scripts not yet created, but documented

Phases 9-15 include:
- Monitoring setup
- Auto-scaling
- Backup configuration
- Security hardening
- Performance testing
- Documentation
- Production launch

---

## 📊 SCRIPT FEATURES

### Error Handling:
- ✅ Checks for prerequisites
- ✅ Validates inputs
- ✅ Provides helpful error messages
- ✅ Shows rollback instructions if needed

### Output:
- ✅ Progress indicators
- ✅ Success confirmations
- ✅ Test commands
- ✅ Next steps
- ✅ Configuration files saved

### Safety:
- ✅ Confirmation prompts for destructive actions
- ✅ Idempotent (can re-run safely)
- ✅ Saves configuration for recovery

---

## 🔍 MONITORING DURING EXECUTION

### While Scripts Run:

**Monitor in AWS Console:**
- ECS → Clusters → secure-gate-cluster → Services
- EC2 → Load Balancers
- Certificate Manager → Certificates

**Watch CloudWatch Logs:**
```bash
# In separate terminal:
aws logs tail /ecs/secure-gate-backend-logs \
  --follow \
  --region af-south-1
```

**Check Target Health:**
```bash
# After Phase 6:
aws elbv2 describe-target-health \
  --target-group-arn <from-output> \
  --region af-south-1
```

---

## ⚠️ TROUBLESHOOTING

### If Phase 6 Script Fails:

**"Security group already exists":**
- Script will use existing security group
- Safe to continue

**"Load balancer creation failed":**
- Check if name already exists
- Delete existing ALB if testing
- Re-run script

**"Target registration failed":**
- Verify ECS services are running
- Check security group rules
- Re-run script

### If Phase 7 Script Fails:

**"Certificate request failed":**
- Check domain name is valid
- Verify AWS account limits
- Try different domain

**"DNS validation timeout":**
- Verify DNS records added correctly
- Check DNS propagation: `dig CNAME _xxx.yourdomain.com`
- Re-run script to continue

---

## 💡 TIPS FOR SMOOTH EXECUTION

### Before Running Scripts:

1. **Verify Prerequisites:**
   ```bash
   # Check backend is running:
   aws ecs describe-services \
     --cluster secure-gate-cluster \
     --services secure-gate-backend-service-x4m7r3sd \
     --region af-south-1 \
     --query 'services[0].runningCount'
   ```

2. **Have Domain Ready:**
   - Know your domain name
   - Have access to DNS settings
   - Or use ALB DNS for initial testing

3. **Terminal Setup:**
   - Use two terminals:
     * Terminal 1: Run scripts
     * Terminal 2: Monitor logs
   - Keep AWS Console open

### During Execution:

1. **Don't interrupt scripts** mid-execution
2. **Save all output** (ARNs, DNS names, etc.)
3. **Test each phase** before proceeding
4. **Monitor CloudWatch logs** for errors

### After Each Phase:

1. **Verify success** with test commands
2. **Check AWS Console** for resources
3. **Save configuration files** (`alb-config.txt`)
4. **Document any issues** for troubleshooting

---

## 📋 EXECUTION CHECKLIST

### Phase 5 (Current):
- [ ] Backend task definition updated
- [ ] New task RUNNING
- [ ] Database connection successful
- [ ] Redis connection successful
- [ ] Health endpoint responding

### Phase 6 (Next):
- [ ] Prerequisites verified
- [ ] Script executed successfully
- [ ] ALB created and active
- [ ] Target groups created
- [ ] Health checks passing
- [ ] Test URLs working
- [ ] Configuration saved

### Phase 7 (After Phase 6):
- [ ] Domain name ready
- [ ] Certificate requested
- [ ] DNS records added
- [ ] Certificate validated
- [ ] HTTPS listener created
- [ ] HTTP redirect configured
- [ ] HTTPS test successful

---

## 🎯 SUCCESS METRICS

### Phase 6 Success:
```bash
# All should return 200 OK:
curl http://<alb-dns>/health
curl http://<alb-dns>/api/health

# Target health should show "healthy":
aws elbv2 describe-target-health \
  --target-group-arn <backend-tg-arn> \
  --region af-south-1
```

### Phase 7 Success:
```bash
# HTTPS should work:
curl https://yourdomain.com/api/health

# HTTP should redirect:
curl -I http://yourdomain.com
# Should show: HTTP/1.1 301 Moved Permanently
```

---

## 🚀 READY TO EXECUTE

**Your current task:**
1. Finish updating backend task definition
2. Verify backend is operational
3. Tell me when ready

**Then I'll guide you through:**
1. Running Phase 6 script (ALB)
2. Running Phase 7 script (SSL)
3. Completing remaining phases

**Estimated total time:**
- Phase 5: 20 minutes (you're doing now)
- Phase 6: 5 minutes (automated)
- Phase 7: 30 minutes (semi-automated)
- Phase 8: 1 hour (manual DNS)
- Phases 9-15: 8 hours (documented)

---

**All scripts are ready!** Just complete the task definition update and we'll proceed with automated deployment. 🎯
