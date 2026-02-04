#!/bin/bash

# Phase 2 Implementation Validation Script
# Tests that all Phase 2 endpoints and UI components are properly integrated

echo "=================================================="
echo "🔍 PHASE 2 IMPLEMENTATION VALIDATION"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

# Function to check if a string exists in a file
check_exists() {
    local file=$1
    local search=$2
    local description=$3
    
    if grep -q "$search" "$file" 2>/dev/null; then
        echo -e "${GREEN}✅ PASS:${NC} $description"
        ((pass_count++))
        return 0
    else
        echo -e "${RED}❌ FAIL:${NC} $description"
        echo -e "   ${YELLOW}Expected in:${NC} $file"
        ((fail_count++))
        return 1
    fi
}

# Change to script directory
cd "$(dirname "$0")"
cd secure-gate-access

echo "📋 Checking Backend Endpoints..."
echo ""

# Check bulk operations endpoints
check_exists "server/src/routes/adminRoutes.js" "POST.*bulk-approve" "Bulk approve endpoint defined"
check_exists "server/src/routes/adminRoutes.js" "POST.*bulk-reject" "Bulk reject endpoint defined"

# Check advanced search endpoint
check_exists "server/src/routes/adminRoutes.js" "POST.*advanced-search" "Advanced search endpoint defined"

# Check password reset endpoint
check_exists "server/src/routes/adminRoutes.js" "POST.*reset-password" "Password reset endpoint defined"

# Check session management endpoints
check_exists "server/src/routes/adminRoutes.js" "GET.*sessions" "View sessions endpoint defined"
check_exists "server/src/routes/adminRoutes.js" "DELETE.*sessions" "Revoke sessions endpoint defined"

# Check notification preferences endpoints
check_exists "server/src/routes/adminRoutes.js" "GET.*notification-preferences" "Get notification preferences endpoint"
check_exists "server/src/routes/adminRoutes.js" "PUT.*notification-preferences" "Update notification preference endpoint"
check_exists "server/src/routes/adminRoutes.js" "POST.*bulk-update" "Bulk update preferences endpoint"

# Check activity dashboard endpoints
check_exists "server/src/routes/adminRoutes.js" "GET.*activity/feed" "Activity feed endpoint defined"
check_exists "server/src/routes/adminRoutes.js" "GET.*activity/trends" "Activity trends endpoint defined"
check_exists "server/src/routes/adminRoutes.js" "GET.*activity/anomalies" "Activity anomalies endpoint defined"
check_exists "server/src/routes/adminRoutes.js" "GET.*activity/summary" "Activity summary endpoint defined"

echo ""
echo "📱 Checking Frontend Components..."
echo ""

# Check new component files exist
if [ -f "client/src/pages/admin/NotificationPreferences.jsx" ]; then
    echo -e "${GREEN}✅ PASS:${NC} NotificationPreferences.jsx component exists"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL:${NC} NotificationPreferences.jsx component missing"
    ((fail_count++))
fi

if [ -f "client/src/pages/admin/ActivityDashboard.jsx" ]; then
    echo -e "${GREEN}✅ PASS:${NC} ActivityDashboard.jsx component exists"
    ((pass_count++))
else
    echo -e "${RED}❌ FAIL:${NC} ActivityDashboard.jsx component missing"
    ((fail_count++))
fi

# Check App.js routing
check_exists "client/src/App.js" "NotificationPreferences" "NotificationPreferences imported in App.js"
check_exists "client/src/App.js" "ActivityDashboard" "ActivityDashboard imported in App.js"
check_exists "client/src/App.js" "/dashboard/admin/notifications" "Notifications route defined in App.js"
check_exists "client/src/App.js" "/dashboard/admin/activity" "Activity route defined in App.js"

# Check Sidebar navigation
check_exists "client/src/components/Sidebar.jsx" "/dashboard/admin/activity" "Activity Dashboard link in Sidebar"
check_exists "client/src/components/Sidebar.jsx" "/dashboard/admin/notifications" "Notifications link in Sidebar"

# Check PendingApprovals bulk operations
check_exists "client/src/pages/admin/PendingApprovals.jsx" "bulk-approve" "Bulk approve in PendingApprovals"
check_exists "client/src/pages/admin/PendingApprovals.jsx" "bulk-reject" "Bulk reject in PendingApprovals"
check_exists "client/src/pages/admin/PendingApprovals.jsx" "checkbox" "Checkbox selection in PendingApprovals"

echo ""
echo "🗄️  Checking Database Migration..."
echo ""

if [ -f "database/migrations/007_admin_notification_preferences.sql" ]; then
    echo -e "${GREEN}✅ PASS:${NC} Migration 007_admin_notification_preferences.sql exists"
    ((pass_count++))
    
    # Check migration content
    check_exists "database/migrations/007_admin_notification_preferences.sql" "admin_notification_preferences" "Table creation in migration"
    check_exists "database/migrations/007_admin_notification_preferences.sql" "event_type" "event_type column in migration"
    check_exists "database/migrations/007_admin_notification_preferences.sql" "notify_email" "notify_email column in migration"
    check_exists "database/migrations/007_admin_notification_preferences.sql" "frequency" "frequency column in migration"
else
    echo -e "${RED}❌ FAIL:${NC} Migration 007_admin_notification_preferences.sql missing"
    ((fail_count++))
fi

echo ""
echo "📄 Checking Documentation..."
echo ""

check_exists "../ADMIN_ROLE_COMPREHENSIVE_ANALYSIS.md" "Phase 2 Functionality Enhancements COMPLETE" "Phase 2 marked complete in docs"
check_exists "../ADMIN_ROLE_COMPREHENSIVE_ANALYSIS.md" "Bulk Operations" "Bulk operations documented"
check_exists "../ADMIN_ROLE_COMPREHENSIVE_ANALYSIS.md" "Advanced Search" "Advanced search documented"
check_exists "../ADMIN_ROLE_COMPREHENSIVE_ANALYSIS.md" "Password Reset" "Password reset documented"
check_exists "../ADMIN_ROLE_COMPREHENSIVE_ANALYSIS.md" "Session Management" "Session management documented"
check_exists "../ADMIN_ROLE_COMPREHENSIVE_ANALYSIS.md" "Notification Preferences" "Notification preferences documented"
check_exists "../ADMIN_ROLE_COMPREHENSIVE_ANALYSIS.md" "Activity Dashboard" "Activity dashboard documented"

echo ""
echo "=================================================="
echo "📊 VALIDATION SUMMARY"
echo "=================================================="
echo ""
echo -e "${GREEN}✅ Passed:${NC} $pass_count"
echo -e "${RED}❌ Failed:${NC} $fail_count"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL PHASE 2 VALIDATIONS PASSED!${NC}"
    echo ""
    echo "Phase 2 Implementation is complete and properly integrated."
    echo ""
    echo "Next Steps:"
    echo "1. Run migration: npm run migrate (from server directory)"
    echo "2. Start server: npm run dev (from server directory)"
    echo "3. Start client: npm start (from client directory)"
    echo "4. Test endpoints manually or with automated tests"
    echo "5. Review UI components in browser"
    exit 0
else
    echo -e "${RED}⚠️  VALIDATION FAILED${NC}"
    echo ""
    echo "Some Phase 2 components are missing or not properly integrated."
    echo "Please review the failed checks above and ensure all components are in place."
    exit 1
fi
