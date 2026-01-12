#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-}"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: ${name}" >&2
    exit 1
  fi
}

if [[ -z "${DEPLOY_ENV}" ]]; then
  echo "DEPLOY_ENV must be set to staging or production." >&2
  exit 1
fi

require_env SMOKE_BASE_URL

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

"${REPO_ROOT}/secure-gate-access/scripts/deploy-aws.sh"

node "${REPO_ROOT}/secure-gate-access/server/scripts/smoke-test.js"
