#!/bin/bash

# Open All Testing Tools
# Opens browser windows for all testing interfaces

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Opening all testing interfaces...${NC}\n"

# Check if services are running first
services_ok=true

if ! pgrep -f "react-scripts start" > /dev/null; then
    echo -e "${RED}⚠️  Frontend is not running${NC}"
    echo "Start it with: cd secure-gate-access/client && npm start"
    services_ok=false
fi

if ! pgrep -f "node.*server.js" > /dev/null; then
    echo -e "${RED}⚠️  Backend is not running${NC}"
    echo "Start it with: cd secure-gate-access/server && npm start"
    services_ok=false
fi

if ! pgrep -f mailhog > /dev/null; then
    echo -e "${RED}⚠️  MailHog is not running${NC}"
    echo "Start it with: mailhog"
    services_ok=false
fi

if [ "$services_ok" = false ]; then
    echo ""
    echo "Would you like to start all services now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        ./quick-start-testing.sh
        sleep 3
    else
        echo "Please start services manually first"
        exit 1
    fi
fi

echo -e "${GREEN}✓ All services running${NC}\n"

# Open browsers
echo "Opening browser windows..."

# Frontend
echo "  → Frontend Application"
open http://localhost:3000
sleep 1

# MailHog
echo "  → MailHog Email Interface"
open http://localhost:8025
sleep 1

# Backend API (optional)
echo "  → Backend Health Check"
open http://localhost:5001/health

echo ""
echo -e "${GREEN}✓ All testing interfaces opened!${NC}\n"

echo "Testing URLs:"
echo "  Frontend:  http://localhost:3000"
echo "  MailHog:   http://localhost:8025"
echo "  Backend:   http://localhost:5001"
echo ""

echo "Next steps:"
echo "  1. Register users via the frontend"
echo "  2. Check MailHog for verification emails"
echo "  3. Follow TESTING_CHECKLIST.md for complete testing"
echo ""

