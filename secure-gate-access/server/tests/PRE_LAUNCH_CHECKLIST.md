# Pre-Launch Checklist
## Secure Gate Visitor Management System
**Version:** 1.0  
**Target Launch Date:** _______________

---

## 1. Security Verification ✅

### 1.1 Authentication & Authorization
- [ ] JWT tokens expire correctly (15min access, 7d refresh)
- [ ] Token blacklist working on logout
- [ ] Password hashing uses Argon2id
- [ ] Account lockout after 5 failed attempts
- [ ] Role-based access enforced on all endpoints

### 1.2 Data Security (SEC-001 to SEC-005)
- [x] **SEC-001**: No plaintext OTP in database
- [x] **SEC-002**: Recurring pass PINs hashed with Argon2
- [x] **SEC-003**: PIN validation rate-limited (5 attempts/15min lockout)
- [x] **SEC-004**: QR codes enforce one-time use
- [x] **SEC-005**: PII encryption service ready (AES-256-GCM)

### 1.3 API Security
- [ ] Rate limiting configured on all endpoints
- [ ] CORS properly configured for production domains
- [ ] Helmet.js security headers enabled
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled (if using cookies)

---

## 2. Database Verification

### 2.1 Schema
- [ ] All migrations applied successfully
- [ ] Indexes created for frequently queried columns
- [ ] Foreign key constraints in place
- [ ] Cascading deletes configured correctly

### 2.2 Data Integrity
- [ ] Seed data removed or updated for production
- [ ] Admin accounts have strong passwords
- [ ] No test data in production

### 2.3 Backup & Recovery
- [ ] Automated backups configured
- [ ] Point-in-time recovery tested
- [ ] Backup restoration verified

---

## 3. Kenya DPA 2019 Compliance

### 3.1 Consent Management
- [ ] Registration requires explicit consent
- [ ] Consent timestamp recorded
- [ ] Consent withdrawal functional
- [ ] Consent audit trail in consent_log table

### 3.2 Data Subject Rights
- [ ] Data export endpoint functional
- [ ] Account deletion endpoint functional
- [ ] Data anonymization working
- [ ] Audit logs preserved after deletion

### 3.3 Data Retention
- [ ] Retention policies configured (data_retention_policies table)
- [ ] Auto-cleanup function scheduled
- [ ] Visitor records: 365 days
- [ ] Audit logs: 7 years (2555 days)

### 3.4 Privacy Notice
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie policy (if applicable)
- [ ] Data processing agreement template available

---

## 4. Environment Configuration

### 4.1 Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` - Strong, unique secret
- [ ] `JWT_REFRESH_SECRET` - Separate strong secret
- [ ] `ENCRYPTION_KEY` - 32-byte key for PII encryption
- [ ] `DATABASE_URL` - Production database
- [ ] `REDIS_URL` - Production Redis (if used)

### 4.2 Third-Party Services
- [ ] SMS Provider configured (Africa's Talking)
- [ ] Email Provider configured (Mailgun/SMTP)
- [ ] WhatsApp Business API configured
- [ ] API keys secured (not in code)

### 4.3 SSL/TLS
- [ ] HTTPS enforced
- [ ] Valid SSL certificate installed
- [ ] HTTP redirects to HTTPS
- [ ] HSTS header enabled

---

## 5. Performance Verification

### 5.1 Load Testing Results
- [ ] Morning rush test passed (100 concurrent users)
- [ ] Response time p95 < 1 second
- [ ] Error rate < 1%
- [ ] Database connection pool sized correctly

### 5.2 Optimization
- [ ] Database queries optimized
- [ ] N+1 queries eliminated
- [ ] Caching implemented where needed
- [ ] Static assets compressed

---

## 6. Monitoring & Alerting

### 6.1 Logging
- [ ] Application logs configured
- [ ] Error tracking (Sentry/similar) set up
- [ ] Audit logs writing correctly
- [ ] Log rotation configured

### 6.2 Health Checks
- [ ] `/health` endpoint responding
- [ ] Database health monitored
- [ ] Redis health monitored (if used)

### 6.3 Alerts
- [ ] Server downtime alerts
- [ ] High error rate alerts
- [ ] Security event alerts
- [ ] Failed login alerts (brute force detection)

---

## 7. Deployment Verification

### 7.1 CI/CD Pipeline
- [ ] Build pipeline passing
- [ ] Tests running in CI
- [ ] Deployment automation working
- [ ] Rollback procedure tested

### 7.2 Documentation
- [ ] API documentation up to date
- [ ] Deployment runbook created
- [ ] Incident response plan documented
- [ ] Support contact information updated

---

## 8. Final Sign-Off

| Role | Name | Approved | Date |
|------|------|----------|------|
| Security Lead | | ☐ | |
| QA Lead | | ☐ | |
| DevOps Lead | | ☐ | |
| Product Owner | | ☐ | |
| Estate Management | | ☐ | |

---

## 9. Post-Launch Monitoring (First 72 Hours)

### Hour 0-4
- [ ] Monitor error rates
- [ ] Watch server resource usage
- [ ] Check database connections
- [ ] Verify SMS/email delivery

### Hour 4-24
- [ ] Review first user sessions
- [ ] Check for any reported issues
- [ ] Monitor QR code usage patterns
- [ ] Verify recurring pass validations

### Hour 24-72
- [ ] Analyze usage patterns
- [ ] Review security events
- [ ] Check data export requests
- [ ] Verify backup completion

---

## 10. Rollback Plan

### Triggers for Rollback
- Critical security vulnerability discovered
- Data corruption detected
- Error rate > 5%
- Core functionality broken

### Rollback Steps
1. Stop traffic to new version
2. Switch load balancer to previous version
3. Verify previous version health
4. Investigate root cause
5. Create hotfix if needed
6. Schedule re-deployment
