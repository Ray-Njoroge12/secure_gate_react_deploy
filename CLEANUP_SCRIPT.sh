#!/bin/bash
# Secure Gate - Pre-Deployment Cleanup Script
# Run this before deploying to production

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 SECURE GATE - PRE-DEPLOYMENT CLEANUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Project root
PROJECT_ROOT="/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access"
cd "$PROJECT_ROOT"

# Counter
CLEANED=0

echo -e "${BLUE}1️⃣  Removing Log Files...${NC}"
if [ -f "server/diagnostics.log" ]; then
    rm -f server/diagnostics.log
    echo "  ✅ Removed diagnostics.log"
    CLEANED=$((CLEANED + 1))
fi

if [ -f "server/server.log" ]; then
    rm -f server/server.log
    echo "  ✅ Removed server.log"
    CLEANED=$((CLEANED + 1))
fi

if [ -d "server/logs" ]; then
    LOG_COUNT=$(find server/logs -name "*.log" | wc -l)
    if [ $LOG_COUNT -gt 0 ]; then
        rm -f server/logs/*.log
        echo "  ✅ Removed $LOG_COUNT log files from server/logs/"
        CLEANED=$((CLEANED + LOG_COUNT))
    fi
fi
echo ""

echo -e "${BLUE}2️⃣  Removing macOS Files...${NC}"
DS_COUNT=$(find . -name ".DS_Store" | wc -l)
if [ $DS_COUNT -gt 0 ]; then
    find . -name ".DS_Store" -delete
    echo "  ✅ Removed $DS_COUNT .DS_Store files"
    CLEANED=$((CLEANED + DS_COUNT))
else
    echo "  ℹ️  No .DS_Store files found"
fi
echo ""

echo -e "${BLUE}3️⃣  Updating .gitignore...${NC}"
if [ ! -f .gitignore ]; then
    touch .gitignore
fi

# Add entries if not present
grep -q "^\*.log$" .gitignore || echo "*.log" >> .gitignore
grep -q "^logs/$" .gitignore || echo "logs/" >> .gitignore
grep -q "^\.DS_Store$" .gitignore || echo ".DS_Store" >> .gitignore
grep -q "^\.env\.local$" .gitignore || echo ".env.local" >> .gitignore
echo "  ✅ .gitignore updated"
echo ""

echo -e "${BLUE}4️⃣  Checking Configuration...${NC}"

# Check NODE_ENV
if grep -q "NODE_ENV: development" docker-compose.prod.yml; then
    echo -e "  ${YELLOW}⚠️  WARNING: NODE_ENV is still 'development'${NC}"
    echo "     Change to 'production' before deploying"
else
    echo "  ✅ NODE_ENV is set to production"
fi

# Check HTTPS
if grep -q 'ENFORCE_HTTPS.*false' docker-compose.prod.yml; then
    echo -e "  ${YELLOW}⚠️  WARNING: ENFORCE_HTTPS is false${NC}"
    echo "     Enable for production deployment"
else
    echo "  ✅ ENFORCE_HTTPS enabled"
fi
echo ""

echo -e "${BLUE}5️⃣  Checking Code Issues...${NC}"

# Check for temporary debug code
if grep -q "// attachRequestAudit" server/src/routes/visitorRoutes.js; then
    echo -e "  ${YELLOW}⚠️  WARNING: Audit middleware is commented out${NC}"
    echo "     Location: server/src/routes/visitorRoutes.js:191"
else
    echo "  ✅ Audit middleware enabled"
fi

# Check for console.logs
CONSOLE_COUNT=$(find server/src -name "*.js" -exec grep -l "console\.log" {} \; 2>/dev/null | wc -l)
if [ $CONSOLE_COUNT -gt 5 ]; then
    echo -e "  ${YELLOW}⚠️  INFO: Found $CONSOLE_COUNT files with console.log${NC}"
    echo "     Consider replacing with proper logging"
else
    echo "  ✅ Console.log usage acceptable"
fi
echo ""

echo -e "${BLUE}6️⃣  Checking Database...${NC}"
echo "  ℹ️  Connect to database and verify:"
echo "     - Test users removed or passwords changed"
echo "     - performance_metrics table created"
echo ""

echo -e "${BLUE}7️⃣  Security Checklist...${NC}"
echo "  [ ] Environment variables secured"
echo "  [ ] No hardcoded secrets in code"
echo "  [ ] HTTPS enforcement enabled"
echo "  [ ] Test users removed/secured"
echo "  [ ] Rate limiting configured for Redis"
echo "  [ ] SSL enabled for PostgreSQL"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ Cleanup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "  - Files cleaned: $CLEANED"
echo "  - .gitignore updated"
echo "  - Configuration checked"
echo ""
echo -e "${YELLOW}⚠️  Manual Actions Required:${NC}"
echo "  1. Review docker-compose.prod.yml configuration"
echo "  2. Re-enable audit middleware in visitorRoutes.js"
echo "  3. Remove or secure test database users"
echo "  4. Create missing database tables"
echo "  5. Run final security audit"
echo ""
echo "📝 Next Steps:"
echo "  - Run tests: npm test"
echo "  - Build: docker-compose -f docker-compose.prod.yml build"
echo "  - Deploy to staging first"
echo ""
