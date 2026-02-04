#!/bin/bash

# Secure Gate Access - Production Environment Variables Generator
# This script helps you generate and organize environment variables for deployment

set -e

echo "🔐 Secure Gate Access - Environment Variables Setup"
echo "===================================================="
echo ""
echo "This script will help you:"
echo "1. Generate secure random secrets"
echo "2. Collect your API credentials"
echo "3. Generate ready-to-paste environment variables for Render and Netlify"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Output files
RENDER_ENV_FILE="render-env-vars.txt"
NETLIFY_ENV_FILE="netlify-env-vars.txt"
SECRETS_FILE=".env-secrets-KEEP_SECURE.txt"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Generate Secure Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate secrets
echo "Generating secure random secrets..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo -e "${GREEN}✓ Secrets generated${NC}"
echo ""

# Save secrets securely
echo "# KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT" > "$SECRETS_FILE"
echo "# Generated: $(date)" >> "$SECRETS_FILE"
echo "" >> "$SECRETS_FILE"
echo "JWT_SECRET=$JWT_SECRET" >> "$SECRETS_FILE"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> "$SECRETS_FILE"
echo "SESSION_SECRET=$SESSION_SECRET" >> "$SECRETS_FILE"

echo -e "${YELLOW}⚠️  Secrets saved to: $SECRETS_FILE${NC}"
echo "   Keep this file secure! Do NOT commit to Git."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Collect Database Information"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After creating your PostgreSQL database in Render, enter the connection details:"
echo ""

read -p "Database Host (PGHOST): " PGHOST
read -p "Database Port (default 5432): " PGPORT
PGPORT=${PGPORT:-5432}
read -p "Database Name (default: secure_gate): " PGDATABASE
PGDATABASE=${PGDATABASE:-secure_gate}
read -p "Database User (default: securegate_user): " PGUSER
PGUSER=${PGUSER:-securegate_user}
read -sp "Database Password (PGPASSWORD): " PGPASSWORD
echo ""

DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}"

echo ""
echo -e "${GREEN}✓ Database configuration collected${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Collect API Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Africa's Talking
echo "Africa's Talking (SMS Provider):"
read -p "  Username: " AT_USERNAME
read -sp "  API Key: " AT_API_KEY
echo ""

# Mailgun
echo ""
echo "Mailgun (Email Provider):"
read -p "  Domain: " MAILGUN_DOMAIN
read -sp "  API Key: " MAILGUN_API_KEY
echo ""
read -p "  From Email (default: noreply@yourdomain.com): " MAILGUN_FROM_EMAIL
MAILGUN_FROM_EMAIL=${MAILGUN_FROM_EMAIL:-noreply@yourdomain.com}
read -p "  From Name (default: Secure Gate): " MAILGUN_FROM_NAME
MAILGUN_FROM_NAME=${MAILGUN_FROM_NAME:-"Secure Gate"}

echo ""
echo -e "${GREEN}✓ API credentials collected${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Deployment URLs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After deploying to Netlify, you'll get a URL like: https://your-site.netlify.app"
read -p "Enter your Netlify URL (or press Enter to use placeholder): " NETLIFY_URL
NETLIFY_URL=${NETLIFY_URL:-"https://your-site.netlify.app"}

echo ""
echo "Your Render URL will be: https://securegate-api.onrender.com"
echo "(or your custom service name)"
read -p "Enter your Render URL (default: https://securegate-api.onrender.com): " RENDER_URL
RENDER_URL=${RENDER_URL:-"https://securegate-api.onrender.com"}

echo ""
echo -e "${GREEN}✓ URLs configured${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5: Generate Environment Variable Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate Render environment variables file
cat > "$RENDER_ENV_FILE" << EOF
# ================================================================
# RENDER ENVIRONMENT VARIABLES
# Copy these into Render Dashboard → Environment Variables
# Generated: $(date)
# ================================================================

# DATABASE
DATABASE_URL=$DATABASE_URL
PGHOST=$PGHOST
PGPORT=$PGPORT
PGDATABASE=$PGDATABASE
PGUSER=$PGUSER
PGPASSWORD=$PGPASSWORD

# SECURITY - JWT
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
SESSION_SECRET=$SESSION_SECRET

# SERVER CONFIGURATION
NODE_ENV=production
PORT=3001
TRUST_PROXY=true
ENFORCE_HTTPS=true
SECURE_COOKIES=true

# SMS - AFRICA'S TALKING
AT_USERNAME=$AT_USERNAME
AT_API_KEY=$AT_API_KEY
SMS_PROVIDER=africastalking
ENABLE_SMS_NOTIFICATIONS=true

# EMAIL - MAILGUN
MAILGUN_API_KEY=$MAILGUN_API_KEY
MAILGUN_DOMAIN=$MAILGUN_DOMAIN
MAILGUN_BASE_URL=https://api.mailgun.net
MAILGUN_FROM_EMAIL=$MAILGUN_FROM_EMAIL
MAILGUN_FROM_NAME=$MAILGUN_FROM_NAME
EMAIL_PROVIDER=mailgun
ENABLE_EMAIL_NOTIFICATIONS=true

# SITE CONFIGURATION
SITE_NAME=Secure Gate Access
ENABLE_EXTERNAL_NOTIFICATIONS=true
EMAIL_VERIFICATION_REQUIRED=false
CLIENT_ORIGIN=$NETLIFY_URL

# ================================================================
# HOW TO USE:
# 1. Go to Render Dashboard → Your Service → Environment
# 2. Click "Add Environment Variable"
# 3. Copy-paste each variable name and value
# 4. Click "Save Changes"
# ================================================================
EOF

# Generate Netlify environment variables file
cat > "$NETLIFY_ENV_FILE" << EOF
# ================================================================
# NETLIFY ENVIRONMENT VARIABLES
# Copy these into Netlify Dashboard → Site Settings → Environment Variables
# Generated: $(date)
# ================================================================

REACT_APP_API_URL=$RENDER_URL
REACT_APP_WS_URL=${RENDER_URL/https/wss}
REACT_APP_VERSION=1.0.0
NODE_VERSION=18
CI=false
GENERATE_SOURCEMAP=false

# ================================================================
# HOW TO USE:
# 1. Go to Netlify Dashboard → Site Settings → Environment Variables
# 2. Click "Add a variable" → "Add a single variable"
# 3. Copy-paste each variable name and value
# 4. Click "Create variable"
# 5. After all variables added, go to Deploys → Trigger deploy → Clear cache and deploy
# ================================================================
EOF

echo -e "${GREEN}✓ Environment variable files generated:${NC}"
echo "  1. $RENDER_ENV_FILE (for Render)"
echo "  2. $NETLIFY_ENV_FILE (for Netlify)"
echo "  3. $SECRETS_FILE (backup - keep secure)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Generated Files:${NC}"
echo "  📄 $RENDER_ENV_FILE - Render environment variables"
echo "  📄 $NETLIFY_ENV_FILE - Netlify environment variables"
echo "  🔐 $SECRETS_FILE - Backup of secrets (KEEP SECURE)"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Review the generated files"
echo "  2. Deploy server to Render using $RENDER_ENV_FILE"
echo "  3. Deploy client to Netlify using $NETLIFY_ENV_FILE"
echo "  4. Run verification script: ./verify-deployment.sh"
echo "  5. SECURE $SECRETS_FILE or delete after deployment"
echo ""
echo -e "${YELLOW}⚠️  SECURITY REMINDER:${NC}"
echo "  - Do NOT commit $SECRETS_FILE to Git"
echo "  - Do NOT share these files publicly"
echo "  - Store secrets in a secure password manager"
echo "  - Rotate secrets every 90 days"
echo ""
echo -e "${GREEN}✨ Setup complete! Ready to deploy.${NC}"
echo ""

# Create .gitignore entry if not exists
if ! grep -q "$SECRETS_FILE" .gitignore 2>/dev/null; then
    echo "$SECRETS_FILE" >> .gitignore
    echo "$RENDER_ENV_FILE" >> .gitignore
    echo "$NETLIFY_ENV_FILE" >> .gitignore
    echo -e "${GREEN}✓ Added generated files to .gitignore${NC}"
fi
