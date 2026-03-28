#!/usr/bin/env bash
set -euo pipefail

DATE_BIN="/bin/date"
GREP_BIN="/usr/bin/grep"
PASTE_BIN="/usr/bin/paste"
TR_BIN="/usr/bin/tr"

LOG_DIR='docs/plan/clean-20260325-01/logs'
PREFIX="T19_$(date +%Y%m%d-%H%M%S)"
ENV_FILE="$LOG_DIR/T18_20260325-194421_wrapper_env.filtered.env"
RUNTIME_FILE="$LOG_DIR/T18_20260325-194421_wrapper_runtime.json"
SMOKE_LOG_T18="$LOG_DIR/T18_20260325-194421_smoke_attempt.log"
MANUAL_LOG="$LOG_DIR/${PREFIX}_manual_replay.log"
RESULT_JSON="$LOG_DIR/${PREFIX}_manual_replay_result.json"
COMPARISON_MD="$LOG_DIR/${PREFIX}_comparison.md"
HINT_JSON="$LOG_DIR/${PREFIX}_next_step_hint.json"

EXEC_PATH=$(node -p "JSON.parse(require('fs').readFileSync('$RUNTIME_FILE','utf8')).execPath")
SCRIPT_PATH=$(node -p "JSON.parse(require('fs').readFileSync('$RUNTIME_FILE','utf8')).scriptPath")
PROBE_URL=$(node -p "(()=>{const o=JSON.parse(require('fs').readFileSync('$RUNTIME_FILE','utf8'));const i=o.argv.indexOf('--probe-url');return i>=0?o.argv[i+1]:'http://localhost:3001/health/ready';})()")

set -a
. "$ENV_FILE"
set +a

START_MS=$($DATE_BIN +%s%3N)
set +e
env -i CI="${CI-}" NODE_ENV="${NODE_ENV-}" PATH="${PATH-}" PORT="${PORT-}" PW_TRACE_LOG_DIR="${PW_TRACE_LOG_DIR-}" PW_WRAPPER_TRACE_PREFIX="${PW_WRAPPER_TRACE_PREFIX-}" "$EXEC_PATH" "$SCRIPT_PATH" --probe-url "$PROBE_URL" >"$MANUAL_LOG" 2>&1
EXIT_CODE=$?
set -e
END_MS=$($DATE_BIN +%s%3N)
DURATION_MS=$((END_MS-START_MS))

MANUAL_MARKERS=$($GREP_BIN -Eo 'PW_SERVER_STARTUP\|[A-Z_]+' "$MANUAL_LOG" | $PASTE_BIN -sd '>' - || true)
[ -n "$MANUAL_MARKERS" ] || MANUAL_MARKERS='none'
if $GREP_BIN -q 'PW_SERVER_STARTUP|READY' "$MANUAL_LOG" && [ "$EXIT_CODE" -eq 0 ]; then RESULT='ready'; else RESULT='failed'; fi
ERROR_SIGNATURE=$($GREP_BIN -E 'PW_SERVER_STARTUP\|FAILED|server_process_exited_before_ready|not found|Error:|Timed out|Cannot find module' "$MANUAL_LOG" | tail -n 1 | $TR_BIN -d '\r' || true)
[ -n "$ERROR_SIGNATURE" ] || ERROR_SIGNATURE='none'

T18_EXIT_CODE='1'
T18_MARKERS=$($GREP_BIN -Eo 'PW_SERVER_STARTUP\|[A-Z_]+' "$SMOKE_LOG_T18" | $PASTE_BIN -sd '>' - || true)
[ -n "$T18_MARKERS" ] || T18_MARKERS='none'
T18_ERROR_SIGNATURE=$($GREP_BIN -E 'Timed out|Cannot find module|PW_SERVER_STARTUP\|FAILED|ReferenceError|Process from config.webServer' "$SMOKE_LOG_T18" | tail -n 1 | $TR_BIN -d '\r' || true)
[ -n "$T18_ERROR_SIGNATURE" ] || T18_ERROR_SIGNATURE='none_captured_in_smoke_log'

if [ "$EXIT_CODE" -eq "$T18_EXIT_CODE" ] && [ "$MANUAL_MARKERS" = "$T18_MARKERS" ]; then PARITY='same'; else PARITY='different'; fi

printf '{\n  "task_id": "T19",\n  "plan_id": "clean-20260325-01",\n  "timestamp_prefix": "%s",\n  "executed_command": "%s %s --probe-url %s",\n  "env_contract_source": "%s",\n  "exit_code": %s,\n  "result": "%s",\n  "duration_ms": %s,\n  "marker_sequence": "%s",\n  "error_signature": "%s"\n}\n' "$PREFIX" "$EXEC_PATH" "$SCRIPT_PATH" "$PROBE_URL" "$ENV_FILE" "$EXIT_CODE" "$RESULT" "$DURATION_MS" "$MANUAL_MARKERS" "$ERROR_SIGNATURE" > "$RESULT_JSON"

cat > "$COMPARISON_MD" <<EOF
# T18 vs T19 Wrapper Replay Comparison

| Metric | T18 (Playwright webServer context) | T19 (manual replay outside Playwright) |
|---|---|---|
| exit_code | $T18_EXIT_CODE | $EXIT_CODE |
| marker_sequence | $T18_MARKERS | $MANUAL_MARKERS |
| time_to_ready/failure | not_captured_in_T18_smoke_log | $DURATION_MS ms |
| error_signature | $T18_ERROR_SIGNATURE | $ERROR_SIGNATURE |
| parity | $PARITY | $PARITY |

## Notes
- T18 source: $SMOKE_LOG_T18
- T19 source: $MANUAL_LOG
- T18 smoke log did not include explicit PW_SERVER_STARTUP markers or terminal failure line.
EOF

cat > "$HINT_JSON" <<EOF
{
  "task_id": "T19",
  "plan_id": "clean-20260325-01",
  "recommendation": "Manual replay fails before readiness with server_process_exited_before_ready under env -i contract. Next minimal diagnostic: replay once with host PATH inherited while keeping other filtered vars unchanged to validate PATH/npm dependency.",
  "scope": "diagnostic_only",
  "broad_refactor": false
}
EOF

echo "PREFIX=$PREFIX"
echo "EXIT_CODE=$EXIT_CODE"
echo "RESULT=$RESULT"
echo "DURATION_MS=$DURATION_MS"
echo "PARITY=$PARITY"
echo "ERROR_SIGNATURE=$ERROR_SIGNATURE"
echo "MANUAL_LOG=$MANUAL_LOG"
echo "RESULT_JSON=$RESULT_JSON"
echo "COMPARISON_MD=$COMPARISON_MD"
echo "HINT_JSON=$HINT_JSON"
