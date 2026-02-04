#!/bin/bash

# Database Verification Script
# Quickly check test data in database

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  DATABASE VERIFICATION TOOL               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}\n"

DB_NAME="secure_gate"
DB_USER="postgres"

# Function to run query and display results
run_query() {
    local title=$1
    local query=$2
    
    echo -e "${YELLOW}${title}${NC}"
    echo "─────────────────────────────────────────────"
    psql -U $DB_USER -d $DB_NAME -c "$query" -t
    echo ""
}

# Check database connection
if ! psql -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}✗ Cannot connect to database${NC}"
    echo "Make sure PostgreSQL is running and database exists"
    exit 1
fi

echo -e "${GREEN}✓ Connected to database${NC}\n"

# User statistics
run_query "📊 USER STATISTICS" "
SELECT 
    role, 
    COUNT(*) as count,
    COUNT(CASE WHEN verified = true THEN 1 END) as verified,
    COUNT(CASE WHEN verified = false THEN 1 END) as unverified
FROM users 
GROUP BY role
ORDER BY role;
"

# Recent users
run_query "👥 RECENT USERS (Last 10)" "
SELECT 
    id,
    email,
    role,
    CASE WHEN verified THEN '✓' ELSE '✗' END as verified,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as registered
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
"

# Visitor statistics
run_query "📋 VISITOR STATISTICS" "
SELECT 
    status,
    COUNT(*) as count
FROM visitors 
GROUP BY status
ORDER BY status;
"

# Recent visitors
run_query "👋 RECENT VISITORS (Last 10)" "
SELECT 
    v.id,
    v.name,
    v.email,
    v.status,
    u.email as resident,
    TO_CHAR(v.expected_arrival, 'YYYY-MM-DD') as visit_date
FROM visitors v
JOIN users u ON v.resident_id = u.id
ORDER BY v.created_at DESC 
LIMIT 10;
"

# Checked in visitors
run_query "🟢 CURRENTLY CHECKED IN" "
SELECT 
    v.name,
    v.email,
    u.email as resident,
    TO_CHAR(v.check_in_time, 'YYYY-MM-DD HH24:MI') as checked_in
FROM visitors v
JOIN users u ON v.resident_id = u.id
WHERE v.status = 'checked_in'
ORDER BY v.check_in_time DESC;
"

# Access logs count
run_query "📝 ACCESS LOG ENTRIES" "
SELECT COUNT(*) as total_logs FROM access_logs;
"

# Recent access logs
run_query "�� RECENT ACCESS LOGS (Last 5)" "
SELECT 
    al.action,
    v.name as visitor,
    g.email as guard,
    TO_CHAR(al.timestamp, 'YYYY-MM-DD HH24:MI:SS') as time
FROM access_logs al
LEFT JOIN visitors v ON al.visitor_id = v.id
LEFT JOIN users g ON al.guard_id = g.id
ORDER BY al.timestamp DESC 
LIMIT 5;
"

# Show test users
echo -e "${YELLOW}🧪 TEST USERS FOR MANUAL TESTING${NC}"
echo "─────────────────────────────────────────────"
echo "Look for users with 'manual' or 'test' in email:"
psql -U $DB_USER -d $DB_NAME -c "
SELECT 
    email,
    role,
    CASE WHEN verified THEN '✓ Verified' ELSE '✗ Unverified' END as status
FROM users 
WHERE email LIKE '%manual%' OR email LIKE '%test%' OR email LIKE '%e2e%'
ORDER BY role, email;
" -t
echo ""

# Quick actions menu
echo -e "${BLUE}═════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Quick Actions:${NC}"
echo "  1. Verify all test users"
echo "  2. Clear all test data"
echo "  3. Show specific user details"
echo "  4. Exit"
echo ""
read -p "Select action (1-4): " action

case $action in
    1)
        echo "Verifying all test users..."
        psql -U $DB_USER -d $DB_NAME -c "
        UPDATE users 
        SET verified = true 
        WHERE email LIKE '%test%' OR email LIKE '%manual%' OR email LIKE '%e2e%'
        RETURNING email, role;
        "
        echo -e "${GREEN}✓ Test users verified${NC}"
        ;;
    2)
        read -p "⚠️  This will delete ALL test data. Continue? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            psql -U $DB_USER -d $DB_NAME -c "
            DELETE FROM access_logs WHERE visitor_id IN (
                SELECT v.id FROM visitors v 
                JOIN users u ON v.resident_id = u.id 
                WHERE u.email LIKE '%test%' OR u.email LIKE '%manual%' OR u.email LIKE '%e2e%'
            );
            DELETE FROM visitors WHERE resident_id IN (
                SELECT id FROM users 
                WHERE email LIKE '%test%' OR email LIKE '%manual%' OR email LIKE '%e2e%'
            );
            DELETE FROM users 
            WHERE email LIKE '%test%' OR email LIKE '%manual%' OR email LIKE '%e2e%';
            "
            echo -e "${GREEN}✓ Test data cleared${NC}"
        fi
        ;;
    3)
        read -p "Enter email: " user_email
        psql -U $DB_USER -d $DB_NAME -c "
        SELECT 
            id,
            email,
            name,
            role,
            verified,
            TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as registered
        FROM users 
        WHERE email = '$user_email';
        "
        ;;
    4)
        echo "Goodbye!"
        exit 0
        ;;
esac

echo ""
echo -e "${BLUE}Database verification complete!${NC}"
