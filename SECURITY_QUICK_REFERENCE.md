# 🚀 Security Features - Quick Reference Guide

**For**: Development Team, DevOps, System Administrators  
**Last Updated**: January 7, 2026

---

## 📌 Quick Start

### Check Implementation Status
```bash
cd /secure-gate-access/server

# Run all security tests
npm test -- tests/security/

# Check specific feature
npm test -- tests/security/otp-security.test.js
npm test -- tests/security/id-encryption.test.js
npm test -- tests/security/data-retention.test.js
npm test -- tests/security/qr-tokenization.test.js
npm test -- tests/security/data-minimization.test.js
```

### Verify Database Setup
```sql
-- Check encryption columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'visitors' AND column_name LIKE '%encrypted%';

-- Check archive tables
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%_archive';

-- Check QR token mapping
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'qr_token_mapping';

-- Check retention log
SELECT COUNT(*) FROM data_retention_log;
```

### Environment Variables (Required)
```bash
# .env file
NODE_ENV=production
ENCRYPTION_KEY=<64-char-hex>     # openssl rand -hex 32
OTP_DEBUG_ECHO=false
RETENTION_VISITOR_DAYS=90
RETENTION_ACCESS_LOG_DAYS=365
RETENTION_AUDIT_LOG_DAYS=730
RETENTION_ARCHIVE_ENABLED=true
RETENTION_CRON_SCHEDULE=0 2 * * *
QR_TOKEN_EXPIRY_HOURS=24
```

---

## 🔧 Common Tasks

### 1. Generate Encryption Key
```bash
# Generate new 256-bit key
openssl rand -hex 32

# Output format: 64 hexadecimal characters
# Example: a3f5b8c2d1e4f7a9b2c5d8e1f4a7b0c3...
```

### 2. Apply Database Migrations
```bash
# Connect to database
psql $DATABASE_URL

# Apply in order
\i server/src/database/migrations/035_encrypt_id_numbers.sql
\i server/src/database/migrations/037_add_archive_tables.sql
\i server/src/database/migrations/038_add_qr_token_mapping.sql

# Verify
\dt *archive
\d visitors
\d qr_token_mapping
```

### 3. Migrate Existing Data
```bash
cd server

# Encrypt existing ID numbers
node scripts/migrate-id-numbers.js

# Test retention service
node scripts/test-retention.js

# Check results
psql $DATABASE_URL -c "SELECT COUNT(*) FROM visitors WHERE id_number_encrypted IS NOT NULL"
```

### 4. Monitor Retention Scheduler
```bash
# Check scheduler status
curl http://localhost:5000/api/admin/retention/scheduler/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# View retention logs
curl http://localhost:5000/api/admin/retention/logs \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# View retention stats
curl http://localhost:5000/api/admin/retention/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Manual trigger (testing only)
curl -X POST http://localhost:5000/api/admin/retention/execute \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 🐛 Troubleshooting

### Issue: OTP Appearing in Production Logs
```javascript
// Check environment
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('OTP_DEBUG_ECHO:', process.env.OTP_DEBUG_ECHO);

// Verify guard working
const { shouldEchoOtp } = require('./src/controllers/visitorInviteController-optimized.js');
console.log('Will echo OTP?', shouldEchoOtp()); // Should be FALSE in production

// Fix: Ensure NODE_ENV=production is set
export NODE_ENV=production
```

### Issue: Retention Scheduler Not Running
```javascript
// Check scheduler status
const scheduler = require('./src/jobs/retentionScheduler.js');
console.log('Scheduler active?', scheduler.isActive());

// Restart scheduler
scheduler.stopScheduler();
scheduler.startScheduler();

// Check cron expression
console.log('Schedule:', process.env.RETENTION_CRON_SCHEDULE);
// Default: 0 2 * * * (2 AM daily)
```

---

## 📊 Monitoring Queries

### Security Health Check
```sql
-- 1. Check encrypted IDs
SELECT 
  COUNT(*) as total_visitors,
  COUNT(id_number_encrypted) as encrypted_count,
  ROUND(COUNT(id_number_encrypted)::numeric / COUNT(*) * 100, 2) as encryption_percentage
FROM visitors;

-- 2. Check retention status
SELECT 
  data_type,
  COUNT(*) as logs_count,
  MAX(archive_date) as last_run
FROM data_retention_log
GROUP BY data_type;

-- 3. Check QR token usage
SELECT 
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked_count,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_count
FROM qr_token_mapping;
```

---

## 🔐 Security Checklist (Production)

### Pre-Deploy
- [ ] All tests passing (run: `npm test`)
- [ ] Environment variables configured correctly
- [ ] Encryption key generated and stored securely
- [ ] Database migrations applied
- [ ] Backup created

### Deploy
- [ ] Code deployed to production
- [ ] Routes integrated with data minimization middleware
- [ ] Scheduler started automatically
- [ ] No errors in startup logs

### Post-Deploy
- [ ] Smoke test: Create visitor (OTP should NOT appear)
- [ ] Smoke test: View visitors as different roles (fields should differ)
- [ ] Smoke test: Generate QR code (should be token, not PII)
- [ ] Check scheduler status endpoint
- [ ] Monitor logs for 24 hours

---

**Last Updated**: January 7, 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
