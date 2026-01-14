#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${STAGING_BASE_URL:-}" ]]; then
  echo "STAGING_BASE_URL is required (e.g., https://staging.example.com)" >&2
  exit 1
fi

if [[ -z "${KNOWN_FAILURE_PATH:-}" ]]; then
  echo "KNOWN_FAILURE_PATH is required (e.g., /api/estates/requirement-check)" >&2
  exit 1
fi

REQUEST_ID=${REQUEST_ID:-stage-corr-001}
OUTPUT_DIR=${OUTPUT_DIR:-staging-correlation}
METHOD=${METHOD:-GET}

mkdir -p "${OUTPUT_DIR}"

TARGET_URL="${STAGING_BASE_URL%/}${KNOWN_FAILURE_PATH}"

HEADER_FILE="${OUTPUT_DIR}/response-headers.txt"
BODY_FILE="${OUTPUT_DIR}/response-body.json"
METADATA_FILE="${OUTPUT_DIR}/request-metadata.txt"

cat <<META > "${METADATA_FILE}"
request_id=${REQUEST_ID}
method=${METHOD}
url=${TARGET_URL}
META

echo "Sending ${METHOD} to ${TARGET_URL} with X-Request-ID=${REQUEST_ID}"

curl -sS -X "${METHOD}" \
  -H "X-Request-ID: ${REQUEST_ID}" \
  -H "Accept: application/json" \
  -D "${HEADER_FILE}" \
  -o "${BODY_FILE}" \
  "${TARGET_URL}"

echo "Saved response headers to ${HEADER_FILE}"
echo "Saved response body to ${BODY_FILE}"

cat <<NEXT

Next steps:
1) Confirm response header echoes X-Request-ID: ${REQUEST_ID}
2) Confirm response payload contains error.requestId: ${REQUEST_ID}
3) Query log aggregator for request_id=${REQUEST_ID} and capture request-start, request-end, error, and security logs.
4) Save log query output/screenshot and attach to the milestone completion record.

You can export OUTPUT_DIR to change where artifacts are stored.
NEXT
