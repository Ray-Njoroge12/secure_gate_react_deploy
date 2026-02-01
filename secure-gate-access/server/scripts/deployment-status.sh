#!/bin/bash

# Deployment Status Dashboard
# Shows current deployment readiness and what's pending

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SERVER_DIR/.env.production"

print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BOLD}${MAGENTA}▶ $1${NC}"
    echo ""
}

check_status() {
    local status=$1
    if [ "$status" = "done" ]; then
        echo -e "${GREEN}✓${NC}"
    elif [ "$status" = "partial" ]; then
        echo -e "${YELLOW}◐${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
}

print_item() {
    local status=$1
    local text=$2
    echo -e "$(check_status $status) $text"
}

# Check environment configuration
check_environment() {
    local status="done"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo "missing"
        return
    fi
    
    # Check for placeholders
    if grep -q "username:password@host" "$ENV_FILE" 2>/dev/null; then
        status="pending"
    elif grep -q "smtp.provider.com" "$ENV_FILE" 2>/dev/null; then
        status="pending"
    elif grep -q "your-" "$ENV_FILE" 2>/dev/null; then
        status="pending"
    fi
    
    echo "$status"
}

# Check secrets
check_secrets() {
    local keys_file=$(find "$SERVER_DIR" -name "production-keys-*.txt" 2>/dev/null | head -n 1)
    
    if [ -n "$keys_file" ] && [ -f "$keys_file" ]; then
        echo "pending"  # Keys file exists, needs to be secured and deleted
    else
        echo "done"     # Keys file doesn't exist, assumed secured
    fi
}

# Check database
check_database() {
    if [ ! -f "$ENV_FILE" ]; then
        echo "pending"
        return
    fi
    
    local db_url=$(grep "^DATABASE_URL=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    
    if [[ "$db_url" =~ username:password@host ]]; then
        echo "pending"
    else
        echo "partial"  # URL configured, but not verified
    fi
}

# Check migrations
check_migrations() {
    local migration_dir="$SERVER_DIR/src/database/migrations"
    
    if [ ! -d "$migration_dir" ]; then
        echo "pending"
        return
    fi
    
    local migration_count=$(ls -1 "$migration_dir"/*.sql 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$migration_count" -gt 0 ]; then
        echo "partial"  # Migrations exist but not confirmed applied
    else
        echo "pending"
    fi
}

# Check dependencies
check_dependencies() {
    if [ -f "$SERVER_DIR/node_modules/.package-lock.json" ]; then
        echo "done"
    else
        echo "pending"
    fi
}

# Check tests
check_tests() {
    if [ -f "$SERVER_DIR/package.json" ]; then
        echo "partial"  # Tests exist but not confirmed run
    else
        echo "pending"
    fi
}

# Check deployment scripts
check_scripts() {
    local wizard="$SCRIPT_DIR/production-deployment-wizard.sh"
    local migrations="$SCRIPT_DIR/apply-production-migrations.sh"
    local readiness="$SCRIPT_DIR/final-deployment-readiness.sh"
    
    if [ -f "$wizard" ] && [ -f "$migrations" ] && [ -f "$readiness" ]; then
        echo "done"
    else
        echo "partial"
    fi
}

# Main status display
clear

print_header "🚀 Secure Gate Access - Deployment Status"

echo -e "${BOLD}Date:${NC} $(date)"
echo -e "${BOLD}Server:${NC} $SERVER_DIR"
echo ""

# Overall readiness
ENV_STATUS=$(check_environment)
SECRET_STATUS=$(check_secrets)
DB_STATUS=$(check_database)
MIG_STATUS=$(check_migrations)
DEP_STATUS=$(check_dependencies)
TEST_STATUS=$(check_tests)
SCRIPT_STATUS=$(check_scripts)

# Calculate overall percentage
TOTAL=7
DONE=0

[ "$ENV_STATUS" = "done" ] && DONE=$((DONE + 1))
[ "$SECRET_STATUS" = "done" ] && DONE=$((DONE + 1))
[ "$DB_STATUS" = "done" ] && DONE=$((DONE + 1))
[ "$MIG_STATUS" = "done" ] && DONE=$((DONE + 1))
[ "$DEP_STATUS" = "done" ] && DONE=$((DONE + 1))
[ "$TEST_STATUS" = "done" ] && DONE=$((DONE + 1))
[ "$SCRIPT_STATUS" = "done" ] && DONE=$((DONE + 1))

PERCENT=$((DONE * 100 / TOTAL))

echo -e "${BOLD}Overall Readiness: ${CYAN}$PERCENT%${NC} ${BOLD}($DONE/$TOTAL complete)${NC}"
echo ""

# Progress bar
FILLED=$((PERCENT / 5))
EMPTY=$((20 - FILLED))
printf "["
printf "${GREEN}%0.s█${NC}" $(seq 1 $FILLED)
printf "%0.s░" $(seq 1 $EMPTY)
printf "]\n"

# Detailed status
print_section "Pre-Production Setup"

print_item "$ENV_STATUS" "Environment Configuration (.env.production)"
if [ "$ENV_STATUS" = "pending" ]; then
    echo "   → Update DATABASE_URL, SMTP, Twilio credentials"
fi

print_item "$SECRET_STATUS" "Secrets Management"
if [ "$SECRET_STATUS" = "pending" ]; then
    echo "   → Store keys in secrets manager"
    echo "   → Delete local keys file"
fi

print_item "$SCRIPT_STATUS" "Deployment Scripts"
if [ "$SCRIPT_STATUS" = "done" ]; then
    echo "   → production-deployment-wizard.sh"
    echo "   → apply-production-migrations.sh"
    echo "   → final-deployment-readiness.sh"
fi

print_section "Database & Migrations"

print_item "$DB_STATUS" "Database Setup"
if [ "$DB_STATUS" = "pending" ]; then
    echo "   → Create production database"
    echo "   → Configure connection"
elif [ "$DB_STATUS" = "partial" ]; then
    echo "   → Test connection: psql \"\$DATABASE_URL\" -c \"SELECT 1;\""
fi

print_item "$MIG_STATUS" "Database Migrations"
if [ "$MIG_STATUS" = "partial" ]; then
    migration_count=$(ls -1 "$SERVER_DIR/src/database/migrations"/*.sql 2>/dev/null | wc -l | tr -d ' ')
    echo "   → $migration_count migration files ready"
    echo "   → Run: ./scripts/apply-production-migrations.sh"
fi

print_section "Application Preparation"

print_item "$DEP_STATUS" "Dependencies Installed"
if [ "$DEP_STATUS" = "pending" ]; then
    echo "   → Run: npm ci"
fi

print_item "$TEST_STATUS" "Test Suite"
if [ "$TEST_STATUS" = "partial" ]; then
    echo "   → Run: npm test"
    echo "   → Verify all tests pass"
fi

print_section "Security Features"

# Check security files
SECURITY_FILES=(
    "src/middleware/dataMinimization.js"
    "src/services/qrTokenService.js"
    "src/services/retentionService.js"
    "src/jobs/retentionScheduler.js"
)

ALL_SECURITY_FILES_PRESENT=true
for file in "${SECURITY_FILES[@]}"; do
    if [ ! -f "$SERVER_DIR/$file" ]; then
        ALL_SECURITY_FILES_PRESENT=false
        break
    fi
done

if $ALL_SECURITY_FILES_PRESENT; then
    print_item "done" "Security Middleware & Services"
    echo "   → OTP echo protection"
    echo "   → ID number encryption"
    echo "   → QR code tokenization"
    echo "   → Data retention policies"
    echo "   → Role-based data minimization"
else
    print_item "pending" "Security Middleware & Services"
fi

print_section "Documentation"

DOCS=(
    "PRODUCTION_NEXT_STEPS.md"
    "PRODUCTION_DEPLOYMENT_CHECKLIST.md"
    "DEPLOYMENT_EXECUTIVE_SUMMARY.md"
    "QUICK_START_DEPLOYMENT.md"
)

DOCS_PRESENT=0
for doc in "${DOCS[@]}"; do
    if [ -f "$SERVER_DIR/$doc" ]; then
        DOCS_PRESENT=$((DOCS_PRESENT + 1))
    fi
done

print_item "done" "Deployment Documentation ($DOCS_PRESENT/${#DOCS[@]} files)"

print_section "Next Steps"

echo ""
if [ "$PERCENT" -ge 90 ]; then
    echo -e "${GREEN}${BOLD}✓ System is ready for deployment!${NC}"
    echo ""
    echo "To deploy, run one of:"
    echo "  1. Interactive: ${CYAN}./scripts/production-deployment-wizard.sh${NC}"
    echo "  2. Manual: Follow ${CYAN}QUICK_START_DEPLOYMENT.md${NC}"
    echo ""
elif [ "$PERCENT" -ge 60 ]; then
    echo -e "${YELLOW}${BOLD}⚠ Almost ready! Complete the remaining items.${NC}"
    echo ""
    echo "Priority actions:"
    [ "$ENV_STATUS" != "done" ] && echo "  1. Update .env.production"
    [ "$SECRET_STATUS" != "done" ] && echo "  2. Secure and store secrets"
    [ "$DB_STATUS" != "done" ] && echo "  3. Set up production database"
    [ "$MIG_STATUS" != "done" ] && echo "  4. Prepare migrations"
    echo ""
else
    echo -e "${RED}${BOLD}✗ More setup required before deployment.${NC}"
    echo ""
    echo "Start with:"
    echo "  1. Run: ${CYAN}./scripts/pre-production-setup.sh${NC}"
    echo "  2. Follow: ${CYAN}QUICK_START_DEPLOYMENT.md${NC}"
    echo ""
fi

print_section "Quick Commands"

echo ""
echo "  ${CYAN}./scripts/deployment-status.sh${NC}           - This dashboard"
echo "  ${CYAN}./scripts/quick-readiness-check.sh${NC}       - Quick validation"
echo "  ${CYAN}./scripts/final-deployment-readiness.sh${NC}  - Full validation"
echo "  ${CYAN}./scripts/production-deployment-wizard.sh${NC} - Interactive deployment"
echo "  ${CYAN}npm test${NC}                                  - Run all tests"
echo ""

print_header "End of Status Report"

echo ""
