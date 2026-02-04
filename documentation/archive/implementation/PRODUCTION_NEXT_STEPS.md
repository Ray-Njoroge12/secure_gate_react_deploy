# 📋 PRODUCTION DEPLOYMENT - FINAL STEPS

**Generated**: January 7, 2026  
**Status**: 🔄 **IN PROGRESS**  
**Phase**: Production Preparation

---

## ✅ Completed Setup Steps

### 1. ✅ Security Keys Generated
- **Encryption Key**: Generated (64 hex chars)
- **JWT Secret**: Generated
- **JWT Refresh Secret**: Generated
- **Session Secret**: Generated

All keys have been:
- ✅ Generated with cryptographically secure methods
- ✅ Saved in `production-keys-20260107_174444.txt`
- ✅ Configured in `.env.production`
- ⚠️  **CRITICAL**: Keys file must be stored securely and deleted after

### 2. ✅ Production Environment File Created
- File: `.env.production`
- Status: Created with secure defaults
- Security Settings:
  - ✅ `NODE_ENV=production`
  - ✅ `OTP_DEBUG_ECHO=false` (CRITICAL!)
  - ✅ `DEBUG_MODE=false`
  - ✅ All security features enabled

### 3. ✅ Pre-Deployment Checklist Created
- File: `PRE_DEPLOYMENT_TODO.md`
- Contains step-by-step remaining tasks
- All critical items identified

### 4. ✅ Migration Scripts Ready
- Database migrations: 3 files ready
- Data migration scripts: 2 files ready
- Application script created: `apply-production-migrations.sh`

---

## ⏳ REMAINING TASKS (Before Production)

### Critical - Must Complete Before Deployment

#### 1. Update .env.production with Your Values ⚠️
```bash
# Edit: /server/.env.production

# Update these placeholder values:
DATABASE_URL=postgresql://your-actual-db-url
SMTP_HOST=your-smtp-host.com
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
TWILIO_ACCOUNT_SID=your_actual_sid
TWILIO_AUTH_TOKEN=your_actual_token
CORS_ORIGIN=https://your-actual-domain.com
```

**Time Estimate**: 15-30 minutes

#### 2. Store Keys in Secrets Manager ⚠️
```bash
# Recommended: Use AWS Secrets Manager, HashiCorp Vault, or similar

# Example with AWS Secrets Manager:
aws secretsmanager create-secret \
  --name secure-gate/encryption-key \
  --secret-string "$(grep ENCRYPTION_KEY production-keys-*.txt)"

# Store all critical keys:
- ENCRYPTION_KEY
- JWT_SECRET  
- JWT_REFRESH_SECRET
- SESSION_SECRET
- Database credentials
- API keys (Twilio, SMTP, etc.)
```

**Time Estimate**: 30 minutes

#### 3. Delete Local Keys File ⚠️
```bash
# After storing keys securely:
shred -u production-keys-20260107_174444.txt

# Verify deletion:
ls production-keys-*.txt
# Should show: No such file or directory
```

**Time Estimate**: 2 minutes

#### 4. Create/Verify Production Database
```bash
# Create production database (if not exists)
createdb secure_gate_production

# Test connection:
psql $DATABASE_URL -c "SELECT version();"

# Should show PostgreSQL version
```

**Time Estimate**: 10 minutes

#### 5. Backup Database (if migrating existing data)
```bash
# If you have existing production data:
pg_dump $DATABASE_URL > backup_pre_security_$(date +%Y%m%d_%H%M%S).sql

# Verify backup:
ls -lh backup_*.sql

# Store backup securely
```

**Time Estimate**: 5-15 minutes (depends on data size)

---

## 🚀 PRODUCTION DEPLOYMENT STEPS

Once all remaining tasks above are complete, follow these steps:

### Step 1: Apply Database Migrations (5-10 minutes)
```bash
cd /secure-gate-access/server

# Ensure DATABASE_URL is set:
export DATABASE_URL="your-production-database-url"

# Run migration script:
chmod +x scripts/apply-production-migrations.sh
./scripts/apply-production-migrations.sh

# Expected: 3 migrations applied successfully
```

### Step 2: Deploy Application Code (10-20 minutes)
```bash
# Requires configured AWS account and CLI credentials.
# If AWS is not set up yet, skip and fill these values later.
# AWS ECS/Fargate deployment
export AWS_REGION=us-west-2
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REPO=secure-gate-api
IMAGE_TAG=$(git rev-parse --short HEAD)

# Build and push image
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
    "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build -t "$ECR_REPO:$IMAGE_TAG" ./secure-gate-access/server
docker tag "$ECR_REPO:$IMAGE_TAG" \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG"
docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG"

# Update ECS task definition via Terraform
cd infra
terraform init
terraform apply \
  -var="environment=production" \
  -var="container_image=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG"

# Force a new deployment (replace names if your cluster/service differ)
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-service \
  --force-new-deployment

aws ecs wait services-stable \
  --cluster secure-gate-cluster \
  --services secure-gate-service
```

### Step 3: Run Data Migration Scripts (30-120 minutes)
```bash
# Use production environment:
export NODE_ENV=production

# Migrate existing ID numbers:
node scripts/migrate-id-numbers.js
# Expected: "Migration complete! X records encrypted"

# Generate QR tokens for existing visitors:
node scripts/migrate-qr-codes.js
# Expected: "QR code migration complete! X tokens generated"
```

### Step 4: Verify Deployment (10 minutes)
```bash
# Run quick readiness check:
./scripts/quick-readiness-check.sh
# Expected: All checks pass

# Test health endpoint:
curl https://your-production-api.com/health
# Expected: {"status": "healthy"}

# Test scheduler status:
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-production-api.com/api/admin/retention/scheduler/status
# Expected: {"success": true, "scheduler": {"active": true}}

# Test OTP security (should NOT echo OTP):
curl -X POST https://your-production-api.com/api/visitors/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
# Expected: Success message WITHOUT OTP value
```

### Step 5: Monitor System (24-48 hours)
```bash
# Watch application logs:
tail -f /var/log/secure-gate/app.log

# Monitor for errors:
grep -i error /var/log/secure-gate/app.log

# Check security events:
grep -i "security\|otp\|encryption" /var/log/secure-gate/app.log

# Verify retention job runs:
# (Should run at 2:00 AM next day)
```

---

## 📊 DEPLOYMENT TIMELINE

### Total Estimated Time: 2-4 hours

| Phase | Task | Time | Status |
|-------|------|------|--------|
| **Prep** | Update .env values | 15-30 min | ⏳ Pending |
| **Prep** | Store keys securely | 30 min | ⏳ Pending |
| **Prep** | Database setup | 10 min | ⏳ Pending |
| **Deploy** | Apply migrations | 5-10 min | ⏳ Pending |
| **Deploy** | Deploy app code | 10-20 min | ⏳ Pending |
| **Deploy** | Data migration | 30-120 min | ⏳ Pending |
| **Verify** | Verification tests | 10 min | ⏳ Pending |
| **Monitor** | Initial monitoring | 30 min | ⏳ Pending |

---

## 🎯 SUCCESS CRITERIA

### Immediate (During Deployment)
- [ ] All migrations applied successfully
- [ ] Application starts without errors
- [ ] Health check returns 200 OK
- [ ] OTP does NOT appear in logs
- [ ] Data migrations complete

### Day 1 (First 24 Hours)
- [ ] No critical errors in logs
- [ ] All API endpoints responding
- [ ] Users can create visitors with encrypted IDs
- [ ] QR codes use tokens (not PII)
- [ ] Data minimization filtering works
- [ ] No security incidents

### Week 1
- [ ] Retention job executes successfully
- [ ] All new data using encryption
- [ ] Performance metrics stable
- [ ] User feedback positive
- [ ] No rollback required

---

## 🆘 EMERGENCY ROLLBACK

If critical issues occur during deployment:

### Quick Rollback (Code Only)
```bash
# Roll back to a previous ECS task definition
PREV_TASK_DEF=$(aws ecs list-task-definitions \
  --family-prefix secure-gate-task \
  --sort DESC \
  --query 'taskDefinitionArns[1]' \
  --output text)
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-service \
  --task-definition "$PREV_TASK_DEF"

aws ecs wait services-stable \
  --cluster secure-gate-cluster \
  --services secure-gate-service
```

### Database Rollback (If Needed)
```bash
# Restore from backup
psql $DATABASE_URL < backup_pre_security_TIMESTAMP.sql

# Note: This will lose any new data created after backup
```

### Environment Rollback
```bash
# Disable new features temporarily
export FEATURE_ID_ENCRYPTION=false
export FEATURE_QR_TOKENIZATION=false
export FEATURE_DATA_RETENTION=false
export FEATURE_DATA_MINIMIZATION=false

# Restart application (ECS)
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-service \
  --force-new-deployment

aws ecs wait services-stable \
  --cluster secure-gate-cluster \
  --services secure-gate-service
```

---

## 📞 SUPPORT CONTACTS

### During Deployment Window
- **Development Team Lead**: [Contact Info]
- **Database Administrator**: [Contact Info]
- **DevOps Engineer**: [Contact Info]
- **Security Lead**: [Contact Info]

### Escalation Path
1. **Level 1**: Development Team (< 15 min response)
2. **Level 2**: Team Lead (< 30 min response)
3. **Level 3**: CTO/Executive (< 1 hour response)

---

## 📝 POST-DEPLOYMENT TASKS

After successful deployment:

### Immediate (Day 1)
- [ ] Update documentation with production URLs
- [ ] Notify stakeholders of successful deployment
- [ ] Set up monitoring alerts
- [ ] Schedule post-deployment review
- [ ] Document any issues encountered

### Week 1
- [ ] Collect user feedback
- [ ] Review performance metrics
- [ ] Verify all security features working
- [ ] Check retention job execution
- [ ] Create deployment lessons-learned document

### Ongoing
- [ ] Monitor system metrics daily
- [ ] Review security logs weekly
- [ ] Rotate encryption keys quarterly
- [ ] Update dependencies monthly
- [ ] Conduct security audits annually

---

## ✅ COMPLETION CHECKLIST

Before marking deployment as complete:

- [ ] All migrations applied
- [ ] All data migrated
- [ ] All tests passing in production
- [ ] All stakeholders notified
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Keys securely stored
- [ ] Local keys file deleted
- [ ] Backup strategy confirmed
- [ ] Rollback plan tested
- [ ] Post-deployment review scheduled

---

## 📄 RELATED DOCUMENTS

- `PRE_DEPLOYMENT_TODO.md` - Immediate next steps
- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Complete deployment guide
- `DEPLOYMENT_EXECUTIVE_SUMMARY.md` - Executive overview
- `DEPLOYMENT_INTEGRATION_COMPLETE.md` - Technical completion report
- `.env.production` - Production environment config
- `production-keys-*.txt` - Secure keys (DELETE after storing!)

---

**Last Updated**: January 7, 2026  
**Next Review**: After deployment completion  
**Status**: Ready to proceed with remaining tasks

---

*Complete the remaining tasks above, then proceed with deployment following the step-by-step guide.*
