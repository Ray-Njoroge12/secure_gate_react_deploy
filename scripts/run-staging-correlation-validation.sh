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
export OUTPUT_DIR
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

python - <<'PY'
import json
import sys
from pathlib import Path
import os

output_dir = Path(os.environ.get("OUTPUT_DIR", "staging-correlation"))
header_path = output_dir / "response-headers.txt"
body_path = output_dir / "response-body.json"
metadata_path = output_dir / "request-metadata.txt"
request_id = metadata_path.read_text().splitlines()[0].split("=", 1)[1]

headers = header_path.read_text().splitlines()
header_match = None
for line in headers:
    if line.lower().startswith("x-request-id:"):
        header_match = line.split(":", 1)[1].strip()
        break

if not header_match:
    print("Missing X-Request-ID response header.", file=sys.stderr)
    sys.exit(1)

if header_match != request_id:
    print(f"X-Request-ID mismatch (expected {request_id}, got {header_match}).", file=sys.stderr)
    sys.exit(1)

try:
    payload = json.loads(body_path.read_text())
except json.JSONDecodeError as exc:
    print(f"Response body is not valid JSON: {exc}", file=sys.stderr)
    sys.exit(1)

error_request_id = None
if isinstance(payload, dict):
    error = payload.get("error") or {}
    if isinstance(error, dict):
        error_request_id = error.get("requestId")

if error_request_id != request_id:
    print("error.requestId missing or does not match request id.", file=sys.stderr)
    sys.exit(1)

print("Validated request ID propagation in response headers and error payload.")
PY

cat <<NEXT

Next steps:
1) Confirm response header echoes X-Request-ID: ${REQUEST_ID}
2) Confirm response payload contains error.requestId: ${REQUEST_ID}
3) Query log aggregator for request_id=${REQUEST_ID} and capture request-start, request-end, error, and security logs.
4) Save log query output/screenshot and attach to the milestone completion record.

You can export OUTPUT_DIR to change where artifacts are stored.
NEXT
