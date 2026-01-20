# 🚀 Quick Start: Production Deployment

**Last Updated**: January 7, 2026  
**Status**: Ready for Deployment  
**Estimated Time**: 2-4 hours

---

## 📋 Before You Start

### Prerequisites Checklist
- [ ] Production database created and accessible
- [ ] SMTP/email service credentials ready
- [ ] Twilio credentials ready (for SMS)
- [ ] Domain/hosting platform configured
- [ ] SSL/TLS certificates ready
- [ ] Secrets manager access (AWS Secrets Manager, Vault, etc.)
- [ ] Backup strategy planned

### What You'll Need
1. **Database URL**: `postgresql://user:password@host:port/dbname`
2. **SMTP Credentials**: Host, port, username, password
3. **Twilio Credentials**: Account SID, Auth Token, Phone Number
4. **Frontend Domain**: For CORS configuration
5. **Secrets Manager**: To store encryption keys and secrets

---

## 🎯 Three Ways to Deploy

### Option 1: Interactive Wizard (Recommended)
**Best for**: First-time deployment, step-by-step guidance

```bash
cd secure-gate-access/server
./scripts/production-deployment-wizard.sh
```

The wizard will:
- ✅ Check all prerequisites
- ✅ Guide you through configuration
- ✅ Manage secrets securely
- ✅ Apply database migrations
- ✅ Run tests
- ✅ Deploy the application
- ✅ Verify deployment

**Time**: 2-3 hours (including setup)

---

### Option 2: Manual Deployment (Advanced)
**Best for**: Experienced users who know their setup

```bash
cd secure-gate-access/server

# 1. Update environment
nano .env.production

# 2. Run readiness check
./scripts/final-deployment-readiness.sh

# 3. Apply migrations
./scripts/apply-production-migrations.sh

# 4. Run tests
npm test

# 5. Deploy (choose your method)
# - Cloud: git push (Render/Heroku/AWS)
# - Docker: docker-compose -f docker-compose.prod.yml up -d
```

**Time**: 1-2 hours (if everything is ready)

---

### Option 3: CI/CD Pipeline
**Best for**: Automated deployments

1. Set up environment variables in your CI/CD platform
2. Configure deployment workflow
3. Trigger deployment via git push

See `CI_CD_SETUP.md` for details (if available)

---

## 📝 Step-by-Step Quick Guide

### Step 1: Configure Environment (10 min)
```bash
cd secure-gate-access/server
nano .env.production
```

**Update these values:**
- `DATABASE_URL`: Your production database
- `SMTP_*`: Your email service
- `TWILIO_*`: Your SMS service (if using)
- `CORS_ORIGIN`: Your frontend domain
- `FRONTEND_URL`: Your frontend URL

**Verify critical settings:**
- ✅ `NODE_ENV=production`
- ✅ `OTP_DEBUG_ECHO=false`
- ✅ All placeholder values replaced

---

### Step 2: Secure Your Secrets (15 min)

**Critical secrets to store:**
1. `ENCRYPTION_KEY` (from .env.production)
2. `JWT_SECRET`
3. `JWT_REFRESH_SECRET`
4. `SESSION_SECRET`
5. Database credentials
6. SMTP password
7. Twilio credentials

**Store in:**
- AWS Secrets Manager (recommended for AWS)
- HashiCorp Vault
- Azure Key Vault
- Google Cloud Secret Manager
- Your hosting platform's environment variables

**After storing:**
```bash
# Delete local keys file
rm production-keys-*.txt
```

---

### Step 3: Database Setup (20 min)

**Create production database:**
```sql
CREATE DATABASE secure_gate_production;
CREATE USER secure_gate_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE secure_gate_production TO secure_gate_user;
```

**Test connection:**
```bash
psql "postgresql://user:password@host:port/dbname" -c "SELECT version();"
```

**Backup existing data (if any):**
```bash
pg_dump existing_db > backup_$(date +%Y%m%d).sql
```

---

### Step 4: Apply Migrations (15 min)

```bash
cd secure-gate-access/server
./scripts/apply-production-migrations.sh
```

This will:
- ✅ Create all tables
- ✅ Set up indexes
- ✅ Configure constraints
- ✅ Create stored procedures
- ✅ Verify migration success

**If you have existing data:**
```bash
# After migrations complete
node scripts/migrate-id-numbers.js
node scripts/migrate-qr-codes.js
```

---

### Step 5: Install & Test (20 min)

```bash
# Install dependencies
npm ci

# Run full test suite
npm test

# Expected output:
# Test Suites: 11 passed, 11 total
# Tests:       79 passed, 79 total
```

**If tests fail:**
- Check database connection
- Verify environment variables
- Review error messages
- Fix issues before deploying

---

### Step 6: Deploy (30-60 min)

Choose your deployment method:

#### **Cloud Platform (Render, Heroku, AWS)**
```bash
# Set environment variables in platform dashboard
# Push code
git push origin main  # or your deployment branch

# For Render: Auto-deploys on push (if configured)
# For Heroku: git push heroku main
```

#### **AWS (ECS/EB/EKS)**
Trigger a new deployment via your CI/CD pipeline or service update in the AWS console.

#### **Docker**
```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

---

### Step 7: Verify Deployment (15 min)

```bash
# Test health endpoint
curl https://your-domain.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","database":"connected"}
```

**Manual testing:**
1. ✅ Visit your application URL
2. ✅ Register a new user
3. ✅ Log in
4. ✅ Generate a QR code
5. ✅ Check email delivery
6. ✅ Verify access logging
7. ✅ Test all critical features

---

### Step 8: Monitor (Ongoing)

```bash
# View logs
tail -f server/logs/combined.log

# Docker logs
docker-compose logs -f
```

**Monitor for 24-48 hours:**
- ✅ Error rates
- ✅ API response times
- ✅ Database performance
- ✅ Failed authentications
- ✅ Email/SMS delivery

---

## 🆘 Troubleshooting

### Database Connection Failed
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Check firewall rules
# Check database user permissions
# Verify DATABASE_URL format
```

### Migrations Failed
```bash
# Check migration logs
cat server/logs/migration-*.log

# Rollback if needed (see PRODUCTION_DEPLOYMENT_CHECKLIST.md)
# Fix issues and retry
```

### Tests Failing
```bash
# Run specific test
npm test -- tests/security/otp-security.test.js

# Check environment
cat .env.production | grep NODE_ENV

# Verify database connection
npm test -- tests/database.test.js
```

### Deployment Failed
```bash
# Check build logs
npm run build 2>&1 | tee build.log

# Verify all environment variables set
# Check platform-specific logs
# Review deployment configuration
```

---

## 📞 Getting Help

### Documentation
- **Master Index**: `MASTER_INDEX.md`
- **Deployment Checklist**: `PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **Next Steps**: `PRODUCTION_NEXT_STEPS.md`
- **Executive Summary**: `DEPLOYMENT_EXECUTIVE_SUMMARY.md`

### Scripts
- **Deployment Wizard**: `./scripts/production-deployment-wizard.sh`
- **Readiness Check**: `./scripts/final-deployment-readiness.sh`
- **Migrations**: `./scripts/apply-production-migrations.sh`

### Support
- Check error logs in `server/logs/`
- Review test output
- Consult deployment checklist
- Contact system administrator

---

## ✅ Post-Deployment Checklist

After deployment is complete:

- [ ] Application is accessible at production URL
- [ ] Health check endpoint returns "healthy"
- [ ] User registration works
- [ ] Login/authentication works
- [ ] Email notifications work
- [ ] QR code generation works
- [ ] Access logging works
- [ ] All critical features tested
- [ ] Monitoring/alerting configured
- [ ] Backup schedule configured
- [ ] SSL/TLS certificate valid
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] CORS configured correctly
- [ ] Documentation updated
- [ ] Stakeholders notified

---

## 🎉 Success!

Once everything is checked off:

1. **Monitor**: Watch for 24-48 hours
2. **Document**: Note any deployment-specific details
3. **Celebrate**: Your secure access system is live! 🚀

---

## 🔐 Security Reminders

- ✅ Never commit `.env.production` to git
- ✅ Rotate secrets quarterly
- ✅ Monitor access logs daily
- ✅ Keep dependencies updated
- ✅ Review security logs weekly
- ✅ Test backups monthly
- ✅ Audit user permissions quarterly

---

**Need more help?** Run the interactive wizard:
```bash
./scripts/production-deployment-wizard.sh
```
