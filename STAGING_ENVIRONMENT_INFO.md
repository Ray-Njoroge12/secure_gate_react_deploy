# Secure Gate Access - Staging Environment Information

**Generated:** January 15, 2026  
**Status:** ✅ Operational

---

## 🌐 Staging URLs

### Frontend (Live)
- **URL:** https://securegate-access.netlify.app
- **Platform:** Netlify
- **Status:** ✅ DEPLOYED AND LIVE
- **Build:** Production build from main branch

### Backend API
- **Expected URL:** https://securegate-api.onrender.com
- **Platform:** Render.com
- **Status:** ⚠️ PENDING DEPLOYMENT
- **Region:** Frankfurt (closest to Africa)

**Note:** The backend is configured in `render.yaml` but requires manual deployment completion on Render dashboard.

### Local Staging (Docker)
- **Backend API:** http://localhost:5001
- **Frontend:** http://localhost:3001
- **Database:** PostgreSQL on port 5433
- **Redis:** Port 6379
- **MailHog UI:** http://localhost:8025

---

## 🔐 Staging Credentials

### Test User Accounts (Seeded Data)

The following credentials are seeded in the staging database via `server/scripts/seed.js`:

#### 1. Admin Account
```
Email: admin@securegate.com
Password: AdminPass123!
Role: admin
Phone: +254700000000
Status: Verified
```

**Permissions:**
- Full system access
- User management
- Estate management
- System configuration
- Audit log access
- Data retention management

#### 2. Resident Account
```
Email: resident1@securegate.com
Password: ResidentPass123!
Role: resident
Phone: +254711111111
House: A-101
Area: General
Status: Verified
```

**Permissions:**
- Invite visitors
- View own visitor history
- Manage visitor invites
- Update profile

#### 3. Guard Account
```
Email: guard1@securegate.com
Password: GuardPass123!
Role: guard
Phone: +254722222222
Area: Gate 1
House: SECURITY
Status: Verified
```

**Permissions:**
- View visitor check-ins
- Verify visitor OTPs
- Log visitor entries/exits
- View active visitors

### API Authentication

**To get an access token:**

```bash
# Login as Admin
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3001" \
  -d '{
    "email": "admin@securegate.com",
    "password": "AdminPass123!"
  }'

# Response includes:
# - accessToken (JWT, expires in 15 minutes)
# - refreshToken (JWT, expires in 7 days)
# - user object with role and permissions
```

**Use the token in subsequent requests:**

```bash
curl http://localhost:5001/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Origin: http://localhost:3001"
```

---

## 📊 Log Aggregation and Observability

### Current Configuration

**Logging Type:** Local file-based + JSON structured logging  
**Centralized Logging:** ❌ Disabled (not configured)  
**Log Format:** JSON structured logs  
**Log Level:** `info`

### Local Staging Logs

#### 1. Container Logs (Real-time)
```bash
# View all backend logs
docker logs -f securegate-staging-api

# Filter for specific events
docker logs securegate-staging-api | grep -i "error"
docker logs securegate-staging-api | grep -i "email"
docker logs securegate-staging-api | grep "request_id"

# View recent logs
docker logs --tail=100 securegate-staging-api
```

#### 2. Log File Locations

**Inside Container:**
```
/app/logs/app.log          # Application logs
/app/logs/error.log        # Error logs
/app/logs/access.log       # HTTP access logs
/app/logs/audit.log        # Audit trail logs
```

**On Host (Volume Mount):**
```
./secure-gate-access/server/logs/
```

#### 3. Export Logs

**Export recent logs to file:**
```bash
# Export last 24 hours of logs
docker logs securegate-staging-api --since 24h > staging_logs_$(date +%Y%m%d).log

# Export all logs
docker logs securegate-staging-api > staging_logs_full.log

# Export JSON-formatted logs only
docker logs securegate-staging-api 2>&1 | grep -E '^\{.*\}$' > staging_logs_json.log
```

### Observability Features

#### Request Correlation
Every API request includes a unique `request_id` (correlation ID):

```bash
# Track a specific request through the system
docker logs securegate-staging-api | grep "abc-123-request-id"
```

**Log Format:**
```json
{
  "timestamp": "2026-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "User login successful",
  "metadata": {
    "service": "app",
    "userId": 1,
    "email": "admin@securegate.com",
    "correlationId": "abc-123-request-id",
    "request_id": "abc-123-request-id"
  }
}
```

#### Health Monitoring
```bash
# Check system health
curl http://localhost:5001/api/health

# Enhanced health check (includes DB, Redis, email status)
curl http://localhost:5001/api/health/enhanced
```

#### Metrics Endpoints
```bash
# Application metrics (if Prometheus is enabled)
curl http://localhost:5001/metrics
```

### Setting Up Centralized Logging (Optional)

The system supports integration with the following log aggregators:

#### Option 1: Grafana Cloud Loki (Recommended - Free Tier Available)

1. **Sign up:** https://grafana.com/products/cloud/
2. **Get credentials:** Navigate to Connections → Loki
3. **Configure environment variables:**

```bash
# Add to .env.staging or docker-compose.staging.yml
LOGGING_CENTRALIZATION_ENABLED=true
LOGGING_ENDPOINT=https://logs-prod-us-central1.grafana.net
LOGGING_TYPE=loki
```

4. **Access Grafana Dashboard:**
   - URL: Your Grafana Cloud instance
   - Use Explore → Loki to query logs
   - Example query: `{job="securegate-api"} |= "error"`

**Free Tier:** 50GB logs/month, 14 days retention

#### Option 2: ELK Stack (Elasticsearch, Logstash, Kibana)

```bash
LOGGING_CENTRALIZATION_ENABLED=true
LOGGING_ENDPOINT=http://elasticsearch:9200
LOGGING_TYPE=elk
```

#### Option 3: Keep Local Logging Only

Current configuration (default):
```bash
LOGGING_CENTRALIZATION_ENABLED=false
```

Logs are available via:
- Docker logs: `docker logs securegate-staging-api`
- Log files in `./server/logs/` directory
- Render.com log viewer (when deployed to Render)

---

## 🔧 Staging Environment Variables

### Currently Configured (Local Staging)

```bash
# Environment
NODE_ENV=staging
PORT=5001

# Database
PGHOST=postgres
PGPORT=5432
PGUSER=postgres
PGPASSWORD=staging_password_change_me
PGDATABASE=secure_gate_staging

# Security
JWT_SECRET=staging-jwt-secret-min-32-chars-change-in-production-environment
JWT_REFRESH_SECRET=staging-refresh-secret-min-32-chars-change-in-production

# Email (MailHog)
EMAIL_VERIFICATION_REQUIRED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=mailhog
SMTP_PORT=1025
EMAIL_FROM=noreply@securegate.local

# Observability
LOG_LEVEL=info
ENABLE_CORRELATION_ID=true
ENABLE_ENHANCED_HEALTH=true
ENABLE_METRICS=true
ENABLE_ERROR_MONITORING=true

# CORS
CORS_ORIGIN=http://localhost:3001
CLIENT_ORIGIN=http://localhost:3001
```

### For Render.com Deployment

**Required Secrets (set in Render Dashboard):**
- `JWT_SECRET` - Generate: `openssl rand -hex 32`
- `JWT_REFRESH_SECRET` - Generate: `openssl rand -hex 32`
- `SESSION_SECRET` - Generate: `openssl rand -hex 32`
- `AT_API_KEY` - Africa's Talking API key
- `MAILGUN_API_KEY` - Mailgun API key
- Database credentials (auto-populated by Render PostgreSQL)

---

## 📖 Quick Start Testing

### 1. Start Local Staging
```bash
cd secure-gate-access
docker-compose -f docker-compose.staging.yml up -d
```

### 2. Verify Services
```bash
# Check container status
docker-compose -f docker-compose.staging.yml ps

# Check backend health
curl http://localhost:5001/api/health | jq .

# Check MailHog (email testing)
open http://localhost:8025
```

### 3. Login as Admin
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3001" \
  -d '{
    "email": "admin@securegate.com",
    "password": "AdminPass123!"
  }' | jq .
```

### 4. Run Automated Tests
```bash
# Quick validation test
./quick-test.sh

# Full manual testing guide
cat MANUAL_TESTING_GUIDE.md

# Email verification testing
cat EMAIL_VERIFICATION_TEST.md
```

### 5. View Logs
```bash
# Real-time logs
docker logs -f securegate-staging-api

# Search for errors
docker logs securegate-staging-api | grep -i error

# Export logs
docker logs securegate-staging-api > staging_test_logs.log
```

---

## 🔗 Related Documentation

- **Manual Testing Guide:** `MANUAL_TESTING_GUIDE.md`
- **Email Verification Testing:** `EMAIL_VERIFICATION_TEST.md`
- **Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Render Environment Setup:** `RENDER_ENVIRONMENT_SETUP.md`
- **Deployment Complete Info:** `DEPLOYMENT_COMPLETE.txt`

---

## 📞 Support & Access

### Render.com Dashboard
- **URL:** https://dashboard.render.com
- **Repository:** Ray-Njoroge12/secure_gate_react_deploy
- **Branch:** main

### Netlify Dashboard
- **Frontend:** https://app.netlify.com
- **Site:** securegate-access

### Database Access (Local Staging)
```bash
# Connect to PostgreSQL
docker exec -it securegate-staging-db psql -U postgres -d secure_gate_staging

# Run SQL queries
\dt                          # List tables
SELECT * FROM users;         # View users
SELECT * FROM visitors LIMIT 10;  # View recent visitors
```

---

## ⚠️ Important Notes

1. **Staging Credentials:** The credentials listed above are for testing only. Never use in production.

2. **Local vs Cloud Staging:**
   - **Local:** http://localhost:5001 (Docker-based, fully operational)
   - **Cloud:** https://securegate-api.onrender.com (requires deployment completion)

3. **Email Testing:** 
   - Local staging uses MailHog (http://localhost:8025)
   - Cloud staging uses Mailgun (configured in render.yaml)

4. **Log Retention:** 
   - Local logs are ephemeral (lost when containers restart)
   - For persistent logging, configure Grafana Loki or export logs regularly

5. **Security:**
   - All staging secrets should be rotated for production
   - Disable test user accounts in production
   - Enable email verification in production

---

**Last Updated:** January 15, 2026  
**Maintained By:** Secure Gate Development Team
