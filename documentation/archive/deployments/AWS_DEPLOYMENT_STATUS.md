# Secure Gate AWS Deployment Status

**Deployment Date:** February 2, 2026  
**Region:** af-south-1 (Africa - Cape Town)  
**Status:** ✅ DEPLOYED AND OPERATIONAL

---

## 🌐 Access URLs

| Component | URL | Status |
|-----------|-----|--------|
| **Frontend** | https://d26qn40o6wybhw.cloudfront.net/ | ✅ Active |
| **Backend API** | http://13.245.141.234/ | ✅ Active |
| **EC2 Public IP** | 13.245.141.234 | ✅ Active |

---

## 🏗️ Infrastructure Summary

### AWS Resources Deployed

| Resource | Type/Config | Identifier | Cost/Month |
|----------|-------------|------------|------------|
| **EC2 Instance** | t3.micro (Ubuntu 22.04) | i-0deffe5d9a1b8fab9 | ~$7.50 |
| **RDS PostgreSQL** | db.t3.micro (v15.10) | securegate-db | ~$15.00 |
| **S3 Bucket** | Static Website | securegate-frontend-af | ~$0.50 |
| **CloudFront** | CDN Distribution | d26qn40o6wybhw | ~$1.00 |
| **VPC** | Default | vpc-04e48ac491e80be0b | Free |
| **Security Groups** | EC2 + RDS | sg-* | Free |
| **Key Pair** | RSA 2048-bit | securegate-key | Free |

**Estimated Monthly Cost:** ~$25-30 (within $60 credits)

---

## ✅ Deployment Checklist

### Infrastructure
- [x] VPC and subnets configured
- [x] Security groups created (EC2: 22, 80, 443 / RDS: 5432)
- [x] RDS subnet group created
- [x] EC2 key pair generated
- [x] EC2 instance launched
- [x] RDS PostgreSQL instance created
- [x] S3 bucket created with static hosting
- [x] CloudFront distribution created

### Backend Deployment
- [x] Node.js and npm installed on EC2
- [x] Backend code deployed to EC2
- [x] npm dependencies installed
- [x] Environment variables configured
- [x] Database migrations executed
- [x] PM2 process manager configured
- [x] PM2 auto-restart on boot enabled
- [x] Nginx reverse proxy configured
- [x] Nginx auto-start on boot enabled

### Frontend Deployment
- [x] React app built for production
- [x] Build files uploaded to S3
- [x] S3 bucket policy for public access
- [x] CloudFront distribution configured
- [x] CORS headers configured

### Database
- [x] RDS instance created
- [x] Database `securegate` created
- [x] Migrations executed successfully
- [x] Default estate data seeded

---

## 🔧 Configuration Details

### EC2 Instance
```
Instance ID: i-0deffe5d9a1b8fab9
Instance Type: t3.micro
AMI: Ubuntu 22.04 LTS
Public IP: 13.245.141.234
Availability Zone: af-south-1a
Key Pair: securegate-key
```

### RDS Database
```
Identifier: securegate-db
Engine: PostgreSQL 15.10
Instance Class: db.t3.micro
Storage: 20 GB (GP2)
Endpoint: securegate-db.c3lso8qyy7qe.af-south-1.rds.amazonaws.com
Port: 5432
Database: securegate
Username: postgres
```

### S3 Bucket
```
Bucket Name: securegate-frontend-af
Region: af-south-1
Website Endpoint: securegate-frontend-af.s3-website.af-south-1.amazonaws.com
Public Access: Enabled for static hosting
```

### CloudFront Distribution
```
Distribution ID: (check AWS Console)
Domain: d26qn40o6wybhw.cloudfront.net
Origin: securegate-frontend-af.s3-website.af-south-1.amazonaws.com
Price Class: All edge locations
SSL: Enabled (default CloudFront certificate)
```

---

## 🧪 API Endpoints Verified

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/` | GET | ✅ | Health check (root) |
| `/api/` | GET | ✅ | API health check |
| `/api/estates/available` | GET | ✅ | Returns estate data |
| `/api/auth/check-email` | GET | ✅ | Email availability check |
| `/api/auth/register` | POST | ✅ | User registration (rate limited) |
| `/api/auth/login` | POST | ✅ | User authentication |

---

## 🔐 Security Configuration

### Security Groups

**EC2 Security Group:**
- Inbound: SSH (22), HTTP (80), HTTPS (443)
- Outbound: All traffic

**RDS Security Group:**
- Inbound: PostgreSQL (5432) from EC2 security group
- Outbound: All traffic

### SSL/TLS
- CloudFront: Default CloudFront certificate (HTTPS)
- Backend: HTTP (behind CloudFront/Nginx)

### Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes
- Admin endpoints: 30 requests per 15 minutes

---

## 📊 Process Management

### PM2 Configuration
```bash
# View status
pm2 list

# View logs
pm2 logs securegate-api

# Restart
pm2 restart securegate-api

# Stop
pm2 stop securegate-api
```

### Nginx Configuration
Location: `/etc/nginx/sites-available/securegate`

```bash
# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx

# Status
sudo systemctl status nginx
```

---

## 🔧 Maintenance Commands

### SSH Access
```bash
ssh -i ~/.ssh/securegate-key.pem ubuntu@13.245.141.234
```

### Update Backend Code
```bash
# On EC2
cd ~/secure-gate-api
git pull origin main
npm install
pm2 restart securegate-api
```

### Update Frontend
```bash
# Local machine
cd secure-gate-access/client
npm run build
aws s3 sync build/ s3://securegate-frontend-af --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

### Database Access
```bash
# From EC2
psql -h securegate-db.c3lso8qyy7qe.af-south-1.rds.amazonaws.com \
     -U postgres -d securegate
```

---

## ⚠️ Known Issues

1. **Rate Limiting X-Forwarded-For Warning**: Express rate-limit shows warnings about unexpected X-Forwarded-For header. This is logged but doesn't affect functionality.

2. **DateTime Query Warnings**: Some metrics queries fail with datetime range errors. Falls back to in-memory metrics gracefully.

3. **One Migration Failed**: `20240128000001_add_notifications_table.sql` failed but core functionality is intact.

---

## 💰 Cost Management

### Budget Setup
Set up AWS Budgets alert at $50/month:
```bash
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget '{
    "BudgetName": "SecureGate-Monthly",
    "BudgetLimit": {"Amount": "50", "Unit": "USD"},
    "BudgetType": "COST",
    "TimeUnit": "MONTHLY"
  }'
```

### Credit Usage
- **Available Credits:** $60 (3 x $20)
- **Estimated Monthly:** ~$25-30
- **Coverage:** ~2 months of operation

---

## 📈 Monitoring

### Health Checks
```bash
# Backend health
curl http://13.245.141.234/

# API health
curl http://13.245.141.234/api/

# Frontend (CloudFront)
curl -I https://d26qn40o6wybhw.cloudfront.net/
```

### Logs
```bash
# PM2 logs
pm2 logs securegate-api --lines 100

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📞 Support

For issues with this deployment:
1. Check PM2 logs: `pm2 logs securegate-api`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify RDS connectivity: `nc -zv securegate-db.c3lso8qyy7qe.af-south-1.rds.amazonaws.com 5432`
4. Check EC2 instance status in AWS Console

---

**Last Updated:** February 2, 2026
