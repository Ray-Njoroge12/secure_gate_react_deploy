# 🚀 Secure Gate Access - Quick Deployment Checklist

## Pre-Deployment
- [ ] Generate secrets: `openssl rand -base64 64` (3x for JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET)
- [ ] Have GitHub repo ready
- [ ] Have Render account created
- [ ] Have Netlify account created
- [ ] Have Africa's Talking API credentials
- [ ] Have Mailgun API credentials

## Server Deployment (Render) - 15 minutes

### 1. Create Database (5 min)
- [ ] Go to https://dashboard.render.com
- [ ] New + → PostgreSQL
- [ ] Name: `securegate-db`, Database: `secure_gate`, User: `securegate_user`
- [ ] Region: Frankfurt, Plan: Free
- [ ] Click "Create Database"
- [ ] Copy connection details (DATABASE_URL, PGHOST, PGPORT, etc.)

### 2. Deploy Server (10 min)
- [ ] New + → Web Service
- [ ] Connect GitHub repo
- [ ] Root: `secure-gate-access/server`
- [ ] Name: `securegate-api`
- [ ] Region: Frankfurt, Runtime: Node
- [ ] Build: `npm install`, Start: `npm start`
- [ ] Plan: Free

### 3. Add Environment Variables
Copy these into Render → Environment tab:

```bash
# Database (from step 1)
DATABASE_URL=postgresql://securegate_user:PASSWORD@HOST/secure_gate
PGHOST=YOUR_DB_HOST
PGPORT=5432
PGDATABASE=secure_gate
PGUSER=securegate_user
PGPASSWORD=YOUR_DB_PASSWORD

# Security (generated in pre-deployment)
JWT_SECRET=YOUR_64_CHAR_SECRET
JWT_REFRESH_SECRET=YOUR_64_CHAR_SECRET
SESSION_SECRET=YOUR_64_CHAR_SECRET

# Server Config
NODE_ENV=production
PORT=3001
TRUST_PROXY=true
ENFORCE_HTTPS=true
SECURE_COOKIES=true

# SMS (your credentials)
AT_USERNAME=YOUR_USERNAME
AT_API_KEY=YOUR_API_KEY
SMS_PROVIDER=africastalking
ENABLE_SMS_NOTIFICATIONS=true

# Email (your credentials)
MAILGUN_API_KEY=YOUR_API_KEY
MAILGUN_DOMAIN=YOUR_DOMAIN
MAILGUN_BASE_URL=https://api.mailgun.net
EMAIL_PROVIDER=mailgun
ENABLE_EMAIL_NOTIFICATIONS=true

# Site
SITE_NAME=Secure Gate Access
ENABLE_EXTERNAL_NOTIFICATIONS=true
EMAIL_VERIFICATION_REQUIRED=false
CORS_ORIGIN=https://your-site.netlify.app  # Update after Netlify deploy
```

- [ ] Click "Create Web Service"
- [ ] Wait for deployment (5-10 min)
- [ ] Note URL: `https://securegate-api.onrender.com`
- [ ] Test health: `curl https://securegate-api.onrender.com/api/health`

## Client Deployment (Netlify) - 10 minutes

### 1. Deploy Site (5 min)
- [ ] Go to https://app.netlify.com
- [ ] Add new site → Import project
- [ ] Choose GitHub
- [ ] Base: `secure-gate-access/client`
- [ ] Build: `npm run build:production`
- [ ] Publish: `secure-gate-access/client/build`
- [ ] Node: 18

### 2. Add Environment Variables
Go to Site Settings → Environment Variables:

```bash
REACT_APP_API_URL=https://securegate-api.onrender.com
REACT_APP_WS_URL=wss://securegate-api.onrender.com
REACT_APP_VERSION=1.0.0
NODE_VERSION=18
CI=false
GENERATE_SOURCEMAP=false
```

- [ ] Deploy site
- [ ] Wait for build (3-5 min)
- [ ] Note URL: `https://YOUR_SITE.netlify.app`

### 3. Update Server CORS (2 min)
- [ ] Go back to Render dashboard
- [ ] Select `securegate-api` service
- [ ] Update `CORS_ORIGIN=https://YOUR_SITE.netlify.app`
- [ ] Save (triggers redeploy)

## Verification (5 minutes)

### Run Verification Script
```bash
cd /Users/raynj/Desktop/secure-gate-react-express
./verify-deployment.sh
```

Or manually check:
- [ ] Server health: `curl https://securegate-api.onrender.com/api/health`
- [ ] Client loads: Visit `https://YOUR_SITE.netlify.app`
- [ ] HTTPS on both: Check URLs start with `https://`
- [ ] Login page works
- [ ] Registration works

### Test Critical Flows
- [ ] Register new user
- [ ] Login/logout
- [ ] Create visitor invitation
- [ ] Verify access code generation
- [ ] Test SMS notification (if configured)
- [ ] Test email notification (if configured)

## Post-Deployment

### Security
- [ ] Verify HTTPS enforced
- [ ] Check security headers (dev tools → Network)
- [ ] Test rate limiting (multiple failed logins)
- [ ] Verify session management works

### Performance
- [ ] Run Lighthouse: `npx lighthouse https://YOUR_SITE.netlify.app`
- [ ] Target: >90 Performance, >95 Accessibility
- [ ] Check load times acceptable

### Monitoring (Optional but Recommended)
- [ ] Set up UptimeRobot for server health monitoring
- [ ] Configure Sentry error tracking
- [ ] Set up log aggregation (LogDNA/Datadog)
- [ ] Configure alerts for downtime

### Documentation
- [ ] Update README with production URLs
- [ ] Document environment variables used
- [ ] Create user guide
- [ ] Create admin guide

## ODPC Registration (Kenya DPA Compliance)

Use information from previous conversation summary to:
- [ ] Complete ODPC registration form
- [ ] Submit registration to ODPC (https://www.odpc.go.ke)
- [ ] Pay registration fee (if applicable)
- [ ] Await registration certificate
- [ ] Display certificate number on site footer

## Custom Domain (Optional)

### Netlify Custom Domain
- [ ] Site Settings → Domain Management
- [ ] Add custom domain
- [ ] Configure DNS (A/CNAME records)
- [ ] Enable automatic HTTPS

### Render Custom Domain
- [ ] Service → Settings → Custom Domain
- [ ] Add domain
- [ ] Configure DNS
- [ ] Enable HTTPS

## Backup & Disaster Recovery

- [ ] Enable Render PostgreSQL backups (automatic on paid plans)
- [ ] Or set up manual backup cron job
- [ ] Document restore procedure
- [ ] Test restore process
- [ ] Store backups securely offsite

## Team Handoff

- [ ] Share production URLs with team
- [ ] Document admin credentials (secure storage)
- [ ] Provide access to Render/Netlify dashboards
- [ ] Share monitoring credentials
- [ ] Schedule training sessions

---

## Quick Reference URLs

**Documentation**: `/DEPLOYMENT_GUIDE.md`  
**Verification Script**: `./verify-deployment.sh`  
**Server Logs**: Render Dashboard → Logs  
**Client Logs**: Netlify Dashboard → Deploy Logs  
**Database**: Render Dashboard → PostgreSQL  

**Support**:
- Render: https://render.com/docs
- Netlify: https://docs.netlify.com
- Africa's Talking: https://developers.africastalking.com
- Mailgun: https://documentation.mailgun.com

---

## Troubleshooting Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Build fails | Check `package.json` and Node version (18) |
| Can't connect to DB | Verify `DATABASE_URL` and `TRUST_PROXY=true` |
| CORS errors | Update `CORS_ORIGIN` in Render to match Netlify URL |
| Client can't reach API | Check `REACT_APP_API_URL` in Netlify env vars |
| Slow first request | Expected on Render free tier (15min spin-down) |
| No SMS/emails | Verify API credentials and enable flags |
| WebSocket fails | Ensure `REACT_APP_WS_URL` uses `wss://` |

---

**Total Time**: ~30 minutes  
**Status**: ✅ Ready to Deploy

🎉 **You're all set! Follow this checklist step-by-step and you'll have a production system in under an hour.**
