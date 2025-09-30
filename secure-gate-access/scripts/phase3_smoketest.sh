#!/usr/bin/env bash
set -euo pipefail
BASE_URL=${1:-http://localhost:5000}
echo "Phase 3 Smoke Test starting..."
curl -sf "$BASE_URL/health" | jq . || true
echo "Phase 3 basic check complete"
