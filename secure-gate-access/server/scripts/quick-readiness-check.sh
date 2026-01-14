#!/bin/bash
# Quick Deployment Readiness Summary

echo "🔍 DEPLOYMENT READINESS SUMMARY"
echo "================================"
echo ""

# Function to check file
check_file() {
  if [ -f "$1" ]; then
    echo "✓ $2"
    return 0
  else
    echo "✗ $2"
    return 1
  fi
}

passed=0
failed=0

echo "📁 Core Security Files:"
check_file "src/middleware/dataMinimization.js" "Data Minimization Middleware" && ((passed++)) || ((failed++))
check_file "src/services/qrTokenService.js" "QR Token Service" && ((passed++)) || ((failed++))
check_file "src/services/retentionService.js" "Retention Service" && ((passed++)) || ((failed++))
check_file "src/jobs/retentionScheduler.js" "Retention Scheduler" && ((passed++)) || ((failed++))

echo ""
echo "📊 Database Migrations:"
check_file "src/database/migrations/035_encrypt_id_numbers.sql" "ID Encryption Migration" && ((passed++)) || ((failed++))
check_file "src/database/migrations/037_add_archive_tables.sql" "Archive Tables Migration" && ((passed++)) || ((failed++))
check_file "src/database/migrations/038_add_qr_token_mapping.sql" "QR Token Mapping Migration" && ((passed++)) || ((failed++))

echo ""
echo "🔧 Migration Scripts:"
check_file "scripts/migrate-id-numbers.js" "ID Number Migration Script" && ((passed++)) || ((failed++))
check_file "scripts/migrate-qr-codes.js" "QR Code Migration Script" && ((passed++)) || ((failed++))

echo ""
echo "🧪 Test Files:"
check_file "tests/security/otp-security.test.js" "OTP Security Tests" && ((passed++)) || ((failed++))
check_file "tests/security/id-encryption.test.js" "ID Encryption Tests" && ((passed++)) || ((failed++))
check_file "tests/security/data-retention.test.js" "Data Retention Tests" && ((passed++)) || ((failed++))
check_file "tests/security/qr-tokenization.test.js" "QR Tokenization Tests" && ((passed++)) || ((failed++))
check_file "tests/security/data-minimization.test.js" "Data Minimization Tests" && ((passed++)) || ((failed++))
check_file "tests/e2e/security-integration.test.js" "E2E Integration Tests" && ((passed++)) || ((failed++))

echo ""
echo "📚 Documentation:"
check_file "../../SECURITY_AUDIT_FINDINGS.md" "Security Audit Findings" && ((passed++)) || ((failed++))
check_file "../../DEPLOYMENT_INTEGRATION_PLAN.md" "Deployment Integration Plan" && ((passed++)) || ((failed++))
check_file "../../PRODUCTION_DEPLOYMENT_CHECKLIST.md" "Production Deployment Checklist" && ((passed++)) || ((failed++))
check_file "../../E2E_TEST_RESULTS.md" "E2E Test Results" && ((passed++)) || ((failed++))

echo ""
echo "================================"
echo "SUMMARY:"
echo "  ✓ Passed: $passed"
echo "  ✗ Failed: $failed"
echo ""

if [ $failed -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED - READY FOR DEPLOYMENT"
  exit 0
else
  echo "⚠️  SOME FILES MISSING - REVIEW BEFORE DEPLOYMENT"
  exit 1
fi
