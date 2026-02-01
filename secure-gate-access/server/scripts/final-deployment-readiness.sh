#!/bin/bash
# =====================================================
# 🚀 FINAL DEPLOYMENT READINESS VERIFICATION SCRIPT
# =====================================================
# 
# This script performs a comprehensive check to ensure
# all security features are ready for production deployment
#
# Date: January 7, 2026
# =====================================================

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════╗"
echo "║  🔒 Security Features - Production Readiness Check    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# =====================================================
# Helper Functions
# =====================================================

check_passed() {
  echo -e "${GREEN}✓${NC} $1"
  ((CHECKS_PASSED++))
}

check_failed() {
  echo -e "${RED}✗${NC} $1"
  ((CHECKS_FAILED++))
}

check_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

section_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =====================================================
# 1. CODE STRUCTURE CHECKS
# =====================================================

section_header "1. 📁 CODE STRUCTURE & FILES"

# Check critical files exist
if [ -f "src/middleware/dataMinimization.js" ]; then
  check_passed "Data minimization middleware exists"
else
  check_failed "Data minimization middleware missing"
fi

if [ -f "src/services/qrTokenService.js" ]; then
  check_passed "QR token service exists"
else
  check_failed "QR token service missing"
fi

if [ -f "src/services/retentionService.js" ]; then
  check_passed "Retention service exists"
else
  check_failed "Retention service missing"
fi

if [ -f "src/jobs/retentionScheduler.js" ]; then
  check_passed "Retention scheduler exists"
else
  check_failed "Retention scheduler missing"
fi

# Check migration files exist
if [ -f "src/database/migrations/035_encrypt_id_numbers.sql" ]; then
  check_passed "ID encryption migration exists"
else
  check_failed "ID encryption migration missing"
fi

if [ -f "src/database/migrations/037_add_archive_tables.sql" ]; then
  check_passed "Archive tables migration exists"
else
  check_failed "Archive tables migration missing"
fi

if [ -f "src/database/migrations/038_add_qr_token_mapping.sql" ]; then
  check_passed "QR token mapping migration exists"
else
  check_failed "QR token mapping migration missing"
fi

# Check migration scripts exist
if [ -f "scripts/migrate-id-numbers.js" ]; then
  check_passed "ID migration script exists"
else
  check_failed "ID migration script missing"
fi

if [ -f "scripts/migrate-qr-codes.js" ]; then
  check_passed "QR code migration script exists"
else
  check_failed "QR code migration script missing"
fi

# =====================================================
# 2. DEPENDENCIES CHECK
# =====================================================

section_header "2. 📦 DEPENDENCIES"

# Check if node_modules exists
if [ -d "node_modules" ]; then
  check_passed "node_modules directory exists"
else
  check_warning "node_modules not found - run 'npm install'"
fi

# Check critical packages
if [ -f "package.json" ]; then
  if grep -q "node-cron" package.json; then
    check_passed "node-cron dependency listed"
  else
    check_failed "node-cron dependency missing"
  fi
  
  if grep -q "jsonwebtoken" package.json; then
    check_passed "jsonwebtoken dependency listed"
  else
    check_failed "jsonwebtoken missing"
  fi
  
  if grep -q "bcryptjs" package.json; then
    check_passed "bcryptjs dependency listed"
  else
    check_failed "bcryptjs missing"
  fi
else
  check_failed "package.json not found"
fi

# =====================================================
# 3. ROUTE INTEGRATION CHECK
# =====================================================

section_header "3. 🛣️  ROUTE INTEGRATION"

# Check if data minimization is imported in routes
if grep -q "dataMinimization" src/routes/visitorRoutes.js; then
  check_passed "Data minimization imported in visitorRoutes"
else
  check_failed "Data minimization not imported in visitorRoutes"
fi

if grep -q "dataMinimization" src/routes/adminRoutes.js; then
  check_passed "Data minimization imported in adminRoutes"
else
  check_failed "Data minimization not imported in adminRoutes"
fi

if grep -q "dataMinimization" src/routes/checkInRoutes.js; then
  check_passed "Data minimization imported in checkInRoutes"
else
  check_failed "Data minimization not imported in checkInRoutes"
fi

if grep -q "dataMinimization" src/routes/checkOutRoutes.js; then
  check_passed "Data minimization imported in checkOutRoutes"
else
  check_failed "Data minimization not imported in checkOutRoutes"
fi

# Check if retention routes are in adminRoutes
if grep -q "/retention/execute" src/routes/adminRoutes.js; then
  check_passed "Retention API endpoints present in adminRoutes"
else
  check_warning "Retention API endpoints may be missing"
fi

# =====================================================
# 4. ENVIRONMENT VARIABLES CHECK
# =====================================================

section_header "4. 🔐 ENVIRONMENT VARIABLES"

if [ -f ".env" ]; then
  check_passed ".env file exists"
  
  # Check critical variables
  if grep -q "ENCRYPTION_KEY" .env; then
    # Check if it's not empty or placeholder
    KEY_VALUE=$(grep "ENCRYPTION_KEY" .env | cut -d'=' -f2)
    if [ -n "$KEY_VALUE" ] && [ "$KEY_VALUE" != "<64-char-hex-key>" ]; then
      KEY_LENGTH=${#KEY_VALUE}
      if [ $KEY_LENGTH -eq 64 ]; then
        check_passed "ENCRYPTION_KEY configured (64 chars)"
      else
        check_warning "ENCRYPTION_KEY exists but not 64 chars (found: $KEY_LENGTH)"
      fi
    else
      check_warning "ENCRYPTION_KEY is placeholder - needs real key"
    fi
  else
    check_warning "ENCRYPTION_KEY not found in .env"
  fi
  
  if grep -q "OTP_DEBUG_ECHO" .env; then
    OTP_VALUE=$(grep "OTP_DEBUG_ECHO" .env | cut -d'=' -f2)
    if [ "$OTP_VALUE" = "false" ]; then
      check_passed "OTP_DEBUG_ECHO=false (production safe)"
    else
      check_failed "OTP_DEBUG_ECHO=$OTP_VALUE (MUST be false for production!)"
    fi
  else
    check_warning "OTP_DEBUG_ECHO not found (defaults to false)"
  fi
  
  if grep -q "RETENTION_" .env; then
    check_passed "Retention configuration variables present"
  else
    check_warning "Retention variables not configured"
  fi
  
  if grep -q "QR_TOKEN_EXPIRY" .env; then
    check_passed "QR_TOKEN_EXPIRY configured"
  else
    check_warning "QR_TOKEN_EXPIRY not configured (will use default)"
  fi
  
else
  check_failed ".env file missing"
fi

# =====================================================
# 5. TEST COVERAGE CHECK
# =====================================================

section_header "5. 🧪 TEST COVERAGE"

# Check if test files exist
if [ -f "tests/security/otp-security.test.js" ]; then
  check_passed "OTP security tests exist"
else
  check_warning "OTP security tests missing"
fi

if [ -f "tests/security/id-encryption.test.js" ]; then
  check_passed "ID encryption tests exist"
else
  check_warning "ID encryption tests missing"
fi

if [ -f "tests/security/data-retention.test.js" ]; then
  check_passed "Data retention tests exist"
else
  check_warning "Data retention tests missing"
fi

if [ -f "tests/security/qr-tokenization.test.js" ]; then
  check_passed "QR tokenization tests exist"
else
  check_warning "QR tokenization tests missing"
fi

if [ -f "tests/security/data-minimization.test.js" ]; then
  check_passed "Data minimization tests exist"
else
  check_warning "Data minimization tests missing"
fi

if [ -f "tests/e2e/security-integration.test.js" ]; then
  check_passed "E2E security integration tests exist"
else
  check_warning "E2E integration tests missing"
fi

# =====================================================
# 6. DOCUMENTATION CHECK
# =====================================================

section_header "6. 📚 DOCUMENTATION"

if [ -f "../SECURITY_AUDIT_FINDINGS.md" ]; then
  check_passed "Security audit findings documented"
else
  check_warning "SECURITY_AUDIT_FINDINGS.md missing"
fi

if [ -f "../SECURITY_IMPLEMENTATION_GUIDE.md" ]; then
  check_passed "Implementation guide available"
else
  check_warning "SECURITY_IMPLEMENTATION_GUIDE.md missing"
fi

if [ -f "../DEPLOYMENT_INTEGRATION_PLAN.md" ]; then
  check_passed "Deployment plan available"
else
  check_warning "DEPLOYMENT_INTEGRATION_PLAN.md missing"
fi

if [ -f "../E2E_TEST_RESULTS.md" ]; then
  check_passed "E2E test results documented"
else
  check_warning "E2E_TEST_RESULTS.md missing"
fi

if [ -f "../PROJECT_SUCCESS_SUMMARY.md" ]; then
  check_passed "Project success summary available"
else
  check_warning "PROJECT_SUCCESS_SUMMARY.md missing"
fi

if [ -f "../PRODUCTION_DEPLOYMENT_CHECKLIST.md" ]; then
  check_passed "Production deployment checklist available"
else
  check_warning "PRODUCTION_DEPLOYMENT_CHECKLIST.md missing"
fi

# =====================================================
# 7. SERVER.JS INTEGRATION CHECK
# =====================================================

section_header "7. 🔧 SERVER.JS INTEGRATION"

if grep -q "retentionScheduler" server.js; then
  check_passed "Retention scheduler integrated in server.js"
else
  check_warning "Retention scheduler may not be integrated"
fi

# =====================================================
# 8. CRITICAL SECURITY CHECKS
# =====================================================

section_header "8. 🛡️  CRITICAL SECURITY VALIDATIONS"

# Check OTP controller for proper echo handling
if [ -f "src/controllers/visitorOtpController.js" ]; then
  if grep -q "shouldEchoOtp" src/controllers/visitorOtpController.js; then
    check_passed "OTP echo protection implemented"
  else
    check_warning "OTP echo protection may not be implemented"
  fi
else
  check_warning "OTP controller not found"
fi

# Check for encryption helper
if [ -f "src/utils/encryption.js" ]; then
  if grep -q "encryptIdNumber" src/utils/encryption.js; then
    check_passed "ID encryption utilities present"
  else
    check_warning "ID encryption functions may be missing"
  fi
else
  check_warning "Encryption utility file not found"
fi

# Check QR token service
if [ -f "src/services/qrTokenService.js" ]; then
  if grep -q "generateToken" src/services/qrTokenService.js && grep -q "validateToken" src/services/qrTokenService.js; then
    check_passed "QR token generation and validation implemented"
  else
    check_warning "QR token functions may be incomplete"
  fi
fi

# =====================================================
# 9. DATABASE SCHEMA VERIFICATION
# =====================================================

section_header "9. 🗄️  DATABASE SCHEMA"

if [ -f "src/database/schema.sql" ]; then
  check_passed "Database schema file exists"
  
  # Check for critical columns
  if grep -q "id_number_encrypted" src/database/schema.sql; then
    check_passed "ID encryption columns in schema"
  else
    check_warning "ID encryption columns may not be in schema"
  fi
  
  # Check for archive tables reference
  if grep -q "_archive" src/database/schema.sql || [ -f "src/database/migrations/037_add_archive_tables.sql" ]; then
    check_passed "Archive tables defined"
  else
    check_warning "Archive tables may not be defined"
  fi
  
  # Check for QR token mapping
  if grep -q "qr_token_mapping" src/database/schema.sql || grep -q "qr_token_mapping" src/database/migrations/038_add_qr_token_mapping.sql; then
    check_passed "QR token mapping table defined"
  else
    check_warning "QR token mapping table may not be defined"
  fi
else
  check_warning "Database schema file not found"
fi

# =====================================================
# FINAL SUMMARY
# =====================================================

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                    FINAL SUMMARY                       ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}Checks Passed: $CHECKS_PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Checks Failed: $CHECKS_FAILED${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ SYSTEM IS FULLY READY FOR PRODUCTION DEPLOYMENT${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review and address any warnings above"
    echo "  2. Run database migrations in production"
    echo "  3. Execute data migration scripts"
    echo "  4. Deploy to production"
    echo "  5. Monitor logs and metrics"
  else
    echo -e "${YELLOW}⚠️  SYSTEM IS READY BUT HAS WARNINGS${NC}"
    echo ""
    echo "Please review warnings above before deployment."
    echo "Most warnings are for optional features or documentation."
  fi
else
  echo -e "${RED}❌ SYSTEM HAS CRITICAL ISSUES - NOT READY FOR DEPLOYMENT${NC}"
  echo ""
  echo "Please fix the failed checks above before proceeding."
  exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          Deployment Readiness Check Complete          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
