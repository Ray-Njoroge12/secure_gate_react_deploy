#!/usr/bin/env bash
set -euo pipefail

cd /Users/raynj/Desktop/secure-gate-react-express-fresh/secure-gate-access/server
npm run test -- --runInBand --runTestsByPath \
  tests/integration/security.integration.test.js \
  tests/integration/guard-authorization.integration.test.js \
  tests/integration/resident-public-visitor-routes.integration.test.js \
  tests/integration/resident-self-service-routes.integration.test.js \
  tests/integration/api/public.api.test.js \
  tests/integration/backend-deep-dive.dynamic-verification.integration.test.js \
  > /tmp/server-followup-accuracy.log 2>&1

echo 0 > /tmp/server-followup-accuracy.exit
