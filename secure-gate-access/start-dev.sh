#!/bin/bash

# =============================================================================
# Secure Gate Access - Quick Start Script
# =============================================================================
# This script starts both backend and frontend for development/testing
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Secure Gate Access - Quick Start       ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18 or higher is required${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"

# Check if .env files exist
cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

echo ""
echo -e "${YELLOW}Checking environment files...${NC}"

if [ ! -f "server/.env" ] && [ ! -f "server/.env.local" ]; then
    echo -e "${YELLOW}Warning: No server .env file found${NC}"
    echo "Creating from template..."
    if [ -f "server/env.example" ]; then
        cp server/env.example server/.env.local
        echo -e "${GREEN}Created server/.env.local from template${NC}"
        echo -e "${YELLOW}Please edit server/.env.local with your settings${NC}"
    fi
fi

if [ ! -f "client/.env" ] && [ ! -f "client/.env.local" ]; then
    echo -e "${YELLOW}Warning: No client .env file found${NC}"
    if [ -f "client/env.example" ]; then
        cp client/env.example client/.env.local
        echo -e "${GREEN}Created client/.env.local from template${NC}"
    fi
fi

# Install dependencies if needed
echo ""
echo -e "${YELLOW}Checking dependencies...${NC}"

if [ ! -d "server/node_modules" ]; then
    echo "Installing server dependencies..."
    cd server && npm install && cd ..
fi
echo -e "${GREEN}✓ Server dependencies installed${NC}"

if [ ! -d "client/node_modules" ]; then
    echo "Installing client dependencies..."
    cd client && npm install && cd ..
fi
echo -e "${GREEN}✓ Client dependencies installed${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}

trap cleanup EXIT INT TERM

# Start Backend Server
echo ""
echo -e "${BLUE}Starting Backend Server...${NC}"
cd "$PROJECT_ROOT/server"
npm run dev &
BACKEND_PID=$!
echo -e "${GREEN}Backend starting on http://localhost:3001${NC}"

# Wait for backend to be ready
echo "Waiting for backend..."
sleep 3

# Start Frontend Client
echo ""
echo -e "${BLUE}Starting Frontend Client...${NC}"
cd "$PROJECT_ROOT/client"
npm start &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend starting on http://localhost:3000${NC}"

# Wait and show status
sleep 5

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  Secure Gate Access is Running!         ${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "Backend:  ${BLUE}http://localhost:3001${NC}"
echo -e "API Docs: ${BLUE}http://localhost:3001/api-docs${NC} (if enabled)"
echo ""
echo -e "${YELLOW}Test Accounts:${NC}"
echo "  Admin:    admin@securegate.local / Test@123"
echo "  Guard:    guard@securegate.local / Test@123"
echo "  Resident: resident@securegate.local / Test@123"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop all services"
echo ""

# Keep script running
wait
