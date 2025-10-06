#!/bin/bash
echo "=== DIAGNOSTICS START ==="
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "Package type: $(grep '"type"' package.json)"
echo "Env file: $(ls -la .env 2>&1)"
echo "DB test: $(psql -U postgres -d gatedb -c 'SELECT 1;' 2>&1 || echo 'FAILED')"
echo "Port 3001: $(lsof -i :3001 2>&1 || echo 'FREE')"
echo "=== ATTEMPTING START ==="
timeout 10 npm run dev 2>&1 | head -50
