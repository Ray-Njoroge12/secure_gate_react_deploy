# 🚀 Production Deployment Runbook

**Version**: 2.0  
**Last Updated**: November 21, 2025  
**Status**: Production Ready (96%)  
**Estimated Time**: 6-8 hours (first deployment), 2-3 hours (subsequent)

---

## Pre-Deployment Checklist

### Code & Configuration

- [ ] All env files consolidated (✅ COMPLETE)
- [ ] Secrets migrated to `.env.local` (gitignored)
- [ ] AWS Secrets Manager naming fixed (✅ COMPLETE)
- [ ] Service feature flags wired (✅ COMPLETE)
- [ ] Migration script updated (✅ COMPLETE)
- [ ] All tests passing in development
- [ ] No secrets in git (verify with `git grep -i "password\|secret\|api.*key"`)

### Infrastructure

- [ ] AWS account access confirmed
- [ ] ALB exists and accessible
- [ ] RDS PostgreSQL running
- [ ] Redis/ElastiCache provisioned
- [ ] Domain registered (api.securegate.com)
- [ ] DNS access (Route 53 or external)

### Team

- [ ] DevOps lead assigned
- [ ] Backend engineer on call
- [ ] Frontend engineer on call
- [ ] Rollback plan reviewed
- [ ] Post-deployment monitoring plan ready

---

## Phase 1: Pre-Production Setup (2-3 hours)

### 1.1 Configure HTTPS on ALB

**Objective**: Enable TLS/SSL termination at load balancer

**Time**: 2-4 hours (includes cert validation)

**Steps**:

```bash
# See: deployment/HTTPS_ALB_SETUP_GUIDE.md

# 1. Request ACM certificate
aws acm request-certificate \
  --domain-name api.securegate.com \
  --validation-method DNS \
  --region af-south-1

# 2. Add DNS validation records (wait 5-30 min)

# 3. Add HTTPS listener (port 443)

# 4. Configure HTTP→HTTPS redirect (port 80)

# 5. Verify
curl -I https://api.securegate.com/health
```

**Validation**:
- ✅ HTTPS endpoint returns 200
- ✅ Valid SSL certificate
- ✅ HTTP redirects to HTTPS
- ✅ HSTS header present

---

### 1.2 Migrate Secrets to AWS Secrets Manager

**Objective**: Move all secrets from .env.local to AWS SM

**Time**: 1-2 hours

**Steps**:

```bash
# See: deployment/SECRET_ROTATION_GUIDE.md

cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server

# 1. Verify .env.local has all secrets
cat .env.local | grep -E "JWT_SECRET|PGPASSWORD|REDIS_PASSWORD|MAILGUN|AT_API_KEY"

# 2. Run migration script
ENV_FILE=.env.local \
SECRETS_PREFIX=secure-gate \
AWS_REGION=af-south-1 \
./migrate-secrets-to-aws.sh

# 3. Verify secrets in AWS
aws secretsmanager list-secrets --region af-south-1 | grep secure-gate

# 4. Test retrieval
aws secretsmanager get-secret-value \
  --secret-id secure-gate/jwt-secret \
  --region af-south-1
```

**Validation**:
- ✅ All 8 secrets in AWS SM
- ✅ Secrets retrievable
- ✅ Verification passed

---

### 1.3 Rotate Exposed Secrets

**Objective**: Replace any secrets that were in example files

**Time**: 30-60 minutes

**Secrets to Rotate**:
1. Mailgun API key (was in `.env.test.example`)
2. Africa's Talking API key (was in `.env.production.example`)
3. JWT secrets (reused across environments)

**Steps**:

```bash
# See: deployment/SECRET_ROTATION_GUIDE.md

# 1. Generate new Mailgun key
# (Mailgun dashboard → Security → API Keys)

# 2. Update in AWS
aws secretsmanager update-secret \
  --secret-id secure-gate/mailgun-api-key \
  --secret-string "<new-key>" \
  --region af-south-1

# 3. Repeat for AT API key

# 4. Generate new JWT secrets
NEW_JWT_SECRET=$(openssl rand -base64 48)
aws secretsmanager update-secret \
  --secret-id secure-gate/jwt-secret \
  --secret-string "$NEW_JWT_SECRET" \
  --region af-south-1
```

**Validation**:
- ✅ All exposed secrets rotated
- ✅ New secrets in AWS SM
- ✅ Old secrets revoked in provider dashboards

---

## Phase 2: Staging Deployment (1-2 hours)

### 2.1 Deploy to Staging Environment

**Objective**: Test full stack with AWS Secrets Manager

**Steps**:

```bash
# 1. Update staging environment variables
export NODE_ENV=staging
export SECRETS_PREFIX=secure-gate
export AWS_REGION=af-south-1
export PORT=5000

# 2. Build and deploy backend
cd server
npm install --production
pm2 start ecosystem.config.js --env staging

# OR using Docker
docker build -t secure-gate-server:staging .
docker run -d \
  -e NODE_ENV=staging \
  -e SECRETS_PREFIX=secure-gate \
  -e AWS_REGION=af-south-1 \
  -p 5000:5000 \
  secure-gate-server:staging

# 3. Deploy frontend to staging (Netlify)
cd ../client
npm run build
# Upload to staging site

# 4. Update staging frontend env
# REACT_APP_API_URL=https://staging-api.securegate.com
```

**Validation**:
```bash
# Run test suite
cd ../deployment
bash run-post-env-tests.sh staging https://staging-api.securegate.com

# Manual checks:
# 1. Health endpoint
curl https://staging-api.securegate.com/health

# 2. Secrets loaded from AWS
# Check logs for: "✅ Secrets loaded successfully from AWS"

# 3. Login flow
curl -X POST https://staging-api.securegate.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# 4. CORS from staging frontend
# Open https://staging.securegate.com and test login
```

**Checklist**:
- [ ] Server starts successfully
- [ ] Secrets loaded from AWS (no fallback)
- [ ] Database connected
- [ ] Redis connected
- [ ] CORS allows staging frontend
- [ ] Auth flow works end-to-end
- [ ] Feature flags honored

---

### 2.2 Staging Smoke Tests

**Time**: 30 minutes

```bash
# See: deployment/POST_ENV_TESTING_SUITE.md

# Test matrix:
# 1. Visitor registration & OTP
# 2. Resident login & approval
# 3. Guard check-in/check-out
# 4. Admin dashboard access
# 5. Webhook delivery (if enabled)
# 6. Email notification (if enabled)
# 7. SMS notification (if enabled)
```

**Go/No-Go Decision**:
- ✅ All critical paths working → Proceed to production
- ❌ Any failures → Fix and redeploy to staging

---

## Phase 3: Production Deployment (2-3 hours)

### 3.1 Final Pre-Production Checks

**Time**: 15 minutes

```bash
# 1. Verify production secrets exist
aws secretsmanager list-secrets \
  --region af-south-1 \
  | grep "secure-gate/"

# 2. Verify HTTPS working
curl -I https://api.securegate.com/health

# 3. Verify database backup recent
aws rds describe-db-snapshots \
  --db-instance-identifier securegate-prod \
  --region af-south-1 \
  | jq '.DBSnapshots[0].SnapshotCreateTime'

# 4. Verify current deployment version
curl https://api.securegate.com/api/version
```

---

### 3.2 Database Migrations

**Time**: 10-15 minutes

```bash
cd server

# 1. Backup database first
pg_dump -h <rds-endpoint> -U postgres securegate > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations
NODE_ENV=production npm run migrate

# 3. Verify migrations
psql -h <rds-endpoint> -U postgres securegate \
  -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"
```

---

### 3.3 Deploy Backend

**Time**: 30-45 minutes

```bash
# Option A: ECS/Fargate
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-server \
  --force-new-deployment \
  --region af-south-1

# Option B: EC2 with PM2
ssh ec2-user@<production-server>
cd /opt/secure-gate/server
git pull origin main
npm install --production
pm2 restart ecosystem.config.js --env production

# Option C: Docker
docker build -t secure-gate-server:v2.0 .
docker tag secure-gate-server:v2.0 <ECR-REPO>:v2.0
docker push <ECR-REPO>:v2.0

# Update task definition with new image
aws ecs register-task-definition \
  --cli-input-json file://task-def.json

# Update service
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-server \
  --task-definition secure-gate-server:v2.0
```

**Monitor Deployment**:
```bash
# Watch logs
aws logs tail /aws/ecs/secure-gate-server --follow

# Check for:
# ✅ "Secrets loaded successfully from AWS"
# ✅ "Database connection established"
# ✅ "Redis connected"
# ✅ "Server started on port 5000"
```

---

### 3.4 Deploy Frontend

**Time**: 15-20 minutes

```bash
cd client

# 1. Update production API URL
# .env.production: REACT_APP_API_URL=https://api.securegate.com

# 2. Build
npm run build

# 3. Deploy to Netlify
netlify deploy --prod --dir=build

# OR using Netlify CLI
netlify deploy --prod
```

**Validation**:
```bash
# 1. Check deployment
curl -I https://secure-gate.netlify.app

# 2. Verify API URL in bundle
curl https://secure-gate.netlify.app/static/js/main.*.js | grep "api.securegate.com"
```

---

### 3.5 Post-Deployment Verification

**Time**: 30-45 minutes

```bash
# Run full test suite
cd deployment
bash run-post-env-tests.sh production https://api.securegate.com

# Manual verification:
# 1. Open https://secure-gate.netlify.app
# 2. Test visitor registration
# 3. Test resident login
# 4. Test admin dashboard
# 5. Verify HTTPS in browser (lock icon)
# 6. Check cookies (DevTools → Application → Cookies)
#    - accessToken: Secure ✅, HttpOnly ✅
#    - refreshToken: Secure ✅, HttpOnly ✅
```

**Health Checks**:
```bash
# API health
curl https://api.securegate.com/health
# Expected: {"status":"healthy","uptime":...}

# Database health
curl https://api.securegate.com/api/admin/health/database \
  -H "Authorization: Bearer <admin-token>"

# Redis health
curl https://api.securegate.com/api/admin/health/redis \
  -H "Authorization: Bearer <admin-token>"
```

---

## Phase 4: Monitoring & Observation (24-48 hours)

### 4.1 Set Up Monitoring

```bash
# CloudWatch Alarms
aws cloudwatch put-metric-alarm \
  --alarm-name secure-gate-5xx-errors \
  --alarm-description "Backend 5xx errors"  \
  --metric-name 5xxErrors \
  --namespace AWS/ECS \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions <SNS-TOPIC-ARN>

# Add alarms for:
# - CPU usage > 80%
# - Memory usage > 85%
# - Request latency > 1s
# - Database connections > 90%
```

### 4.2 Monitor Logs

```bash
# Application logs
aws logs tail /aws/ecs/secure-gate-server --follow

# Watch for errors:
grep -i "error\|fail\|exception" logs/app.log

# Monitor auth failures:
grep "AUTH_FAILED" logs/audit.log | tail -20
```

### 4.3 Performance Metrics

```bash
# Request rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=<ALB-NAME> \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Response times
# Target: P50 < 200ms, P99 < 1000ms

# Error rates
# Target: < 0.1% error rate
```

---

## Phase 5: Post-Deployment Tasks

### 5.1 Update Documentation

- [ ] Update API documentation with new base URL
- [ ] Update deployment wiki
- [ ] Document any issues encountered
- [ ] Update rotation log with deployment date

### 5.2 Communication

```markdown
**Subject**: Production Deployment Complete - Secure Gate v2.0

Team,

Production deployment completed successfully at <timestamp>.

**Changes**:
- ✅ HTTPS enabled on ALB
- ✅ Secrets migrated to AWS Secrets Manager
- ✅ Service feature flags implemented
- ✅ Environment files consolidated

**Verification**:
- All health checks passing
- Auth flows working
- Zero downtime deployment
- Performance within SLA

**Monitoring**:
- 24/48 hour observation period
- On-call: <engineer-name>
- Escalation: <manager-name>

**Known Issues**: None

**Rollback Plan**: Available if needed (see runbook)

Thanks,
DevOps Team
```

---

## Rollback Procedures

### When to Rollback

- 5xx error rate > 5%
- Critical feature broken (auth, database)
- Performance degradation > 50%
- Security vulnerability discovered

### Rollback Steps

```bash
# 1. Revert backend to previous version
aws ecs update-service \
  --cluster secure-gate-cluster \
  --service secure-gate-server \
  --task-definition secure-gate-server:v1.9 \
  --region af-south-1

# 2. Revert frontend
netlify deploy --prod --alias=previous-version

# 3. Verify rollback
curl https://api.securegate.com/api/version
# Expected: Previous version number

# 4. Monitor for stability
# Watch logs for 30 minutes

# 5. Communicate rollback
# Send team notification

# 6. Post-mortem
# Document what went wrong and how to prevent
```

---

## Success Criteria

### Deployment Successful If:

- [ ] HTTPS working with valid certificate
- [ ] All secrets loaded from AWS (no env fallback)
- [ ] Health endpoints return 200
- [ ] Auth flows work from production frontend
- [ ] CORS allows production origin
- [ ] Feature flags honored
- [ ] Database queries successful
- [ ] Redis operations successful
- [ ] Error rate < 0.1%
- [ ] Response times within SLA (P99 < 1s)
- [ ] No security warnings in browser
- [ ] Cookies have Secure flag
- [ ] Audit logs being created
- [ ] Zero downtime achieved

---

## Post-Deployment Checklist

### Immediate (0-2 hours)

- [ ] All health checks passing
- [ ] Smoke tests completed
- [ ] No critical errors in logs
- [ ] Performance metrics baseline established
- [ ] Monitoring dashboards updated

### Short-term (2-24 hours)

- [ ] No user-reported issues
- [ ] Error rate stable
- [ ] Response times acceptable
- [ ] No memory leaks detected
- [ ] Secrets rotation scheduled

### Long-term (1-7 days)

- [ ] Performance SLA met
- [ ] Security audit passed
- [ ] User acceptance confirmed
- [ ] Documentation updated
- [ ] Next deployment planned

---

## Contact Information

**On-Call Engineer**: <name> (<phone>)  
**Escalation**: <manager> (<phone>)  
**AWS Support**: <account-support-number>  
**Emergency**: 911 / <security-team>

---

**Deployment Status**: Ready for Production  
**Next Review**: <date>  
**Version**: 2.0  
**Last Updated**: November 21, 2025
