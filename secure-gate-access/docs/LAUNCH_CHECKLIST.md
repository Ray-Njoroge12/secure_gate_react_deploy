# 🚀 Secure Gate Access - Launch Checklist

## Pre-Launch Status: READY FOR PILOT

**Date:** November 30, 2025  
**Version:** 1.0.0  
**E2E Tests:** 50/50 Passing ✅

---

## Quick Launch Steps (For Immediate Testing)

### Step 1: Rotate Your API Keys 🔐

Your Africa's Talking and Mailgun API keys were exposed. **Rotate them now:**

1. **Africa's Talking:**
   - Go to: https://account.africastalking.com/
   - Navigate to: Settings > API Key
   - Generate new API key
   - Save the new key securely

2. **Mailgun:**
   - Go to: https://app.mailgun.com/
   - Navigate to: API Keys
   - Create new sending key or rotate existing
   - Save the new key securely

### Step 2: Set Up Local Environment

```bash
# Navigate to server directory
cd secure-gate-access/server

# Copy the example env file
cp .env.local.example .env.local

# Edit .env.local and add your rotated API keys:
# - AT_API_KEY=your_new_africastalking_key
# - MAILGUN_API_KEY=your_new_mailgun_key
```

### Step 3: Ensure Database is Ready

```bash
# Make sure PostgreSQL is running
# If using local PostgreSQL:
psql -U postgres -c "CREATE DATABASE secure_gate;"

# Run the seed script for test users
cd server
node src/database/seed-test-users.js
```

### Step 4: Start the Application

```bash
# Terminal 1 - Start Backend
cd secure-gate-access/server
npm install
npm start

# Terminal 2 - Start Frontend
cd secure-gate-access/client
npm install
npm start
```

### Step 5: Test SMS & Email

1. Log in as resident: `resident@test.com` / `Test123!`
2. Add a visitor with your own phone number
3. Check if SMS arrives via Africa's Talking
4. Check if Email arrives (must be in Mailgun authorized recipients)

---

## AWS Production Deployment

### Phase 1: AWS Secrets Setup

```bash
# Make the setup script executable
chmod +x scripts/aws-setup-secrets.sh

# Run the secrets setup
./scripts/aws-setup-secrets.sh
```

This will prompt you for:
- Database password
- Redis password (optional)
- Mailgun API key (rotated)
- Africa's Talking API key (rotated)

### Phase 2: Infrastructure Setup

#### A. Create VPC & Networking
```bash
# Create VPC in af-south-1 (Cape Town)
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region af-south-1

# Create subnets (at least 2 AZs for HA)
# Public subnets for ALB
# Private subnets for ECS/RDS
```

#### B. Create RDS PostgreSQL
```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name securegate-db-subnet \
  --db-subnet-group-description "SecureGate DB Subnet" \
  --subnet-ids subnet-xxx subnet-yyy \
  --region af-south-1

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier securegate-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username securegate_admin \
  --master-user-password "YOUR_DB_PASSWORD" \
  --allocated-storage 20 \
  --db-subnet-group-name securegate-db-subnet \
  --vpc-security-group-ids sg-xxx \
  --publicly-accessible \
  --region af-south-1
```

#### C. Create ElastiCache Redis (Optional for Pilot)
```bash
# For pilot, you can skip Redis and use in-memory rate limiting
# For production, create ElastiCache cluster
```

#### D. Deploy Backend (Option: Single EC2 for Pilot)
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-xxx \
  --instance-type t3.small \
  --key-name your-key \
  --security-group-ids sg-xxx \
  --subnet-id subnet-xxx \
  --region af-south-1

# SSH into instance and:
# 1. Install Node.js
# 2. Clone repository
# 3. Set environment variables
# 4. Start with PM2
```

#### E. Deploy Frontend to S3 + CloudFront
```bash
# Create S3 bucket
aws s3 mb s3://securegate-frontend --region af-south-1

# Build and upload
cd client
npm run build
aws s3 sync build/ s3://securegate-frontend --delete

# Create CloudFront distribution pointing to S3
```

---

## Environment Variables Checklist

### Backend (server/.env.local or AWS Secrets)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `3001` |
| `JWT_SECRET` | ✅ | 64-byte random string |
| `JWT_REFRESH_SECRET` | ✅ | 64-byte random string |
| `SESSION_SECRET` | ✅ | 64-byte random string |
| `PGHOST` | ✅ | Database host |
| `PGPORT` | ✅ | `5432` |
| `PGDATABASE` | ✅ | `secure_gate` |
| `PGUSER` | ✅ | Database user |
| `PGPASSWORD` | ✅ | Database password |
| `AT_USERNAME` | ✅ | `securelabstest` |
| `AT_API_KEY` | ✅ | Africa's Talking API key |
| `MAILGUN_DOMAIN` | ✅ | Mailgun domain |
| `MAILGUN_API_KEY` | ✅ | Mailgun API key |
| `SMS_PROVIDER` | ✅ | `africastalking` |
| `EMAIL_PROVIDER` | ✅ | `mailgun` |
| `ENABLE_EXTERNAL_NOTIFICATIONS` | ✅ | `true` |
| `ENABLE_EMAIL_NOTIFICATIONS` | ✅ | `true` |
| `ENABLE_SMS_NOTIFICATIONS` | ✅ | `true` |

### Frontend (client/.env.production)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_API_URL` | ✅ | Backend API URL |
| `REACT_APP_ENVIRONMENT` | ✅ | `production` |

---

## Testing Checklist

### Authentication
- [ ] Login as admin@test.com
- [ ] Login as resident@test.com
- [ ] Login as guard@test.com
- [ ] Test logout
- [ ] Test session persistence

### Resident Features
- [ ] View dashboard
- [ ] Add single visitor
- [ ] Bulk invite visitors
- [ ] View visitor history
- [ ] Generate visitor pass

### Guard Features
- [ ] View dashboard
- [ ] Scan QR code
- [ ] Manual visitor check
- [ ] Check-in visitor
- [ ] Check-out visitor

### Admin Features
- [ ] View dashboard
- [ ] User management
- [ ] View reports
- [ ] System settings

### Notifications
- [ ] SMS sent on visitor invite
- [ ] Email sent on visitor invite
- [ ] OTP SMS works
- [ ] OTP Email works

---

## Security Checklist

- [x] httpOnly cookies for auth tokens
- [x] Argon2 password hashing
- [x] CSRF protection
- [x] Rate limiting on auth endpoints
- [x] Input validation
- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention
- [ ] HTTPS enforced (need to configure ALB/CloudFront)
- [x] Sensitive data encrypted
- [x] Kenya DPA compliant

---

## Estimated Costs (Pilot Phase)

| Service | Monthly Cost |
|---------|--------------|
| EC2 t3.small | ~$15-20 |
| RDS t3.micro | ~$15-25 |
| S3 + CloudFront | ~$5-10 |
| Route 53 | ~$1 |
| **Total** | **~$35-55/month** |

---

## Support Contacts

- Africa's Talking Support: support@africastalking.com
- Mailgun Support: support@mailgun.com
- AWS Support: via Console

---

## Next Steps After Launch

1. **Week 1:** Monitor logs and metrics
2. **Week 2:** Gather user feedback
3. **Week 3:** Address any issues
4. **Month 2:** Scale to production architecture if needed
