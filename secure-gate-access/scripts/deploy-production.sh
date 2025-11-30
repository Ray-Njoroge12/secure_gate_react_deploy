#!/bin/bash

# ============================================================
# SECURE GATE - PRODUCTION DEPLOYMENT SCRIPT
# ============================================================
# This script prepares and deploys the application
# ============================================================

set -e

echo "============================================================"
echo "🚀 SECURE GATE - PRODUCTION DEPLOYMENT"
echo "============================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "Project root: $PROJECT_ROOT"
echo ""

# ============================================================
# PRE-FLIGHT CHECKS
# ============================================================
echo "============================================================"
echo "📋 PRE-FLIGHT CHECKS"
echo "============================================================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

# Check AWS CLI (optional but recommended)
if command -v aws &> /dev/null; then
    echo -e "${GREEN}✅ AWS CLI: $(aws --version | cut -d' ' -f1)${NC}"
else
    echo -e "${YELLOW}⚠️  AWS CLI not found (optional)${NC}"
fi

echo ""

# ============================================================
# BUILD CLIENT
# ============================================================
echo "============================================================"
echo "🔨 BUILDING REACT CLIENT"
echo "============================================================"

cd "$PROJECT_ROOT/client"

echo "Installing dependencies..."
npm ci --production=false

echo "Building production bundle..."
GENERATE_SOURCEMAP=false npm run build

if [ -d "build" ]; then
    echo -e "${GREEN}✅ Client build successful${NC}"
    echo "   Build size: $(du -sh build | cut -f1)"
else
    echo -e "${RED}❌ Client build failed${NC}"
    exit 1
fi

echo ""

# ============================================================
# PREPARE SERVER
# ============================================================
echo "============================================================"
echo "📦 PREPARING SERVER"
echo "============================================================"

cd "$PROJECT_ROOT/server"

echo "Installing production dependencies..."
npm ci --production

echo -e "${GREEN}✅ Server dependencies installed${NC}"

echo ""

# ============================================================
# RUN SECURITY AUDIT
# ============================================================
echo "============================================================"
echo "🔒 SECURITY AUDIT"
echo "============================================================"

cd "$PROJECT_ROOT/server"
echo "Running npm audit..."
npm audit --production || true

cd "$PROJECT_ROOT/client"
echo "Running client npm audit..."
npm audit --production || true

echo ""

# ============================================================
# ENVIRONMENT CHECK
# ============================================================
echo "============================================================"
echo "🔧 ENVIRONMENT CHECK"
echo "============================================================"

cd "$PROJECT_ROOT/server"

# Check for required env vars
REQUIRED_VARS=(
    "NODE_ENV"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "PGHOST"
    "PGDATABASE"
)

echo "Checking environment variables..."
MISSING_VARS=0

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo -e "${YELLOW}⚠️  $VAR not set${NC}"
        MISSING_VARS=$((MISSING_VARS + 1))
    else
        echo -e "${GREEN}✅ $VAR is set${NC}"
    fi
done

if [ $MISSING_VARS -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Warning: $MISSING_VARS environment variables not set${NC}"
    echo "Make sure to set them before starting the server"
fi

echo ""

# ============================================================
# DATABASE MIGRATIONS
# ============================================================
echo "============================================================"
echo "🗄️  DATABASE MIGRATIONS"
echo "============================================================"

cd "$PROJECT_ROOT/server"

if [ -f "src/database/migrations/run-migrations.js" ]; then
    echo "Running database migrations..."
    node src/database/migrations/run-migrations.js || {
        echo -e "${YELLOW}⚠️  Migration script not found or failed${NC}"
        echo "   Run migrations manually if needed"
    }
else
    echo -e "${YELLOW}⚠️  No migration script found${NC}"
    echo "   Run migrations manually: psql -f src/database/schema.sql"
fi

echo ""

# ============================================================
# FINAL SUMMARY
# ============================================================
echo "============================================================"
echo "✅ DEPLOYMENT PREPARATION COMPLETE"
echo "============================================================"
echo ""
echo "📁 Client build: $PROJECT_ROOT/client/build"
echo "📁 Server: $PROJECT_ROOT/server"
echo ""
echo "Next steps:"
echo "1. Set production environment variables"
echo "2. Run database migrations if not done"
echo "3. Start server: cd server && npm start"
echo ""
echo "For AWS deployment:"
echo "1. Upload client/build to S3"
echo "2. Deploy server to ECS/EC2"
echo "3. Configure ALB with HTTPS"
echo ""
echo "============================================================"
