#!/bin/bash
# ============================================
# PRE-PRODUCTION SETUP SCRIPT
# ============================================
# 
# This script prepares the system for production deployment
# Run this BEFORE deploying to production
#
# Usage: ./scripts/pre-production-setup.sh
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     🚀 Pre-Production Setup Script                    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ============================================
# Step 1: Generate Required Keys
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 1: Generating Security Keys${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Generate encryption key
echo -e "${GREEN}Generating encryption key (64 hex chars)...${NC}"
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""

# Generate JWT secrets
echo -e "${GREEN}Generating JWT secret...${NC}"
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_SECRET=${JWT_SECRET:0:50}... (truncated for display)"
echo ""

echo -e "${GREEN}Generating JWT refresh secret...${NC}"
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:0:50}... (truncated for display)"
echo ""

echo -e "${GREEN}Generating session secret...${NC}"
SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "SESSION_SECRET=${SESSION_SECRET:0:50}... (truncated for display)"
echo ""

# ============================================
# Step 2: Create .env.production file
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 2: Creating .env.production File${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production already exists!${NC}"
    echo -e "${YELLOW}Creating backup: .env.production.backup.$(date +%Y%m%d_%H%M%S)${NC}"
    cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
fi

echo "Creating .env.production with generated keys..."

cat > .env.production << EOF
# ============================================
# PRODUCTION ENVIRONMENT VARIABLES
# Auto-generated: $(date)
# ============================================

# Application
NODE_ENV=production
PORT=5000

# Database (⚠️ UPDATE THIS!)
DATABASE_URL=postgresql://username:password@host:5432/database

# Security - Encryption
ENCRYPTION_KEY=$ENCRYPTION_KEY
ENCRYPTION_ALGORITHM=aes-256-gcm

# Security - JWT
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Security - Session
SESSION_SECRET=$SESSION_SECRET
SESSION_MAX_AGE=86400000

# Security - OTP (⚠️ CRITICAL: Must be false!)
OTP_DEBUG_ECHO=false
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=3

# Data Retention
RETENTION_ARCHIVE_ENABLED=true
RETENTION_VISITOR_DAYS=90
RETENTION_ACCESS_LOG_DAYS=365
RETENTION_AUDIT_LOG_DAYS=730
RETENTION_CRON_SCHEDULE=0 2 * * *
RETENTION_BATCH_SIZE=1000

# QR Tokens
QR_TOKEN_EXPIRY_HOURS=24
QR_TOKEN_LENGTH=32

# Email (⚠️ UPDATE THESE!)
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com

# SMS/Twilio (⚠️ UPDATE THESE!)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Logging
LOG_LEVEL=info
LOG_REQUESTS=true
LOG_QUERIES=false
LOG_ERRORS=true
LOG_SECURITY=true

# CORS (⚠️ UPDATE THIS!)
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
FEATURE_QR_TOKENIZATION=true
FEATURE_DATA_RETENTION=true
FEATURE_DATA_MINIMIZATION=true
FEATURE_ID_ENCRYPTION=true

# Development (All false in production!)
DEBUG_MODE=false
VERBOSE_LOGGING=false
ENABLE_API_DOCS=false
EOF

echo -e "${GREEN}✓ .env.production created successfully${NC}"
echo ""

# ============================================
# Step 3: Security Validation
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 3: Security Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check critical security settings
echo "Validating critical security settings..."

if grep -q "OTP_DEBUG_ECHO=false" .env.production; then
    echo -e "${GREEN}✓ OTP_DEBUG_ECHO is correctly set to false${NC}"
else
    echo -e "${RED}✗ WARNING: OTP_DEBUG_ECHO is not set to false!${NC}"
fi

if grep -q "NODE_ENV=production" .env.production; then
    echo -e "${GREEN}✓ NODE_ENV is set to production${NC}"
else
    echo -e "${RED}✗ WARNING: NODE_ENV is not set to production!${NC}"
fi

if grep -q "DEBUG_MODE=false" .env.production; then
    echo -e "${GREEN}✓ DEBUG_MODE is disabled${NC}"
else
    echo -e "${RED}✗ WARNING: DEBUG_MODE is enabled!${NC}"
fi

echo ""

# ============================================
# Step 4: Save Keys Securely
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 4: Saving Keys Securely${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create secure keys file
KEYS_FILE="production-keys-$(date +%Y%m%d_%H%M%S).txt"
cat > "$KEYS_FILE" << EOF
==============================================
SECURE GATE ACCESS - PRODUCTION KEYS
Generated: $(date)
==============================================

⚠️  CRITICAL: Store these keys securely!
⚠️  Use a password manager or secrets vault
⚠️  Delete this file after secure storage

ENCRYPTION_KEY:
$ENCRYPTION_KEY

JWT_SECRET:
$JWT_SECRET

JWT_REFRESH_SECRET:
$JWT_REFRESH_SECRET

SESSION_SECRET:
$SESSION_SECRET

==============================================
INSTRUCTIONS:
1. Store these keys in your secrets manager
2. Update .env.production with any missing values
3. Delete this file securely: shred -u $KEYS_FILE
4. Never commit .env.production to git
==============================================
EOF

echo -e "${GREEN}✓ Keys saved to: $KEYS_FILE${NC}"
echo -e "${YELLOW}⚠️  Store these keys securely, then delete the file!${NC}"
echo ""

# ============================================
# Step 5: Verify File Permissions
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 5: Setting Secure File Permissions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

chmod 600 .env.production
chmod 600 "$KEYS_FILE"

echo -e "${GREEN}✓ Set .env.production permissions to 600 (owner read/write only)${NC}"
echo -e "${GREEN}✓ Set $KEYS_FILE permissions to 600${NC}"
echo ""

# ============================================
# Step 6: Generate Deployment Checklist
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Step 6: Creating Pre-Deployment Checklist${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cat > PRE_DEPLOYMENT_TODO.md << EOF
# 📋 Pre-Deployment TODO List

**Generated**: $(date)

## ⚠️ CRITICAL - Complete Before Deployment

### 1. Environment Variables
- [ ] Update DATABASE_URL in .env.production
- [ ] Update EMAIL/SMTP settings
- [ ] Update Twilio SMS credentials
- [ ] Update CORS_ORIGIN with your domain
- [ ] Verify all keys are securely stored
- [ ] Remove any placeholder values

### 2. Database
- [ ] Create production database
- [ ] Test database connection
- [ ] Backup existing data (if any)
- [ ] Ready to apply migrations

### 3. Secrets Management
- [ ] Store ENCRYPTION_KEY in secrets manager
- [ ] Store JWT secrets in secrets manager
- [ ] Store database credentials securely
- [ ] Store API keys (Twilio, etc.) securely
- [ ] Delete local keys file: $KEYS_FILE

### 4. Security
- [ ] Confirm OTP_DEBUG_ECHO=false
- [ ] Confirm DEBUG_MODE=false
- [ ] Confirm ENABLE_API_DOCS=false
- [ ] Review CORS settings
- [ ] Review rate limiting settings

### 5. Infrastructure
- [ ] Set up monitoring (APM, logs)
- [ ] Configure error tracking (Sentry)
- [ ] Set up backup strategy
- [ ] Configure SSL/TLS certificates
- [ ] Test firewall rules

### 6. Final Checks
- [ ] Run: npm test (all tests passing)
- [ ] Run: ./scripts/quick-readiness-check.sh
- [ ] Review deployment checklist
- [ ] Get stakeholder approval
- [ ] Schedule deployment window

## 📝 Next Steps

1. Complete all items in this checklist
2. Review: PRODUCTION_DEPLOYMENT_CHECKLIST.md
3. Execute deployment following the guide
4. Monitor system for 24-48 hours

## 🔑 Generated Keys Location

Secure keys saved in: $KEYS_FILE
⚠️  Store securely and delete after!
EOF

echo -e "${GREEN}✓ Created PRE_DEPLOYMENT_TODO.md${NC}"
echo ""

# ============================================
# Summary
# ============================================

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║              Setup Complete! ✅                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}✅ Files Created:${NC}"
echo "   1. .env.production - Production environment file"
echo "   2. $KEYS_FILE - Secure keys (DELETE after storing!)"
echo "   3. PRE_DEPLOYMENT_TODO.md - Pre-deployment checklist"
echo ""

echo -e "${YELLOW}⚠️  CRITICAL NEXT STEPS:${NC}"
echo "   1. Review and update .env.production with your values"
echo "   2. Store all keys in a secure secrets manager"
echo "   3. Delete $KEYS_FILE securely: shred -u $KEYS_FILE"
echo "   4. Complete items in PRE_DEPLOYMENT_TODO.md"
echo "   5. Review PRODUCTION_DEPLOYMENT_CHECKLIST.md"
echo ""

echo -e "${BLUE}📚 Documentation:${NC}"
echo "   - PRE_DEPLOYMENT_TODO.md - What to do next"
echo "   - PRODUCTION_DEPLOYMENT_CHECKLIST.md - Full deployment guide"
echo "   - DEPLOYMENT_EXECUTIVE_SUMMARY.md - Executive overview"
echo ""

echo -e "${GREEN}🎯 When ready to deploy:${NC}"
echo "   1. Ensure all TODO items are complete"
echo "   2. Run: ./scripts/quick-readiness-check.sh"
echo "   3. Follow: PRODUCTION_DEPLOYMENT_CHECKLIST.md"
echo ""

echo "════════════════════════════════════════════════════════"
echo ""
