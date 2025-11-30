#!/bin/bash

##
# Unit Test Verification Script
# Runs backend unit tests with detailed output and error capture
# Created: Nov 21, 2025
##

set -e

echo "=========================================="
echo "Backend Unit Test Verification"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend server is running on port 3001
echo "Checking for running backend server on port 3001..."
if lsof -ti :3001 > /dev/null 2>&1; then
    PID=$(lsof -ti :3001)
    echo -e "${YELLOW}Warning: Backend server is running on port 3001 (PID: $PID)${NC}"
    echo "Stopping server to avoid conflicts..."
    kill -15 $PID 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}Server stopped${NC}"
else
    echo -e "${GREEN}No server running on port 3001${NC}"
fi
echo ""

# Check Node version
echo "Node version:"
node --version
echo ""

# Check npm version
echo "npm version:"
npm --version
echo ""

# Verify test dependencies
echo "Verifying test dependencies..."
if ! npm list jest > /dev/null 2>&1; then
    echo -e "${RED}Jest not found. Installing dependencies...${NC}"
    npm install
fi
echo -e "${GREEN}Dependencies OK${NC}"
echo ""

# Create logs directory
mkdir -p logs/test-runs

# Run unit tests with detailed output
echo "=========================================="
echo "Running Unit Tests..."
echo "=========================================="
echo ""

TEST_LOG="logs/test-runs/unit-test-$(date +%Y%m%d-%H%M%S).log"

# Run tests and capture output
npm run test:unit 2>&1 | tee "$TEST_LOG"
TEST_EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "=========================================="
echo "Test Run Summary"
echo "=========================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed (exit code: $TEST_EXIT_CODE)${NC}"
    echo ""
    echo "Common issues to check:"
    echo "  1. ESM/CommonJS syntax errors"
    echo "  2. Missing or incorrect imports"
    echo "  3. DB connection issues (should use stub)"
    echo "  4. Missing test fixtures"
    echo ""
    echo "Check the full log at: $TEST_LOG"
fi

echo ""
echo "Test log saved to: $TEST_LOG"
echo ""

exit $TEST_EXIT_CODE
