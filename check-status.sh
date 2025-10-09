#!/bin/bash

echo "==================================="
echo "PRODUCTION READINESS STATUS CHECK"
echo "==================================="
echo ""

echo "1. Docker Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" 2>&1 || echo "Docker not available"
echo ""

echo "2. Server Health:"
curl -s http://localhost:3000/api/health 2>&1 || echo "Server not responding"
echo ""

echo "3. Critical Files:"
ls -la /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server/src/services/secretsManagerService.js 2>&1 | grep -v "^total" || echo "File not found"
echo ""

echo "4. Test Directories:"
ls -la /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server/tests/ 2>&1 | tail -n +4 || echo "Directory not found"
echo ""

echo "5. Node Modules:"
ls /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server/node_modules 2>&1 | head -10 || echo "Not installed"
echo ""

echo "Status check complete."
