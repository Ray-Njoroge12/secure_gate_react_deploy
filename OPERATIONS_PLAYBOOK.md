# 🎯 DEPLOYMENT OPERATIONS PLAYBOOK

**Secure Gate Access Control System - Backend**  
**Last Updated:** March 20, 2026

---

## 📌 Quick Reference

### Pre-Deployment (Do This First)
```bash
# 1. Verify tests pass
npm run test:critical
Expected: 5 suites, 16 tests → ✅ PASS

# 2. Build application
npm run build
Expected: No errors, /dist created

# 3. Test database migrations (dry run)
npm run db:migrate -- --dry-run
Expected: 92 migrations ready to apply

# 4. Verify configuration
cat .env.production | grep -E "JWT_SECRET|DATABASE_URL|REDIS_URL"
Expected: All required vars present
```

### Deployment (Execute Once)
```bash
# 1. Apply database migrations
npm run db:migrate
Expected: 92 migrations applied successfully

# 2. Deploy to ECS Fargate (AWS)
aws ecs update-service \
  --cluster secure-gate-prod \
  --service secure-gate-api \
  --force-new-deployment
Expected: Service updated, new tasks starting

# 3. Verify health (wait 2 minutes for startup)
curl https://api.secure-gate.com/health
curl https://api.secure-gate.com/health/detailed
Expected: HTTP 200, all checks passing
```

### Post-Deployment (First 24 Hours)
```bash
# 1. Check logs for errors
aws logs tail /aws/ecs/secure-gate-prod --since 1h

# 2. Verify database connectivity
psql -h $RDS_ENDPOINT -U $DB_USER -d secure_gate -c "SELECT version();"

# 3. Test critical endpoints
curl -X POST https://api.secure-gate.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"test"}'

# 4. Check Redis connectivity
redis-cli -h $REDIS_ENDPOINT ping
Expected: PONG
```

---

## 📊 Health Check Endpoints

### Basic Health Check
```bash
GET /health
Response: {"status":"ok","timestamp":"2026-03-20T..."}
Expected: HTTP 200
```

### Detailed Health Check
```bash
GET /health/detailed
Response: {
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-03-20T..."
}
Expected: HTTP 200, all services connected
```

### Readiness Check (K8s)
```bash
GET /health/ready
Response: {"ready":true}
Expected: HTTP 200 when ready to serve traffic
```

---

## 🚨 Incident Response

### Database Connection Lost

**Symptoms:**
- Login failures with "database error"
- CloudWatch shows "ECONNREFUSED"
- /health/detailed shows database: "disconnected"

**Response:**
```bash
# 1. Check RDS instance status
aws rds describe-db-instances \
  --db-instance-identifier secure-gate-prod

# 2. Check connection pooling
# (Should automatically retry)

# 3. If stuck, restart containers
aws ecs update-service \
  --cluster secure-gate-prod \
  --service secure-gate-api \
  --force-new-deployment

# 4. Verify database is running
psql -h $RDS_ENDPOINT -U admin -d postgres \
  -c "SELECT 1;"
```

### High Error Rate (>1%)

**Symptoms:**
- CloudWatch alarms triggered
- Error rate spike in metrics
- Application logs show stack traces

**Response:**
```bash
# 1. Check recent logs
aws logs tail /aws/ecs/secure-gate-prod --since 10m

# 2. Identify error pattern
grep -i "error\|exception" secure-gate-api.log | tail -50

# 3. If critical, rollback
aws ecs update-service \
  --cluster secure-gate-prod \
  --service secure-gate-api \
  --task-definition secure-gate-api:PREVIOUS_REVISION

# 4. Once stable, investigate root cause
# (Check code changes, database state, etc.)
```

### Memory Leak / High Memory Usage

**Symptoms:**
- ECS task memory usage > 80%
- Gradual memory increase over time
- Tasks repeatedly restarting

**Response:**
```bash
# 1. Check memory trend in CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace ECS/ContainerInsights \
  --metric-name MemoryUtilized \
  --start-time 2026-03-19T00:00:00Z \
  --end-time 2026-03-20T00:00:00Z \
  --period 300

# 2. Restart task to recover
aws ecs update-service \
  --cluster secure-gate-prod \
  --service secure-gate-api \
  --force-new-deployment

# 3. Enable detailed memory monitoring
# Contact SE team for memory profiling

# 4. Review recent code changes
git log --oneline -10
```

### WebSocket Connection Issues

**Symptoms:**
- Real-time updates not syncing
- /socket.io connection timeouts
- Guard/resident notifications delayed

**Response:**
```bash
# 1. Check Redis connection
redis-cli -h $REDIS_ENDPOINT \
  CLIENT LIST | grep ESTABLISHED

# 2. Verify Socket.io adapter
# Check logs for: "Socket.io adapter: redis"

# 3. If Redis down, enable fallback
# Single-instance mode (in-memory)

# 4. Restart WebSocket services
aws ecs update-service \
  --cluster secure-gate-prod \
  --service secure-gate-websocket \
  --force-new-deployment
```

### Account Lockout Issues (Post-Fix Verification)

**Verify Fix is Working:**
```bash
# 1. Test lockout response
curl -X POST https://api.secure-gate.com/api/auth/login \
  -d '{"username":"locked@test.com","password":"wrong"}' \
  -w "\nHTTP Status: %{http_code}\n"

# 2. After N failed attempts, should see:
HTTP/1.1 403 Forbidden
{"error":"Account is locked until...","code":"ACCOUNT_LOCKED"}

# 3. NOT the old broken response:
HTTP/1.1 500 Internal Server Error
{"error":"Unexpected error"}
```

---

## 📈 Monitoring & Alerts

### Key Metrics to Monitor
```bash
# CPU Utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300

# Memory Utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300

# Error Count
aws logs insights /aws/ecs/secure-gate-prod \
  --query 'fields @message | filter @message like /ERROR|EXCEPTION/' \
  --time-range 3600 (last hour)
```

### Alert Thresholds
| Alert | Threshold | Action |
|-------|-----------|--------|
| Error Rate | > 1% | Check logs, escalate if > 5% |
| Response Time (p95) | > 500ms | Check database, investigate slow queries |
| Memory Usage | > 80% | Monitor trend, restart if > 90% |
| CPU Utilization | > 70% | Check load, scale if persistent |
| Database Connections | > 18/20 | Investigate connection leaks |
| WebSocket Connections | > Drop 50% | Check Redis, restart if > 90% drop |

---

## 🔄 Scheduled Maintenance

### Daily (Automated)
- ✅ Database backups (automatic RDS snapshots)
- ✅ Log rotation (CloudWatch)
- ✅ Metrics collection (CloudWatch)
- ✅ Health checks (every 30 seconds)

### Weekly (Manual Review)
- Review error logs for patterns
- Check database growth rate
- Verify backup integrity
- Review audit logs for anomalies

### Monthly (Planned Activities)
- Database optimization (VACUUM, ANALYZE)
- Dependency security updates
- Performance review and reporting
- Capacity planning for growth

### Quarterly
- Security assessment
- Compliance audit
- Load testing with increased capacity
- Architecture review

---

## 📞 Escalation Path

### Level 1: Automated Recovery
- ✅ Container restart (auto-healing)
- ✅ Temporary increase connections
- ✅ Session fallback to in-memory
- ✅ Circuit breaker for external services

**Typical Recovery Time:** <5 minutes

### Level 2: On-Call Engineering (Tier 1)
**When:** Alert not auto-recovered after 5 minutes  
**Actions:** Check logs, restart services, verify fix  
**Contact:** Slack #alerts-urgent

**Typical Resolution Time:** <30 minutes

### Level 3: Engineering Lead (Tier 2)
**When:** Issue requires code change or investigation  
**Actions:** Debug, patch, deploy fix  
**Contact:** Escalate through Slack #security-critical

**Typical Resolution Time:** <2 hours

### Level 4: CTO (Critical)
**When:** Data integrity or security issue  
**Actions:** Activate incident response team  
**Contact:** Phone escalation (on-call rotation)

**Typical Resolution Time:** Immediate response + <4 hours fix

---

## 🔐 Security Incident Response

### Account Compromise Detected
```bash
# 1. Verify account lockout is working (just fixed!)
curl -X POST https://api.secure-gate.com/api/auth/login \
  -d '{"username":"compromised@test.com","password":"test"}' \
  -w "\n%{http_code}\n"
# Should return 403 after N failures

# 2. Force password reset
INSERT INTO users (need_password_reset) VALUES (true) 
WHERE email = 'compromised@test.com';

# 3. Revoke all refresh tokens
DELETE FROM refresh_tokens WHERE user_id = $COMPROMISED_USER_ID;

# 4. Audit all activity
SELECT * FROM audit_logs 
WHERE user_id = $COMPROMISED_USER_ID 
ORDER BY created_at DESC 
LIMIT 100;
```

### Potential SQL Injection Detected
```bash
# 1. All queries are parameterized - LOW RISK
grep -r "format\|concatenat\|template.*query" src/

# 2. If found, IMMEDIATELY isolate affected endpoint
# 3. Check audit logs for suspicious queries
# 4. Contact security team for assessment
```

### Unauthorized Cross-Tenant Access
```bash
# 1. Check estate scoping logs
SELECT * FROM audit_logs 
WHERE resource_type = 'visitor' 
AND user_id != $EXPECTED_USER 
AND estate_id NOT IN ($EXPECTED_ESTATES);

# 2. Revoke access
UPDATE users SET role = 'suspended' 
WHERE id IN (...);

# 3. Notify affected estates
# 4. File security incident report
```

---

## 📋 Rollback Procedure

### Quick Rollback (< 5 minutes)
```bash
# Get previous task definition revision
aws ecs describe-task-definition \
  --task-definition secure-gate-api:1 \
  --query 'taskDefinition.revision'

# Deploy previous version
aws ecs update-service \
  --cluster secure-gate-prod \
  --service secure-gate-api \
  --task-definition secure-gate-api:PREVIOUS_REVISION
```

### Database Rollback (if migrations failed)
```bash
# Get latest snapshot
aws rds describe-db-snapshots \
  --db-instance-identifier secure-gate-prod \
  --query 'DBSnapshots[0]'

# Restore from snapshot (creates new instance, then swap)
# WARNING: Data after snapshot is lost
# Contact DBA before proceeding
```

---

## ✅ Pre-Deployment Checklist (Do Before Deploying)

- [ ] All tests passing: `npm run test:critical`
- [ ] Database backups created: Check AWS RDS
- [ ] Rollback plan prepared: Document previous revision
- [ ] Team notified: Slack #deployments
- [ ] On-call engineer scheduled: For first 24 hours
- [ ] Monitoring configured: CloudWatch alarms active
- [ ] Health endpoints verified: All responding
- [ ] Documentation updated: This playbook
- [ ] Load testing approved: Prepared for week 1
- [ ] Incident response team ready: Contact list verified

---

## ✅ Post-Deployment Checklist (Do After Deploying)

- [ ] Health endpoints responding: All HTTP 200
- [ ] CloudWatch metrics flowing: Data visible
- [ ] Logs being collected: Check CloudWatch Logs
- [ ] Database backup running: Check RDS snapshots
- [ ] Monitoring alerts active: Test alert firing
- [ ] Performance baseline: Response times <200ms
- [ ] Error rate stable: < 0.1% of requests
- [ ] Team notified of success: Slack announcement
- [ ] Documentation updated: Add any learnings
- [ ] Schedule post-deployment review: 2-day check-in

---

**Playbook Version:** 1.0  
**Last Updated:** March 20, 2026  
**Next Review:** 30 days post-deployment  

**For questions or updates, contact:** DevOps + Security Engineers

---
