# Render Environment Variables Setup Guide

This guide covers how to configure all environment variables for the Secure Gate Access Control System on Render.

## 🔧 Required Environment Variables

### Database (Already Configured)
```
DATABASE_URL=<automatically set by Render PostgreSQL>
```

### Server Configuration
```
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://your-frontend-url.netlify.app
ADDITIONAL_ORIGINS=https://another-allowed-origin.example.com
TRUST_PROXY=true
```

### Security - JWT (Generate strong secrets)
```bash
# Generate secrets using:
# openssl rand -base64 64 | tr -d '\n'
```
```
JWT_SECRET=<64+ character random string>
JWT_REFRESH_SECRET=<64+ character random string>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
SESSION_SECRET=<64+ character random string>
```

---

## 🔴 Redis Configuration (Recommended)

### Option 1: Render Redis (Recommended)

1. Go to your Render Dashboard
2. Click **New** → **Redis**
3. Configure:
   - Name: `secure-gate-redis`
   - Region: Same as your web service
   - Plan: Starter ($7/month) or Free (with limitations)
4. After creation, copy the **Internal URL**
5. Add to your web service environment:

```
REDIS_URL=<Internal Redis URL from Render>
```

### Option 2: External Redis (Upstash - Free Tier Available)

1. Go to https://upstash.com/
2. Create a free Redis database
3. Copy the connection URL
4. Add to environment:

```
REDIS_URL=redis://default:password@your-upstash-url:6379
```

### Redis Benefits
- ✅ Session persistence across deployments
- ✅ Rate limiting works across multiple instances
- ✅ Better performance for caching
- ✅ No memory leaks from in-memory stores

---

## 📊 Centralized Logging (Optional)

### Option 1: Disable Centralized Logging (Simplest)

If you don't have a Loki/ELK instance, disable centralized logging:

```
LOGGING_CENTRALIZATION_ENABLED=false
```

Logs will still be written locally and visible in Render's log viewer.

### Option 2: Grafana Cloud (Free Tier Available)

1. Sign up at https://grafana.com/products/cloud/
2. Create a Grafana Cloud account (free tier: 50GB logs/month)
3. Go to **Connections** → **Loki**
4. Get your Loki push endpoint and credentials
5. Add to environment:

```
LOGGING_CENTRALIZATION_ENABLED=true
LOGGING_ENDPOINT=https://logs-prod-us-central1.grafana.net
LOGGING_TYPE=loki
# Add authentication header in centralizedLoggingService.js if using Grafana Cloud
```

### Option 3: Self-Hosted Loki

```
LOGGING_CENTRALIZATION_ENABLED=true
LOGGING_ENDPOINT=http://your-loki-server:3100
LOGGING_TYPE=loki
LOGGING_BATCH_SIZE=100
LOGGING_FLUSH_INTERVAL=5000
```

---

## 🔐 Encryption Configuration

### Option 1: Local Encryption (Acceptable for MVP)

For initial deployment, local encryption is acceptable:

```
ENCRYPTION_METHOD=local
ENCRYPTION_KEY=<Generate a 64-character random string>
```

Generate a key:
```bash
openssl rand -base64 48 | tr -d '\n'
```

### Option 2: AWS KMS (Recommended for Production)

1. Create an AWS account
2. Go to AWS KMS → Create Key
3. Create a symmetric key in `af-south-1` region (or your preferred region)
4. Add IAM permissions for your service
5. Add to environment:

```
ENCRYPTION_METHOD=aws-kms
AWS_KMS_KEY_ID=arn:aws:kms:af-south-1:123456789:key/your-key-id
AWS_REGION=af-south-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
```

---

## 📧 Email Configuration (Mailgun)

```
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM_EMAIL=noreply@yourdomain.com
MAILGUN_FROM_NAME=Secure Gate
```

---

## 📱 SMS Configuration (Africa's Talking)

```
AFRICASTALKING_API_KEY=your-api-key
AFRICASTALKING_USERNAME=your-username
AFRICASTALKING_SENDER_ID=SecureGate
```

---

## 📊 Monitoring (Sentry - Optional)

```
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

---

## 🔒 Security Headers

```
ENFORCE_HTTPS=true
SECURE_COOKIES=true
HSTS_MAX_AGE=31536000
```

---

## 📋 Complete Environment Variables Checklist

### Essential (Must Have)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` - 64+ character secret
- [ ] `JWT_REFRESH_SECRET` - 64+ character secret  
- [ ] `SESSION_SECRET` - 64+ character secret
- [ ] `CLIENT_ORIGIN` - Frontend URL (must be non-localhost in production)
- [ ] `ADDITIONAL_ORIGINS` - Optional comma-separated additional allowed origins

### Recommended
- [ ] `REDIS_URL` - Redis connection string
- [ ] `ENCRYPTION_KEY` - 64 character key for local encryption
- [ ] `MAILGUN_API_KEY` - For email notifications
- [ ] `MAILGUN_DOMAIN` - Your Mailgun domain

### Optional
- [ ] `LOGGING_CENTRALIZATION_ENABLED=false` - Disable Loki if not available
- [ ] `SENTRY_DSN` - For error monitoring
- [ ] `AFRICASTALKING_API_KEY` - For SMS notifications

---

## 🚀 Quick Setup Commands

### Generate All Required Secrets

Run this on your local machine to generate all secrets:

```bash
echo "=== Copy these to Render Environment Variables ==="
echo ""
echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
echo "SESSION_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
echo "ENCRYPTION_KEY=$(openssl rand -base64 48 | tr -d '\n')"
```

---

## 🔄 After Configuration

1. Go to your Render web service
2. Navigate to **Environment** tab
3. Add all the environment variables
4. Click **Save Changes**
5. Render will automatically redeploy

### Verify Deployment

After redeployment, check the logs for:
- ✅ `Redis connected successfully` (if Redis configured)
- ✅ `Centralized logging disabled` (if Loki not configured)
- ✅ `Encryption configured: local` (or aws-kms)
- ✅ `Server started successfully`

Test the health endpoint:
```bash
curl https://secure-gate-api.onrender.com/api/health
```
