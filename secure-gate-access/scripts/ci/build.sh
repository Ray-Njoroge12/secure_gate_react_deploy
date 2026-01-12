#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

pushd "${REPO_ROOT}/secure-gate-access/server" >/dev/null
npm ci
npm test
popd >/dev/null

pushd "${REPO_ROOT}" >/dev/null
npm run build
popd >/dev/null
