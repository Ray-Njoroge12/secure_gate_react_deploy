#!/bin/bash

# Master Deployment Checklist
# Interactive checklist for production deployment
# All tasks in one place with progress tracking

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
CHECKLIST_FILE="$SERVER_DIR/.deployment-checklist-progress.txt"

# Initialize checklist if doesn't exist
if [ ! -f "$CHECKLIST_FILE" ]; then
    cat > "$CHECKLIST_FILE" << 'EOF'
# Deployment Checklist Progress
# Auto-generated - do not edit manually
# Format: TASK_ID=status (pending/done)

# Pre-Production
ENV_CONFIGURED=pending
SECRETS_STORED=pending
KEYS_FILE_DELETED=pending

# Database
DB_CREATED=pending
DB_CONNECTION_TESTED=pending
DB_BACKUP_READY=pending

# Migrations
MIGRATIONS_APPLIED=pending
DATA_MIGRATED=pending

# Testing
DEPENDENCIES_INSTALLED=pending
TESTS_PASSED=pending

# Security
SECURITY_VERIFIED=pending
OTP_ECHO_DISABLED=pending

# Deployment
APP_DEPLOYED=pending
HEALTH_CHECK_PASSED=pending

# Post-Deployment
MONITORING_CONFIGURED=pending
BACKUPS_SCHEDULED=pending
STAKEHOLDERS_NOTIFIED=pending
EOF
fi

source "$CHECKLIST_FILE"

# Helper functions
print_header() {
    clear
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  🚀 Secure Gate Access - Master Deployment Checklist${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BOLD}${MAGENTA}▶ $1${NC}"
    echo ""
}

task_status() {
    local var_name="$1"
    eval "local status=\$$var_name"
    
    if [ "$status" = "done" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}◯${NC}"
    fi
}

mark_done() {
    local var_name="$1"
    
    # Update in memory
    eval "$var_name=done"
    
    # Update file
    sed -i.bak "s/^$var_name=.*/$var_name=done/" "$CHECKLIST_FILE"
    rm -f "$CHECKLIST_FILE.bak"
}

ask_task() {
    local var_name="$1"
    local description="$2"
    local help_text="${3:-}"
    
    eval "local current=\$$var_name"
    
    echo -e "$(task_status $var_name) $description"
    
    if [ -n "$help_text" ]; then
        echo -e "   ${BLUE}→${NC} $help_text"
    fi
    
    if [ "$current" = "done" ]; then
        echo -e "   ${GREEN}Already completed${NC}"
        return
    fi
    
    echo -n "   Mark as done? [y/N]: "
    read -r response
    
    if [[ "$response" =~ ^[Yy] ]]; then
        mark_done "$var_name"
        echo -e "   ${GREEN}✓ Marked complete${NC}"
    fi
}

calculate_progress() {
    local total=17
    local done=0
    
    [ "$ENV_CONFIGURED" = "done" ] && done=$((done + 1))
    [ "$SECRETS_STORED" = "done" ] && done=$((done + 1))
    [ "$KEYS_FILE_DELETED" = "done" ] && done=$((done + 1))
    [ "$DB_CREATED" = "done" ] && done=$((done + 1))
    [ "$DB_CONNECTION_TESTED" = "done" ] && done=$((done + 1))
    [ "$DB_BACKUP_READY" = "done" ] && done=$((done + 1))
    [ "$MIGRATIONS_APPLIED" = "done" ] && done=$((done + 1))
    [ "$DATA_MIGRATED" = "done" ] && done=$((done + 1))
    [ "$DEPENDENCIES_INSTALLED" = "done" ] && done=$((done + 1))
    [ "$TESTS_PASSED" = "done" ] && done=$((done + 1))
    [ "$SECURITY_VERIFIED" = "done" ] && done=$((done + 1))
    [ "$OTP_ECHO_DISABLED" = "done" ] && done=$((done + 1))
    [ "$APP_DEPLOYED" = "done" ] && done=$((done + 1))
    [ "$HEALTH_CHECK_PASSED" = "done" ] && done=$((done + 1))
    [ "$MONITORING_CONFIGURED" = "done" ] && done=$((done + 1))
    [ "$BACKUPS_SCHEDULED" = "done" ] && done=$((done + 1))
    [ "$STAKEHOLDERS_NOTIFIED" = "done" ] && done=$((done + 1))
    
    echo "$done/$total"
}

show_progress_bar() {
    local progress=$(calculate_progress)
    local done=$(echo $progress | cut -d'/' -f1)
    local total=$(echo $progress | cut -d'/' -f2)
    local percent=$((done * 100 / total))
    
    echo -e "${BOLD}Progress: ${CYAN}$percent%${NC} ${BOLD}($progress complete)${NC}"
    echo ""
    
    local filled=$((percent / 5))
    local empty=$((20 - filled))
    printf "["
    printf "${GREEN}%0.s█${NC}" $(seq 1 $filled)
    printf "%0.s░" $(seq 1 $empty)
    printf "]\n"
}

# Main checklist
main() {
    print_header
    
    show_progress_bar
    
    echo ""
    echo -e "${BOLD}Complete each task and mark it done.${NC}"
    echo -e "You can run this script multiple times to track progress."
    echo ""
    
    # Pre-Production Setup
    print_section "1. Pre-Production Setup"
    
    ask_task "ENV_CONFIGURED" \
        "Environment variables configured" \
        "Update .env.production with DATABASE_URL, SMTP, Twilio, CORS_ORIGIN"
    
    echo ""
    ask_task "SECRETS_STORED" \
        "Secrets stored in secrets manager" \
        "Store ENCRYPTION_KEY, JWT secrets, DB credentials securely"
    
    echo ""
    ask_task "KEYS_FILE_DELETED" \
        "Local keys file deleted" \
        "Delete production-keys-*.txt after storing in secrets manager"
    
    # Database
    print_section "2. Database Setup"
    
    ask_task "DB_CREATED" \
        "Production database created" \
        "CREATE DATABASE secure_gate_production;"
    
    echo ""
    ask_task "DB_CONNECTION_TESTED" \
        "Database connection tested" \
        "psql \"\$DATABASE_URL\" -c \"SELECT version();\""
    
    echo ""
    ask_task "DB_BACKUP_READY" \
        "Database backup strategy ready" \
        "pg_dump or automated backup service configured"
    
    # Migrations
    print_section "3. Database Migrations"
    
    ask_task "MIGRATIONS_APPLIED" \
        "Database migrations applied" \
        "Run: ./scripts/apply-production-migrations.sh"
    
    echo ""
    ask_task "DATA_MIGRATED" \
        "Existing data migrated" \
        "Run: node scripts/migrate-id-numbers.js && node scripts/migrate-qr-codes.js"
    
    # Testing
    print_section "4. Testing & Validation"
    
    ask_task "DEPENDENCIES_INSTALLED" \
        "Production dependencies installed" \
        "Run: npm ci"
    
    echo ""
    ask_task "TESTS_PASSED" \
        "All tests passing" \
        "Run: npm test (should show 79 tests passed)"
    
    # Security
    print_section "5. Security Verification"
    
    ask_task "SECURITY_VERIFIED" \
        "Security settings verified" \
        "Run: ./scripts/quick-readiness-check.sh"
    
    echo ""
    ask_task "OTP_ECHO_DISABLED" \
        "OTP debug echo disabled" \
        "Verify: OTP_DEBUG_ECHO=false in .env.production"
    
    # Deployment
    print_section "6. Deployment"
    
    ask_task "APP_DEPLOYED" \
        "Application deployed to production" \
        "Deploy via cloud platform, PM2, or Docker"
    
    echo ""
    ask_task "HEALTH_CHECK_PASSED" \
        "Health check passing" \
        "curl https://your-domain.com/api/health"
    
    # Post-Deployment
    print_section "7. Post-Deployment"
    
    ask_task "MONITORING_CONFIGURED" \
        "Monitoring and alerting configured" \
        "Error tracking, performance monitoring, log aggregation"
    
    echo ""
    ask_task "BACKUPS_SCHEDULED" \
        "Automated backups scheduled" \
        "Daily database backups and retention policy"
    
    echo ""
    ask_task "STAKEHOLDERS_NOTIFIED" \
        "Stakeholders notified" \
        "Deployment announcement, documentation shared"
    
    # Final summary
    echo ""
    echo ""
    print_header
    show_progress_bar
    
    local progress=$(calculate_progress)
    local done=$(echo $progress | cut -d'/' -f1)
    local total=$(echo $progress | cut -d'/' -f2)
    
    echo ""
    if [ "$done" = "$total" ]; then
        echo -e "${GREEN}${BOLD}🎉 All tasks complete! Deployment successful!${NC}"
        echo ""
        echo "Next steps:"
        echo "  • Monitor for 24-48 hours"
        echo "  • Review PRODUCTION_NEXT_STEPS.md"
        echo "  • Document any deployment-specific notes"
    else
        local remaining=$((total - done))
        echo -e "${YELLOW}$remaining task(s) remaining${NC}"
        echo ""
        echo "Continue working through the checklist."
        echo "Run this script again to update progress."
    fi
    
    echo ""
    echo -e "${BLUE}Progress saved to: .deployment-checklist-progress.txt${NC}"
    echo ""
}

# Show menu
show_menu() {
    echo ""
    echo "Options:"
    echo "  1) Continue with checklist"
    echo "  2) Reset all progress"
    echo "  3) View current status"
    echo "  4) Exit"
    echo ""
    echo -n "Choose option [1-4]: "
    read -r choice
    
    case $choice in
        1)
            main
            ;;
        2)
            echo -n "Are you sure you want to reset all progress? [y/N]: "
            read -r confirm
            if [[ "$confirm" =~ ^[Yy] ]]; then
                rm -f "$CHECKLIST_FILE"
                echo "Progress reset."
                exec "$0"
            fi
            ;;
        3)
            source "$CHECKLIST_FILE"
            print_header
            show_progress_bar
            echo ""
            calculate_progress
            echo ""
            show_menu
            ;;
        4)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid option"
            show_menu
            ;;
    esac
}

# Start
source "$CHECKLIST_FILE"
show_menu
