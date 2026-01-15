# STAGING ACCESS - QUICK REFERENCE

## 🌐 Staging Base URLs

### Local Staging (Currently Running)
```
Backend API:  http://localhost:5001
Frontend:     http://localhost:3001
MailHog:      http://localhost:8025
```

### Cloud Staging (Deployment Pending)
```
Frontend:     https://securegate-access.netlify.app (✅ LIVE)
Backend API:  https://securegate-api.onrender.com (⚠️ NOT YET DEPLOYED)
```

**Note:** Cloud backend requires completion of Render.com deployment (see DEPLOYMENT_COMPLETE.txt)

---

## 🔐 Staging Credentials

### Admin Account
```
Email:    admin@securegate.com
Password: AdminPass123!
Role:     admin
```

### Resident Account
```
Email:    resident1@securegate.com
Password: ResidentPass123!
Role:     resident
```

### Guard Account
```
Email:    guard1@securegate.com
Password: GuardPass123!
Role:     guard
```

### Get Access Token (API Authentication)
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3001" \
  -d '{
    "email": "admin@securegate.com",
    "password": "AdminPass123!"
  }'
```

**Response includes:** `accessToken` (use in Authorization header as `Bearer <token>`)

---

## 📊 Log Aggregator

### Current Setup: **Local File-Based Logging**

**Access Method:** Docker logs + Local files

#### View Logs in Real-Time
```bash
# All logs (follow mode)
docker logs -f securegate-staging-api

# Filter by error
docker logs securegate-staging-api | grep -i error

# Filter by email events
docker logs securegate-staging-api | grep -i "email\|smtp"

# Filter by request ID (correlation)
docker logs securegate-staging-api | grep "request_id"
```

#### Export Logs
```bash
# Export last 24 hours
docker logs securegate-staging-api --since 24h > staging_logs_$(date +%Y%m%d).log

# Export all logs
docker logs securegate-staging-api > staging_logs_full.log

# Export only JSON-formatted logs
docker logs securegate-staging-api 2>&1 | grep -E '^\{.*\}$' > staging_logs_json.log
```

#### Log File Locations
```
Container path:  /app/logs/
Host path:       ./secure-gate-access/server/logs/

Files:
- app.log       (application logs)
- error.log     (error logs)
- access.log    (HTTP access logs)
- audit.log     (audit trail)
```

### Centralized Logging: **NOT CONFIGURED**

**To Enable (Optional):**

#### Option 1: Grafana Cloud Loki (Free Tier - Recommended)
1. Sign up: https://grafana.com/products/cloud/
2. Get Loki endpoint from Connections → Loki
3. Add to `.env.staging`:
```bash
LOGGING_CENTRALIZATION_ENABLED=true
LOGGING_ENDPOINT=https://logs-prod-us-central1.grafana.net
LOGGING_TYPE=loki
```
4. Restart backend: `docker-compose -f docker-compose.staging.yml restart backend`

**Free Tier:** 50GB logs/month, 14 days retention

#### Option 2: Keep Local Logging Only (Current)
```bash
LOGGING_CENTRALIZATION_ENABLED=false
```
Access via Docker commands above.

---

## 🔍 Quick Health Check

```bash
# Basic health check
curl http://localhost:5001/api/health

# Enhanced health check (includes DB, Redis, email)
curl http://localhost:5001/api/health/enhanced | jq .

# Check all containers
docker-compose -f secure-gate-access/docker-compose.staging.yml ps
```

---

## 📖 Full Documentation

For detailed information, see: `STAGING_ENVIRONMENT_INFO.md`
For manual testing procedures: `MANUAL_TESTING_GUIDE.md`
For email testing: `EMAIL_VERIFICATION_TEST.md`

---

**Quick Summary:**
- ✅ Local staging fully operational at http://localhost:5001
- ✅ Test credentials available (admin/resident/guard)
- ✅ Logs accessible via Docker logs (JSON structured)
- ❌ No centralized log aggregator configured (optional)
- ⚠️ Cloud backend deployment pending (Render.com)
