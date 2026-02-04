#!/bin/bash

# Quick Start Testing Script
# Starts all services and opens testing interfaces

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SECURE GATE - QUICK START TESTING ENVIRONMENT          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

# Check and start PostgreSQL
echo -e "${YELLOW}1. Checking PostgreSQL...${NC}"
if pg_isready -q; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}\n"
else
    echo -e "${YELLOW}⚠ PostgreSQL not running. Please start it manually.${NC}\n"
fi

# Start MailHog
echo -e "${YELLOW}2. Starting MailHog...${NC}"
if pgrep -f mailhog > /dev/null; then
    echo -e "${GREEN}✓ MailHog already running${NC}\n"
else
    mailhog > /tmp/mailhog.log 2>&1 &
    sleep 2
    echo -e "${GREEN}✓ MailHog started on http://localhost:8025${NC}\n"
fi

# Start Backend
echo -e "${YELLOW}3. Starting Backend Server...${NC}"
if pgrep -f "node.*server.js" > /dev/null; then
    echo -e "${GREEN}✓ Backend already running${NC}\n"
else
    cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
    npm start > /tmp/backend.log 2>&1 &
    echo "Waiting for backend to start..."
    sleep 5
    
    if curl -s http://localhost:5001/health > /dev/null; then
        echo -e "${GREEN}✓ Backend started on http://localhost:5001${NC}\n"
    else
        echo -e "${YELLOW}⚠ Backend may still be starting...${NC}\n"
    fi
fi

# Start Frontend
echo -e "${YELLOW}4. Starting Frontend...${NC}"
if pgrep -f "react-scripts start" > /dev/null; then
    echo -e "${GREEN}✓ Frontend already running${NC}\n"
else
    cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client
    BROWSER=none npm start > /tmp/frontend.log 2>&1 &
    echo "Waiting for frontend to build..."
    sleep 10
    echo -e "${GREEN}✓ Frontend started on http://localhost:3000${NC}\n"
fi

# Summary
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   ALL SERVICES STARTED                                    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}Available URLs:${NC}"
echo -e "  Frontend:  ${BLUE}http://localhost:3000${NC}"
echo -e "  Backend:   ${BLUE}http://localhost:5001${NC}"
echo -e "  MailHog:   ${BLUE}http://localhost:8025${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Open your browser to http://localhost:3000"
echo "  2. Open MailHog at http://localhost:8025 (for email verification)"
echo "  3. Run manual tests using: ./manual-testing-guide.sh"
echo "  4. Run automated E2E tests using: npm test -- e2e/full-system-test.spec.js"
echo ""

read -p "Open testing URLs in browser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Opening browsers..."
    open http://localhost:3000
    sleep 1
    open http://localhost:8025
    echo -e "${GREEN}✓ Browsers opened${NC}"
fi

echo ""
echo -e "${BLUE}Happy Testing! 🚀${NC}"
