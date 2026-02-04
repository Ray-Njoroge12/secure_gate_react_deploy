#!/bin/bash

# Frontend UI Testing - Quick Start
# Opens all necessary tools and displays test credentials

echo "============================================"
echo "   FRONTEND UI TESTING - QUICK START"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
echo -e "${BLUE}Checking services...${NC}"
echo ""

# Check frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "✅ ${GREEN}Frontend:${NC} http://localhost:3000 (Running)"
else
    echo -e "❌ Frontend: http://localhost:3000 (Not Running)"
    echo "   Start with: cd secure-gate-access/client && npm start"
fi

# Check backend
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "✅ ${GREEN}Backend:${NC} http://localhost:3001 (Running)"
else
    echo -e "❌ Backend: http://localhost:3001 (Not Running)"
    echo "   Start with: cd secure-gate-access/server && npm start"
fi

# Check MailHog
if curl -s http://localhost:8025 > /dev/null; then
    echo -e "✅ ${GREEN}MailHog:${NC} http://localhost:8025 (Running)"
else
    echo -e "❌ MailHog: http://localhost:8025 (Not Running)"
    echo "   Start with: mailhog"
fi

echo ""
echo "============================================"
echo "   TEST CREDENTIALS"
echo "============================================"
echo ""

echo -e "${YELLOW}ADMIN:${NC}"
echo "  Email:    admin_test_2025_01_31@example.com"
echo "  Password: AdminPass123!"
echo ""

echo -e "${YELLOW}GUARD:${NC}"
echo "  Email:    guard_test_2025_01_31@example.com"
echo "  Password: GuardPass123!"
echo ""

echo -e "${YELLOW}RESIDENT:${NC}"
echo "  Email:    resident_test_2025_01_31@example.com"
echo "  Password: ResidentPass123!"
echo ""

echo "============================================"
echo "   QUICK LINKS"
echo "============================================"
echo ""
echo "📋 Login Page:       http://localhost:3000/login"
echo "📋 Register Page:    http://localhost:3000/register"
echo "📋 Admin Dashboard:  http://localhost:3000/admin/dashboard"
echo "📋 Guard Dashboard:  http://localhost:3000/guard/dashboard"
echo "📋 Resident Dashboard: http://localhost:3000/resident/dashboard"
echo ""
echo "📧 MailHog (Emails): http://localhost:8025"
echo ""
echo "============================================"
echo "   TESTING GUIDE"
echo "============================================"
echo ""
echo "Full testing guide available at:"
echo "  ${BLUE}FRONTEND_UI_TEST_GUIDE.md${NC}"
echo ""
echo "Quick test sequence:"
echo "  1. Test login page"
echo "  2. Login as each role (Admin, Guard, Resident)"
echo "  3. Test role-specific features"
echo "  4. Test guest invite flow"
echo "  5. Test password reset"
echo "  6. Test accessibility & mobile responsiveness"
echo ""

# Ask if user wants to open browsers
echo "============================================"
echo ""
read -p "Open testing tools in browser? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Opening browsers..."
    
    # Open frontend
    open http://localhost:3000/login
    sleep 1
    
    # Open MailHog
    open http://localhost:8025
    sleep 1
    
    echo ""
    echo -e "${GREEN}✅ Testing tools opened!${NC}"
    echo ""
    echo "You can now:"
    echo "  1. Login with test credentials above"
    echo "  2. Check emails in MailHog"
    echo "  3. Follow the testing guide in FRONTEND_UI_TEST_GUIDE.md"
fi

echo ""
echo "============================================"
echo "   DATABASE INFO"
echo "============================================"
echo ""
echo "Current database state:"

# Check database if psql is available
if command -v psql &> /dev/null; then
    USER_COUNT=$(PGPASSWORD=secure_gate_password psql -U secure_gate_user -d secure_gate_db -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
    VISITOR_COUNT=$(PGPASSWORD=secure_gate_password psql -U secure_gate_user -d secure_gate_db -t -c "SELECT COUNT(*) FROM visitors;" 2>/dev/null | tr -d ' ')
    
    if [ ! -z "$USER_COUNT" ]; then
        echo "  Users: $USER_COUNT"
        echo "  Visitors: $VISITOR_COUNT"
    else
        echo "  Unable to connect to database"
    fi
else
    echo "  psql not available - install PostgreSQL client to see DB stats"
fi

echo ""
echo "============================================"
echo "   HAPPY TESTING! 🧪"
echo "============================================"
echo ""
