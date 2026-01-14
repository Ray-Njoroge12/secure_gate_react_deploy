# 🚀 PRODUCTION DEPLOYMENT CHECKLIST

**Date**: January 7, 2026  
**Target**: Production Environment  
**Status**: Ready for Deployment

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Code Quality & Testing
- [x] All unit tests passing (60/60)
- [x] E2E integration tests passing (19/19)
- [x] Code reviewed and approved
- [x] No critical errors in codebase
- [x] Security audit completed
- [ ] Performance testing completed
- [ ] Load testing completed (optional)

### 2. Security Features Implemented
- [x] **Phase 1**: OTP Debug Echo Fix
  - [x] Tests passing (5/5)
  - [x] Code implemented
  - [x] Environment variable configured
  
- [x] **Phase 2**: ID Number Encryption
  - [x] Tests passing (8/8)
  - [x] Migration scripts created
  - [x] Encryption utilities implemented
  - [ ] Encryption key generated for production
  
- [x] **Phase 3**: Data Retention Service
  - [x] Tests passing (20/20)
  - [x] Archive tables migration created
  - [x] Retention service implemented
  - [x] Scheduler integrated
  - [ ] Retention policy configured
  
- [x] **Phase 4**: QR Code Tokenization
  - [x] Tests passing (15/15)
  - [x] Token mapping migration created
  - [x] Token service implemented
  - [x] QR service updated
  - [ ] Migration script ready
  
- [x] **Phase 5**: Role-Based Data Minimization
  - [x] Tests passing (12/12)
  - [x] Middleware implemented
  - [x] Routes integrated
  - [x] Role definitions configured

### 3. Database Readiness
- [ ] Production database created
- [ ] Database credentials secured
- [ ] Connection tested from server
- [ ] Backup strategy in place
- [ ] Migration scripts tested on staging
- [ ] Rollback plan documented

### 4. Environment Configuration
- [ ] Production `.env` file created
- [ ] All required variables set
- [ ] Secrets properly secured (use secret manager)
- [ ] Database URL configured
- [ ] Encryption keys generated
- [ ] OTP_DEBUG_ECHO set to false
- [ ] NODE_ENV set to production

### 5. Documentation
- [x] API documentation up to date
- [x] Security implementation guide complete
- [x] Deployment plan documented
- [x] Migration guide created
- [x] Rollback procedures documented
- [ ] Runbook for operations team
- [ ] Incident response plan

---

## 📋 DEPLOYMENT STEPS

### Step 1: Pre-Deployment Verification
```bash
# Run the readiness check script
cd /secure-gate-access/server
chmod +x scripts/final-deployment-readiness.sh
./scripts/final-deployment-readiness.sh

# Expected: All checks pass or only warnings
```

### Step 2: Database Migrations (CRITICAL - Must be done in order)

#### 2.1 Backup Current Database
```bash
# Create backup before any changes
pg_dump $PRODUCTION_DATABASE_URL > backup_pre_security_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_pre_security_*.sql
```

#### 2.2 Apply Migrations
```bash
# Connect to production database
export DATABASE_URL="your-production-db-url"

# Migration 1: ID Encryption columns
psql $DATABASE_URL -f src/database/migrations/035_encrypt_id_numbers.sql
# Expected: Added columns id_number_encrypted, id_number_encrypted_at

# Migration 2: Archive tables for retention
psql $DATABASE_URL -f src/database/migrations/037_add_archive_tables.sql
# Expected: Created visitors_archive, access_logs_archive, audit_logs_archive

# Migration 3: QR token mapping
psql $DATABASE_URL -f src/database/migrations/038_add_qr_token_mapping.sql
# Expected: Created qr_token_mapping table, indexes

# Verify all migrations
psql $DATABASE_URL -c "\dt" | grep -E "(encrypted|archive|qr_token)"
```

#### 2.3 Verify Schema Changes
```sql
-- Check ID encryption columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'visitors' 
  AND column_name LIKE '%encrypted%';

-- Check archive tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%archive%'
ORDER BY table_name;

-- Check QR token mapping
\d qr_token_mapping
```

### Step 3: Deploy Application Code

#### 3.1 Update Environment Variables
```bash
# Create production .env file (DO NOT commit to git)
cat > .env.production << EOF
NODE_ENV=production

# Database
DATABASE_URL=your-production-database-url

# Security - OTP
OTP_DEBUG_ECHO=false

# Security - ID Encryption (GENERATE NEW KEY!)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Security - Data Retention
RETENTION_VISITOR_DAYS=90
RETENTION_ACCESS_LOG_DAYS=365
RETENTION_AUDIT_LOG_DAYS=730
RETENTION_ARCHIVE_ENABLED=true
RETENTION_CRON_SCHEDULE=0 2 * * *

# Security - QR Tokens
QR_TOKEN_EXPIRY_HOURS=24

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Other configs...
EOF

# Verify critical settings
grep -E "(OTP_DEBUG_ECHO|ENCRYPTION_KEY|NODE_ENV)" .env.production
```

#### 3.2 Deploy Code
```bash
# If using Git deployment (e.g., Render, Heroku)
git add .
git commit -m "Deploy security features to production"
git push production main

# If using Docker
docker build -t secure-gate-api:latest .
docker push your-registry/secure-gate-api:latest
docker pull your-registry/secure-gate-api:latest
docker-compose up -d

# If using manual deployment
npm install --production
pm2 restart all
```

### Step 4: Data Migration (For Existing Data)

#### 4.1 Migrate ID Numbers
```bash
# Run ID encryption migration
node scripts/migrate-id-numbers.js

# Expected output:
# ✅ Found X visitors with unencrypted ID numbers
# ✅ Successfully migrated X ID numbers
# ✅ Verification: X/X records encrypted
```

#### 4.2 Generate QR Tokens
```bash
# Run QR code migration
node scripts/migrate-qr-codes.js

# Expected output:
# ✅ Found X visitors needing token generation
# ✅ Successfully migrated X visitors
# ✅ Tokens created: X
```

### Step 5: Verify Deployment

#### 5.1 Health Checks
```bash
# Check server is running
curl https://your-production-url/health

# Check database connection
curl https://your-production-url/api/health/db

# Check scheduler status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-production-url/api/admin/retention/scheduler/status
```

#### 5.2 Feature Verification
```bash
# Test OTP generation (should NOT echo OTP)
curl -X POST https://your-production-url/api/visitors/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'
# Expected: Success, but NO OTP in response

# Test QR token generation
curl -H "Authorization: Bearer $RESIDENT_TOKEN" \
  -X POST https://your-production-url/api/visitors \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "phone": "+1234567890", ...}'
# Expected: QR code with token, not full visitor data

# Test data minimization
curl -H "Authorization: Bearer $GUARD_TOKEN" \
  https://your-production-url/api/visitors/active
# Expected: Only fields relevant to guard role
```

#### 5.3 Log Monitoring
```bash
# Monitor application logs
tail -f logs/app.log | grep -i error

# Check for security issues
grep -i "otp.*echo\|encryption.*fail\|token.*invalid" logs/app.log

# Monitor scheduler
grep "retention" logs/app.log
```

### Step 6: Post-Deployment Tasks

#### 6.1 Enable Retention Scheduler
```bash
# Verify scheduler is running
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-production-url/api/admin/retention/scheduler/status

# Manually trigger retention (test)
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://your-production-url/api/admin/retention/execute
```

#### 6.2 Set Up Monitoring Alerts
```yaml
# Configure alerts for:
alerts:
  - name: OTP Echo Detection
    condition: logs contain "OTP_DEBUG_ECHO=true"
    severity: CRITICAL
    
  - name: Encryption Failures
    condition: logs contain "encryption error"
    severity: HIGH
    
  - name: Token Validation Failures
    condition: token_validation_failures > 100/hour
    severity: MEDIUM
    
  - name: Retention Job Failures
    condition: retention_job_status = "failed"
    severity: MEDIUM
```

#### 6.3 Create Database Backup Schedule
```bash
# Set up daily backups
crontab -e

# Add:
0 3 * * * pg_dump $DATABASE_URL > /backups/db_$(date +\%Y\%m\%d).sql
0 4 * * * find /backups -name "db_*.sql" -mtime +30 -delete
```

---

## 🔄 ROLLBACK PROCEDURES

### If Critical Issues Occur:

#### 1. Quick Rollback (Revert Code)
```bash
# Revert to previous deployment
git revert HEAD
git push production main

# Or restore previous Docker image
docker pull your-registry/secure-gate-api:previous-tag
docker-compose up -d
```

#### 2. Database Rollback (If Needed)
```bash
# Restore from backup
psql $DATABASE_URL < backup_pre_security_TIMESTAMP.sql

# Or drop new columns (NOT RECOMMENDED - data loss)
psql $DATABASE_URL << EOF
ALTER TABLE visitors DROP COLUMN IF EXISTS id_number_encrypted CASCADE;
ALTER TABLE visitors DROP COLUMN IF EXISTS id_number_encrypted_at CASCADE;
DROP TABLE IF EXISTS qr_token_mapping CASCADE;
DROP TABLE IF EXISTS visitors_archive CASCADE;
DROP TABLE IF EXISTS access_logs_archive CASCADE;
DROP TABLE IF EXISTS audit_logs_archive CASCADE;
EOF
```

#### 3. Environment Rollback
```bash
# Disable features via environment
export OTP_DEBUG_ECHO=true  # Re-enable echo (NOT for prod!)
export RETENTION_ARCHIVE_ENABLED=false  # Disable retention
# Restart services
```

---

## 📊 MONITORING & SUCCESS METRICS

### Day 1 (Immediate Post-Deployment)
- [ ] No critical errors in logs
- [ ] All API endpoints responding
- [ ] Database queries performing well
- [ ] No user-reported issues
- [ ] Retention scheduler running

### Week 1
- [ ] ID encryption working for all new visitors
- [ ] QR tokens validating correctly
- [ ] Data minimization filtering properly
- [ ] Retention job completing successfully
- [ ] No security incidents

### Month 1
- [ ] All legacy data migrated
- [ ] Performance metrics stable
- [ ] Security audit passed
- [ ] User satisfaction maintained
- [ ] Data retention working as expected

### Success Metrics
```javascript
{
  // Security
  otp_exposures: 0,  // MUST be 0
  encryption_errors: < 0.01%,
  token_validation_success: > 99%,
  
  // Performance
  encryption_overhead: < 10ms,
  token_lookup_time: < 5ms,
  retention_job_duration: < 1hr,
  
  // Data
  encrypted_ids_percentage: 100%,
  archived_records: > 0,
  tokens_active: > 0
}
```

---

## 📞 SUPPORT & ESCALATION

### Issues During Deployment

**Critical (P0)**: System down, data breach, security vulnerability
- **Action**: Immediate rollback
- **Contact**: CTO, Security Lead
- **Response Time**: < 15 minutes

**High (P1)**: Feature not working, performance degradation
- **Action**: Investigate, apply hotfix or rollback
- **Contact**: Development Team Lead
- **Response Time**: < 1 hour

**Medium (P2)**: Minor bugs, cosmetic issues
- **Action**: Create ticket, fix in next release
- **Contact**: Development Team
- **Response Time**: < 24 hours

### Post-Deployment Support

**Week 1**: Daily monitoring and check-ins  
**Week 2-4**: Active monitoring, bi-weekly reviews  
**Month 2+**: Standard monitoring, monthly reviews

---

## ✅ SIGN-OFF

### Pre-Deployment Approval

- [ ] **Development Lead**: Code complete and tested
- [ ] **Security Lead**: Security features verified
- [ ] **QA Lead**: All tests passing
- [ ] **DevOps Lead**: Infrastructure ready
- [ ] **Product Owner**: Features approved

### Post-Deployment Verification

- [ ] **Development Lead**: Deployment successful
- [ ] **Security Lead**: Security features active
- [ ] **Operations**: Monitoring in place
- [ ] **Product Owner**: System operational

**Deployment Date**: _________________  
**Deployed By**: _________________  
**Verified By**: _________________

---

## 📝 NOTES

### Lessons Learned
_Document any issues encountered during deployment_

### Improvements for Next Time
_Suggestions for future deployments_

### Outstanding Items
_Any follow-up tasks or technical debt_

---

**Document Version**: 1.0  
**Last Updated**: January 7, 2026  
**Next Review**: After deployment
