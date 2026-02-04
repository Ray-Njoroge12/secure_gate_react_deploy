#!/bin/bash

# Secure Gate Access Control - Comprehensive Manual Testing Guide
# This script provides step-by-step instructions and automated checks

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:5001/api"
FRONTEND_URL="http://localhost:3000"
MAILHOG_URL="http://localhost:8025"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SECURE GATE ACCESS CONTROL - MANUAL TESTING SUITE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Function to check service status
check_service() {
    local service_name=$1
    local check_command=$2
    
    if eval "$check_command" &>/dev/null; then
        echo -e "${GREEN}✓${NC} $service_name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name is NOT running"
        return 1
    fi
}

# Function to start services
start_services() {
    echo -e "\n${YELLOW}Starting required services...${NC}\n"
    
    # Start MailHog if not running
    if ! pgrep -f mailhog > /dev/null; then
        echo "Starting MailHog..."
        mailhog > /tmp/mailhog.log 2>&1 &
        sleep 2
    fi
    
    # Start backend if not running
    if ! pgrep -f "node.*server.js" > /dev/null; then
        echo "Starting backend server..."
        cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
        npm start > /tmp/backend.log 2>&1 &
        sleep 5
    fi
    
    # Start frontend if not running
    if ! pgrep -f "react-scripts start" > /dev/null; then
        echo "Starting frontend..."
        cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client
        BROWSER=none npm start > /tmp/frontend.log 2>&1 &
        sleep 10
    fi
    
    echo -e "\n${GREEN}All services started!${NC}\n"
}

# Function to display manual testing steps
show_testing_steps() {
    local test_name=$1
    shift
    local steps=("$@")
    
    echo -e "\n${BLUE}═══ $test_name ═══${NC}\n"
    
    for i in "${!steps[@]}"; do
        echo -e "${YELLOW}Step $((i+1)):${NC} ${steps[$i]}"
    done
    
    echo -e "\n${YELLOW}Press Enter when you've completed these steps...${NC}"
    read -r
}

# Main testing flow
main() {
    echo "1. Check System Status"
    echo "2. Start All Services"
    echo "3. Run Full Manual Testing Suite"
    echo "4. Quick API Health Check"
    echo "5. Exit"
    echo ""
    echo -n "Select an option: "
    read -r option
    
    case $option in
        1)
            echo -e "\n${YELLOW}Checking system status...${NC}\n"
            check_service "Backend Server" "curl -s http://localhost:5001/health"
            check_service "Frontend" "curl -s http://localhost:3000"
            check_service "MailHog" "curl -s http://localhost:8025"
            check_service "PostgreSQL" "psql -U postgres -d secure_gate -c 'SELECT 1' -t"
            ;;
        2)
            start_services
            ;;
        3)
            # Full manual testing suite
            echo -e "\n${GREEN}Starting Full Manual Testing Suite${NC}\n"
            
            # Test 1: Registration Flow
            show_testing_steps "Test 1: User Registration" \
                "Open browser to $FRONTEND_URL" \
                "Click 'Register' or navigate to registration page" \
                "Register new users for each role:" \
                "  - Admin: admin-test@example.com / Admin@123" \
                "  - Guard: guard-test@example.com / Guard@123" \
                "  - Resident: resident-test@example.com / Resident@123" \
                "Verify success message appears for each registration" \
                "Check MailHog ($MAILHOG_URL) - you should see 3 verification emails"
            
            # Test 2: Email Verification
            show_testing_steps "Test 2: Email Verification" \
                "Open MailHog at $MAILHOG_URL" \
                "Click on each verification email" \
                "Copy the verification link from each email" \
                "Paste links in browser to verify accounts" \
                "Confirm 'Account verified successfully' message for each"
            
            # Test 3: Login Flow
            show_testing_steps "Test 3: Login Testing" \
                "Return to $FRONTEND_URL" \
                "Try logging in with UNVERIFIED account (should fail)" \
                "Log in with VERIFIED admin account" \
                "Verify admin dashboard loads" \
                "Log out and repeat for Guard and Resident accounts"
            
            # Test 4: Resident - Single Guest Invite
            show_testing_steps "Test 4: Resident - Create Single Guest Invite" \
                "Log in as Resident (resident-test@example.com)" \
                "Navigate to 'Create Guest Invite' or 'Invite Guest'" \
                "Fill in guest details:" \
                "  - Name: John Doe" \
                "  - Email: guest1@example.com" \
                "  - Phone: 123-456-7890" \
                "  - Visit Date: Tomorrow" \
                "  - Purpose: Family Visit" \
                "Submit the invite" \
                "Check MailHog - you should see invitation email to guest1@example.com"
            
            # Test 5: Resident - Bulk Guest Invites
            show_testing_steps "Test 5: Resident - Create Bulk Guest Invites" \
                "While logged in as Resident" \
                "Navigate to 'Bulk Invite' section" \
                "Upload CSV or enter multiple guests:" \
                "  - Jane Smith, guest2@example.com, 123-456-7891" \
                "  - Bob Wilson, guest3@example.com, 123-456-7892" \
                "  - Alice Brown, guest4@example.com, 123-456-7893" \
                "Submit bulk invite" \
                "Check MailHog - you should see 3 new invitation emails"
            
            # Test 6: Guard - View Visitor List
            show_testing_steps "Test 6: Guard - View and Manage Visitors" \
                "Log out and log in as Guard (guard-test@example.com)" \
                "Navigate to 'Visitor Management' or 'Check-in'" \
                "You should see list of pending visitors (4 guests)" \
                "Verify guest details are displayed correctly"
            
            # Test 7: Guard - Check-in Visitor
            show_testing_steps "Test 7: Guard - Check-in Visitor" \
                "Still logged in as Guard" \
                "Select first guest (John Doe)" \
                "Click 'Check In' button" \
                "Confirm check-in successful" \
                "Verify status changes to 'Checked In'" \
                "Note the check-in timestamp"
            
            # Test 8: Guard - Check-out Visitor
            show_testing_steps "Test 8: Guard - Check-out Visitor" \
                "Select the checked-in guest (John Doe)" \
                "Click 'Check Out' button" \
                "Confirm check-out successful" \
                "Verify status changes to 'Checked Out'" \
                "Note the check-out timestamp"
            
            # Test 9: Guard - View Access Logs
            show_testing_steps "Test 9: Guard - View Access Logs" \
                "Navigate to 'Access Logs' or 'History'" \
                "Verify you can see:" \
                "  - Check-in event for John Doe" \
                "  - Check-out event for John Doe" \
                "  - Timestamps match your actions" \
                "Filter logs by date/time/visitor"
            
            # Test 10: Resident - View Guest History
            show_testing_steps "Test 10: Resident - View Guest History" \
                "Log out and log in as Resident" \
                "Navigate to 'My Guests' or 'Guest History'" \
                "Verify you can see all 4 invited guests" \
                "Check that John Doe shows as 'Completed' (checked out)" \
                "Verify other guests show as 'Pending' or 'Invited'"
            
            # Test 11: Admin - Bulk Invites
            show_testing_steps "Test 11: Admin - Create Bulk Invites for Event" \
                "Log out and log in as Admin" \
                "Navigate to admin panel/bulk operations" \
                "Create bulk invite for community event:" \
                "  - Event Name: Community BBQ" \
                "  - Add 5+ guests with emails" \
                "Submit invite" \
                "Check MailHog - verify all invitation emails sent"
            
            # Test 12: Admin - View All Visitors
            show_testing_steps "Test 12: Admin - View All System Data" \
                "Still logged in as Admin" \
                "Navigate to 'All Visitors' or 'System Overview'" \
                "Verify you can see ALL visitors from all residents" \
                "Check filtering by:" \
                "  - Status (Pending/Checked In/Checked Out)" \
                "  - Date range" \
                "  - Resident name" \
                "Export visitor data (if available)"
            
            # Test 13: Admin - Audit Logs
            show_testing_steps "Test 13: Admin - Review Audit Logs" \
                "Navigate to 'Audit Logs' or 'System Logs'" \
                "Verify logs show all actions:" \
                "  - User registrations" \
                "  - Login attempts" \
                "  - Guest invitations" \
                "  - Check-in/Check-out events" \
                "Search/filter audit logs" \
                "Export audit trail"
            
            # Test 14: Password Reset
            show_testing_steps "Test 14: Password Reset Flow" \
                "Log out from all accounts" \
                "Click 'Forgot Password'" \
                "Enter resident-test@example.com" \
                "Submit password reset request" \
                "Check MailHog - verify reset email received" \
                "Click reset link from email" \
                "Set new password: NewResident@123" \
                "Log in with new password" \
                "Verify successful login"
            
            # Test 15: Security & Validation
            show_testing_steps "Test 15: Security Testing" \
                "Try registering with weak password (should fail)" \
                "Try registering duplicate email (should fail)" \
                "Try accessing admin panel as Guard (should fail)" \
                "Try accessing guard features as Resident (should fail)" \
                "Verify session timeout after inactivity" \
                "Test CSRF protection (if implemented)"
            
            # Test 16: Accessibility
            show_testing_steps "Test 16: Accessibility Testing" \
                "Use keyboard only to navigate the app:" \
                "  - Tab through all forms" \
                "  - Press Enter to submit" \
                "  - Use arrow keys in dropdowns" \
                "Test with screen reader (if available)" \
                "Verify all images have alt text" \
                "Check color contrast meets WCAG standards"
            
            # Test 17: Mobile Responsiveness
            show_testing_steps "Test 17: Mobile & Responsive Testing" \
                "Open browser dev tools (F12)" \
                "Enable device toolbar (Ctrl+Shift+M)" \
                "Test on different screen sizes:" \
                "  - iPhone SE (375px)" \
                "  - iPhone 12 Pro (390px)" \
                "  - iPad (768px)" \
                "  - Desktop (1920px)" \
                "Verify all features work on mobile"
            
            echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
            echo -e "${GREEN}  MANUAL TESTING SUITE COMPLETED!${NC}"
            echo -e "${GREEN}═══════════════════════════════════════════${NC}\n"
            
            echo "Please review and document:"
            echo "  1. All test results"
            echo "  2. Any bugs or issues found"
            echo "  3. Screenshots of successful flows"
            echo "  4. Performance observations"
            echo ""
            ;;
        4)
            # Quick API health check
            echo -e "\n${YELLOW}Running Quick API Health Check...${NC}\n"
            
            echo "Testing Backend API..."
            curl -s http://localhost:5001/health && echo -e "\n${GREEN}✓${NC} Backend healthy\n" || echo -e "\n${RED}✗${NC} Backend unhealthy\n"
            
            echo "Testing Registration Endpoint..."
            curl -s -X POST http://localhost:5001/api/auth/register \
                -H "Content-Type: application/json" \
                -d '{"email":"health-check@example.com","password":"Test@123","role":"resident","name":"Health Check"}' \
                | grep -q "User registered" && echo -e "${GREEN}✓${NC} Registration working\n" || echo -e "${YELLOW}⚠${NC} Registration test (expected if user exists)\n"
            
            echo "Checking MailHog..."
            curl -s http://localhost:8025/api/v2/messages | grep -q "items" && echo -e "${GREEN}✓${NC} MailHog accessible\n" || echo -e "${RED}✗${NC} MailHog not accessible\n"
            ;;
        5)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option"
            ;;
    esac
}

# Run main function
main
