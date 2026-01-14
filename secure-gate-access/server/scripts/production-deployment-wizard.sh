#!/bin/bash

# Production Deployment Wizard
# Interactive step-by-step deployment assistant
# Created: $(date)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SERVER_DIR/.env.production"
KEYS_FILE=$(find "$SERVER_DIR" -name "production-keys-*.txt" 2>/dev/null | head -n 1)

# Progress tracking
STEP=0
TOTAL_STEPS=10

# Log file
LOG_FILE="$SERVER_DIR/deployment-wizard-$(date +%Y%m%d_%H%M%S).log"

#=============================================================================
# Helper Functions
#=============================================================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

print_header() {
    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_step() {
    STEP=$((STEP + 1))
    echo ""
    echo -e "${BOLD}${MAGENTA}[Step $STEP/$TOTAL_STEPS]${NC} ${BOLD}$1${NC}"
    echo ""
    log "Starting step $STEP/$TOTAL_STEPS: $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    log "SUCCESS: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
    log "WARNING: $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    log "ERROR: $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

ask_confirmation() {
    local prompt="$1"
    local default="${2:-n}"
    
    if [ "$default" = "y" ]; then
        read -p "$(echo -e ${CYAN}$prompt [Y/n]: ${NC})" response
        response=${response:-y}
    else
        read -p "$(echo -e ${CYAN}$prompt [y/N]: ${NC})" response
        response=${response:-n}
    fi
    
    [[ "$response" =~ ^[Yy] ]]
}

wait_for_continue() {
    echo ""
    read -p "$(echo -e ${YELLOW}Press Enter to continue...${NC})"
}

check_prerequisite() {
    local cmd="$1"
    local name="$2"
    
    if ! command -v "$cmd" &> /dev/null; then
        print_error "$name is not installed. Please install it first."
        return 1
    fi
    print_success "$name is available"
    return 0
}

#=============================================================================
# Pre-flight Checks
#=============================================================================

preflight_checks() {
    print_step "Pre-flight System Checks"
    
    print_info "Checking prerequisites..."
    
    check_prerequisite "node" "Node.js" || exit 1
    check_prerequisite "npm" "NPM" || exit 1
    check_prerequisite "psql" "PostgreSQL client" || print_warning "PostgreSQL client not found (optional)"
    check_prerequisite "git" "Git" || exit 1
    
    # Check if .env.production exists
    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env.production file not found!"
        exit 1
    fi
    print_success ".env.production file found"
    
    # Check if keys file exists
    if [ -n "$KEYS_FILE" ] && [ -f "$KEYS_FILE" ]; then
        print_success "Generated keys file found: $(basename "$KEYS_FILE")"
    else
        print_warning "Generated keys file not found"
    fi
    
    echo ""
    print_info "Current environment: $(grep NODE_ENV "$ENV_FILE" | cut -d'=' -f2)"
    print_info "Server directory: $SERVER_DIR"
    
    wait_for_continue
}

#=============================================================================
# Step 1: Environment Configuration
#=============================================================================

configure_environment() {
    print_step "Configure Environment Variables"
    
    print_info "Current .env.production needs to be updated with production values."
    echo ""
    
    # Check for placeholder values
    local placeholders=0
    
    if grep -q "username:password@host" "$ENV_FILE"; then
        print_warning "DATABASE_URL contains placeholder values"
        placeholders=$((placeholders + 1))
    fi
    
    if grep -q "smtp.provider.com" "$ENV_FILE"; then
        print_warning "SMTP settings contain placeholder values"
        placeholders=$((placeholders + 1))
    fi
    
    if grep -q "your-" "$ENV_FILE"; then
        print_warning "Found placeholder values in configuration"
        placeholders=$((placeholders + 1))
    fi
    
    echo ""
    
    if [ $placeholders -gt 0 ]; then
        print_error "Found $placeholders placeholder value(s) that need updating"
        echo ""
        print_info "You need to update .env.production with:"
        echo "  • DATABASE_URL (production database connection)"
        echo "  • SMTP credentials (email service)"
        echo "  • Twilio credentials (SMS service)"
        echo "  • CORS_ORIGIN (your frontend domain)"
        echo "  • Any other service-specific values"
        echo ""
        
        if ask_confirmation "Open .env.production for editing?"; then
            ${EDITOR:-nano} "$ENV_FILE"
        fi
        
        echo ""
        if ! ask_confirmation "Have you updated all placeholder values?" "n"; then
            print_error "Please update .env.production before continuing"
            exit 1
        fi
    else
        print_success "No obvious placeholder values found"
    fi
    
    # Verify critical security settings
    print_info "Verifying critical security settings..."
    
    if grep -q "OTP_DEBUG_ECHO=false" "$ENV_FILE"; then
        print_success "OTP_DEBUG_ECHO is correctly set to false"
    else
        print_error "OTP_DEBUG_ECHO must be set to false!"
        exit 1
    fi
    
    if grep -q "NODE_ENV=production" "$ENV_FILE"; then
        print_success "NODE_ENV is set to production"
    else
        print_error "NODE_ENV must be set to production!"
        exit 1
    fi
    
    wait_for_continue
}

#=============================================================================
# Step 2: Secrets Management
#=============================================================================

manage_secrets() {
    print_step "Secrets Management"
    
    print_info "Production secrets must be stored in a secure secrets manager."
    echo ""
    print_info "Required secrets to store:"
    echo "  • ENCRYPTION_KEY"
    echo "  • JWT_SECRET"
    echo "  • JWT_REFRESH_SECRET"
    echo "  • SESSION_SECRET"
    echo "  • DATABASE_URL (credentials)"
    echo "  • SMTP credentials"
    echo "  • Twilio credentials"
    echo ""
    
    if [ -n "$KEYS_FILE" ] && [ -f "$KEYS_FILE" ]; then
        print_warning "Local keys file exists: $KEYS_FILE"
        print_info "These keys are also in .env.production"
        echo ""
        print_info "Recommended secrets managers:"
        echo "  • AWS Secrets Manager (recommended for AWS)"
        echo "  • HashiCorp Vault"
        echo "  • Azure Key Vault"
        echo "  • Google Cloud Secret Manager"
        echo "  • Environment variables in your hosting platform"
        echo ""
    fi
    
    if ask_confirmation "Have you stored all secrets in a secure secrets manager?" "n"; then
        print_success "Secrets stored securely"
        
        if [ -n "$KEYS_FILE" ] && [ -f "$KEYS_FILE" ]; then
            echo ""
            if ask_confirmation "Delete the local keys file ($KEYS_FILE)?" "n"; then
                rm -f "$KEYS_FILE"
                print_success "Local keys file deleted"
            else
                print_warning "Remember to delete the keys file after deployment!"
            fi
        fi
    else
        print_warning "Please store secrets securely before deploying to production"
        print_info "You can continue for now, but this is CRITICAL for production security"
        
        if ! ask_confirmation "Continue anyway (not recommended for production)?"; then
            exit 1
        fi
    fi
    
    wait_for_continue
}

#=============================================================================
# Step 3: Database Setup
#=============================================================================

setup_database() {
    print_step "Database Setup & Verification"
    
    print_info "Verifying database connection and setup..."
    echo ""
    
    # Extract database URL
    DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2-)
    
    if [[ "$DB_URL" =~ username:password@host ]]; then
        print_error "Database URL still contains placeholder values!"
        print_info "Please update DATABASE_URL in .env.production"
        exit 1
    fi
    
    print_info "Database URL configured: ${DB_URL:0:30}..."
    echo ""
    
    print_info "Database checklist:"
    echo "  1. Production database created"
    echo "  2. Database user created with appropriate permissions"
    echo "  3. Connection tested from deployment server"
    echo "  4. Firewall rules configured (if applicable)"
    echo "  5. Backup of existing data (if any)"
    echo ""
    
    if ask_confirmation "Is the production database ready?" "n"; then
        print_success "Database is ready"
        
        # Test connection if psql is available
        if command -v psql &> /dev/null; then
            echo ""
            if ask_confirmation "Test database connection now?"; then
                print_info "Testing connection..."
                if psql "$DB_URL" -c "SELECT version();" &> /dev/null; then
                    print_success "Database connection successful!"
                else
                    print_error "Database connection failed!"
                    print_info "Please verify your DATABASE_URL and database setup"
                    exit 1
                fi
            fi
        fi
    else
        print_error "Please set up the production database before continuing"
        exit 1
    fi
    
    wait_for_continue
}

#=============================================================================
# Step 4: Database Migrations
#=============================================================================

apply_migrations() {
    print_step "Apply Database Migrations"
    
    print_info "Migrations will be applied using the automated migration script."
    echo ""
    
    MIGRATION_SCRIPT="$SCRIPT_DIR/apply-production-migrations.sh"
    
    if [ ! -f "$MIGRATION_SCRIPT" ]; then
        print_error "Migration script not found: $MIGRATION_SCRIPT"
        exit 1
    fi
    
    print_info "Migration script: $(basename "$MIGRATION_SCRIPT")"
    print_info "This script will:"
    echo "  • Verify database connection"
    echo "  • Create backup before migration"
    echo "  • Apply all pending migrations"
    echo "  • Verify migration success"
    echo "  • Create rollback point"
    echo ""
    
    print_warning "This is a critical operation. Ensure you have:"
    echo "  • Database backup"
    echo "  • Tested migrations in staging"
    echo "  • Rollback plan ready"
    echo ""
    
    if ask_confirmation "Apply database migrations now?"; then
        print_info "Running migration script..."
        echo ""
        
        if bash "$MIGRATION_SCRIPT"; then
            print_success "Migrations applied successfully!"
        else
            print_error "Migration failed! Check the logs."
            print_info "Do NOT proceed with deployment until migrations succeed."
            exit 1
        fi
    else
        print_warning "Migrations not applied. You'll need to run them manually later."
        print_info "Run: ./scripts/apply-production-migrations.sh"
    fi
    
    wait_for_continue
}

#=============================================================================
# Step 5: Install Dependencies
#=============================================================================

install_dependencies() {
    print_step "Install Production Dependencies"
    
    print_info "Installing dependencies with production optimizations..."
    echo ""
    
    cd "$SERVER_DIR"
    
    if ask_confirmation "Install/update npm dependencies?" "y"; then
        print_info "Running npm ci (clean install)..."
        
        if npm ci --production=false; then
            print_success "Dependencies installed successfully"
            
            # Show production package count
            PKG_COUNT=$(npm list --production --depth=0 2>/dev/null | grep -c "├\|└" || echo "unknown")
            print_info "Production packages: $PKG_COUNT"
        else
            print_error "Dependency installation failed!"
            exit 1
        fi
    else
        print_warning "Skipped dependency installation"
    fi
    
    wait_for_continue
}

#=============================================================================
# Step 6: Run Tests
#=============================================================================

run_tests() {
    print_step "Run Test Suite"
    
    print_info "Running comprehensive test suite before deployment..."
    echo ""
    
    cd "$SERVER_DIR"
    
    if ask_confirmation "Run full test suite?" "y"; then
        print_info "Running tests..."
        echo ""
        
        # Run tests
        if npm test 2>&1 | tee -a "$LOG_FILE"; then
            print_success "All tests passed!"
        else
            print_error "Tests failed!"
            print_warning "Do NOT deploy with failing tests!"
            
            if ! ask_confirmation "Continue anyway (NOT RECOMMENDED)?"; then
                exit 1
            fi
        fi
    else
        print_warning "Tests skipped (NOT RECOMMENDED for production)"
    fi
    
    wait_for_continue
}

#=============================================================================
# Step 7: Data Migration
#=============================================================================

migrate_data() {
    print_step "Data Migration Scripts"
    
    print_info "Running data migration scripts for existing data..."
    echo ""
    
    MIGRATE_ID_SCRIPT="$SCRIPT_DIR/migrate-id-numbers.js"
    MIGRATE_QR_SCRIPT="$SCRIPT_DIR/migrate-qr-codes.js"
    
    # Check if migration scripts exist
    if [ ! -f "$MIGRATE_ID_SCRIPT" ]; then
        print_warning "ID number migration script not found"
        MIGRATE_ID_SCRIPT=""
    fi
    
    if [ ! -f "$MIGRATE_QR_SCRIPT" ]; then
        print_warning "QR code migration script not found"
        MIGRATE_QR_SCRIPT=""
    fi
    
    if [ -z "$MIGRATE_ID_SCRIPT" ] && [ -z "$MIGRATE_QR_SCRIPT" ]; then
        print_info "No data migration scripts found - this is okay for new installations"
        wait_for_continue
        return
    fi
    
    print_info "These scripts will:"
    echo "  • Encrypt existing ID numbers (if any)"
    echo "  • Tokenize existing QR codes (if any)"
    echo "  • Preserve data integrity"
    echo ""
    
    print_warning "Run these AFTER database migrations are complete"
    echo ""
    
    if ask_confirmation "Run data migration scripts?"; then
        # Migrate ID numbers
        if [ -n "$MIGRATE_ID_SCRIPT" ]; then
            print_info "Migrating ID numbers..."
            if node "$MIGRATE_ID_SCRIPT" 2>&1 | tee -a "$LOG_FILE"; then
                print_success "ID numbers migrated"
            else
                print_error "ID migration failed!"
                exit 1
            fi
        fi
        
        # Migrate QR codes
        if [ -n "$MIGRATE_QR_SCRIPT" ]; then
            print_info "Migrating QR codes..."
            if node "$MIGRATE_QR_SCRIPT" 2>&1 | tee -a "$LOG_FILE"; then
                print_success "QR codes migrated"
            else
                print_error "QR migration failed!"
                exit 1
            fi
        fi
    else
        print_warning "Data migration skipped"
        print_info "You can run these manually later:"
        [ -n "$MIGRATE_ID_SCRIPT" ] && echo "  • node scripts/migrate-id-numbers.js"
        [ -n "$MIGRATE_QR_SCRIPT" ] && echo "  • node scripts/migrate-qr-codes.js"
    fi
    
    wait_for_continue
}

#=============================================================================
# Step 8: Build & Deploy
#=============================================================================

build_and_deploy() {
    print_step "Build Application for Production"
    
    print_info "Building application with production optimizations..."
    echo ""
    
    cd "$SERVER_DIR"
    
    # Check if there's a build script
    if grep -q "\"build\"" package.json 2>/dev/null; then
        if ask_confirmation "Run production build?" "y"; then
            print_info "Building..."
            
            if npm run build 2>&1 | tee -a "$LOG_FILE"; then
                print_success "Build completed successfully"
            else
                print_error "Build failed!"
                exit 1
            fi
        fi
    else
        print_info "No build script found - skipping build step"
    fi
    
    echo ""
    print_info "Deployment options:"
    echo "  1. Deploy to cloud platform (Render, Heroku, AWS, etc.)"
    echo "  2. Deploy to VPS/server (PM2, Docker, etc.)"
    echo "  3. Deploy via CI/CD pipeline"
    echo ""
    
    print_info "Common deployment commands:"
    echo "  • Render: git push (if auto-deploy enabled)"
    echo "  • Heroku: git push heroku main"
    echo "  • PM2: pm2 start ecosystem.config.cjs --env production"
    echo "  • Docker: docker-compose -f docker-compose.prod.yml up -d"
    echo ""
    
    print_warning "Remember to set environment variables in your hosting platform!"
    
    wait_for_continue
}

#=============================================================================
# Step 9: Post-Deployment Verification
#=============================================================================

verify_deployment() {
    print_step "Post-Deployment Verification"
    
    print_info "After deployment, verify the following:"
    echo ""
    
    echo "1. Health Check:"
    echo "   • API responds: GET /api/health"
    echo "   • Database connected"
    echo "   • All services initialized"
    echo ""
    
    echo "2. Security Verification:"
    echo "   • OTP does NOT echo in production"
    echo "   • HTTPS/TLS enabled"
    echo "   • CORS configured correctly"
    echo "   • Rate limiting active"
    echo ""
    
    echo "3. Feature Testing:"
    echo "   • User registration works"
    echo "   • Login/authentication works"
    echo "   • QR code generation works"
    echo "   • Access logging works"
    echo "   • Email notifications work"
    echo "   • SMS notifications work (if enabled)"
    echo ""
    
    echo "4. Monitor for Issues:"
    echo "   • Check error logs"
    echo "   • Monitor API response times"
    echo "   • Watch database performance"
    echo "   • Track failed requests"
    echo ""
    
    if ask_confirmation "Is the application deployed and accessible?"; then
        echo ""
        read -p "$(echo -e ${CYAN}Enter your application URL: ${NC})" APP_URL
        
        if [ -n "$APP_URL" ]; then
            print_info "Testing health endpoint..."
            
            if command -v curl &> /dev/null; then
                if curl -sSf "${APP_URL}/api/health" > /dev/null 2>&1; then
                    print_success "Health check passed!"
                else
                    print_warning "Health check failed - verify the URL and deployment"
                fi
            else
                print_info "curl not available - test manually: ${APP_URL}/api/health"
            fi
        fi
    fi
    
    wait_for_continue
}

#=============================================================================
# Step 10: Final Checklist & Next Steps
#=============================================================================

final_checklist() {
    print_step "Final Checklist & Next Steps"
    
    print_info "Reviewing deployment status..."
    echo ""
    
    # Create deployment summary
    SUMMARY_FILE="$SERVER_DIR/DEPLOYMENT_SUMMARY_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=================================="
        echo "DEPLOYMENT SUMMARY"
        echo "=================================="
        echo ""
        echo "Date: $(date)"
        echo "Deployed by: $(whoami)"
        echo "Server: $(hostname)"
        echo ""
        echo "COMPLETED STEPS:"
        echo "✓ Environment configured"
        echo "✓ Secrets managed"
        echo "✓ Database setup"
        echo "✓ Migrations applied"
        echo "✓ Dependencies installed"
        echo "✓ Tests passed"
        echo "✓ Data migrated"
        echo "✓ Application deployed"
        echo "✓ Deployment verified"
        echo ""
        echo "NEXT STEPS:"
        echo "1. Monitor application for 24-48 hours"
        echo "2. Set up monitoring/alerting"
        echo "3. Configure backup schedule"
        echo "4. Update documentation"
        echo "5. Notify stakeholders"
        echo ""
        echo "ROLLBACK PLAN:"
        echo "If issues occur, see PRODUCTION_DEPLOYMENT_CHECKLIST.md"
        echo "Database backup available for restoration"
        echo ""
    } > "$SUMMARY_FILE"
    
    print_success "Deployment summary created: $(basename "$SUMMARY_FILE")"
    echo ""
    
    print_header "🎉 DEPLOYMENT WIZARD COMPLETE!"
    
    echo -e "${GREEN}Your Secure Gate Access system is now deployed!${NC}"
    echo ""
    echo "📊 Immediate Next Steps:"
    echo "  1. Monitor error logs for the next 24-48 hours"
    echo "  2. Test all critical user flows"
    echo "  3. Set up monitoring and alerting"
    echo "  4. Configure automated backups"
    echo "  5. Document any deployment-specific notes"
    echo ""
    echo "📁 Important Files:"
    echo "  • Deployment log: $(basename "$LOG_FILE")"
    echo "  • Deployment summary: $(basename "$SUMMARY_FILE")"
    echo "  • Production checklist: PRODUCTION_DEPLOYMENT_CHECKLIST.md"
    echo ""
    echo "🔒 Security Reminders:"
    echo "  • Never commit .env.production to version control"
    echo "  • Rotate secrets regularly (quarterly recommended)"
    echo "  • Monitor access logs for suspicious activity"
    echo "  • Keep dependencies updated"
    echo ""
    echo "📞 Support:"
    echo "  • Documentation: See MASTER_INDEX.md"
    echo "  • Troubleshooting: See PRODUCTION_DEPLOYMENT_CHECKLIST.md"
    echo ""
    
    print_success "All done! Your application is live. 🚀"
}

#=============================================================================
# Main Execution
#=============================================================================

main() {
    clear
    
    print_header "🚀 Secure Gate Access - Production Deployment Wizard"
    
    echo -e "${BOLD}This wizard will guide you through the complete production deployment process.${NC}"
    echo ""
    echo "Steps to complete:"
    echo "  1. Pre-flight system checks"
    echo "  2. Environment configuration"
    echo "  3. Secrets management"
    echo "  4. Database setup"
    echo "  5. Database migrations"
    echo "  6. Install dependencies"
    echo "  7. Run tests"
    echo "  8. Data migration"
    echo "  9. Build & deploy"
    echo " 10. Post-deployment verification"
    echo ""
    
    print_warning "Ensure you have:"
    echo "  • Production database credentials"
    echo "  • SMTP/email service credentials"
    echo "  • Twilio credentials (for SMS)"
    echo "  • Access to secrets manager"
    echo "  • Backup of any existing data"
    echo ""
    
    if ! ask_confirmation "Are you ready to begin the deployment?"; then
        echo ""
        print_info "Deployment cancelled. Run this script again when ready."
        exit 0
    fi
    
    # Execute all steps
    preflight_checks
    configure_environment
    manage_secrets
    setup_database
    apply_migrations
    install_dependencies
    run_tests
    migrate_data
    build_and_deploy
    verify_deployment
    final_checklist
    
    echo ""
    print_success "Deployment wizard completed successfully!"
}

# Run main function
main "$@"
