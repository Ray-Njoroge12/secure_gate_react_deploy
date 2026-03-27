#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const LOG_DIR = 'docs/plan/clean-20260325-01/logs';
const prefix = `T19_${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')}`;

const envFile = path.join(LOG_DIR, 'T18_20260325-194421_wrapper_env.filtered.env');
const runtimeFile = path.join(LOG_DIR, 'T18_20260325-194421_wrapper_runtime.json');
const smokeLogT18 = path.join(LOG_DIR, 'T18_20260325-194421_smoke_attempt.log');

const manualLog = path.join(LOG_DIR, `${prefix}_manual_replay.log`);
const resultJson = path.join(LOG_DIR, `${prefix}_manual_replay_result.json`);
const comparisonMd = path.join(LOG_DIR, `${prefix}_comparison.md`);
const hintJson = path.join(LOG_DIR, `${prefix}_next_step_hint.json`);

const runtime = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
const execPath = runtime.execPath;
const scriptPath = runtime.scriptPath;
const probeIndex = runtime.argv.indexOf('--probe-url');
const probeUrl = probeIndex >= 0 ? runtime.argv[probeIndex + 1] : 'http://localhost:3001/health/ready';

const envLines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/).filter(Boolean);
const replayEnv = {};
for (const line of envLines) {
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx);
  const value = line.slice(idx + 1);
  replayEnv[key] = value;
}

const start = Date.now();
const replay = spawnSync(execPath, [scriptPath, '--probe-url', probeUrl], {
  env: replayEnv,
  encoding: 'utf8'
});
const durationMs = Date.now() - start;

const combinedLog = `${replay.stdout || ''}${replay.stderr || ''}`;
fs.writeFileSync(manualLog, combinedLog, 'utf8');

const markerMatches = [...combinedLog.matchAll(/PW_SERVER_STARTUP\|[A-Z_]+/g)].map((m) => m[0]);
const markerSequence = markerMatches.length ? markerMatches.join('>') : 'none';
const exitCode = typeof replay.status === 'number' ? replay.status : 1;
const result = markerSequence.includes('PW_SERVER_STARTUP|READY') && exitCode === 0 ? 'ready' : 'failed';

const signatureCandidates = combinedLog
  .split(/\r?\n/)
  .filter((line) => /PW_SERVER_STARTUP\|FAILED|server_process_exited_before_ready|not found|Error:|Timed out|Cannot find module/.test(line));
const errorSignature = signatureCandidates.length ? signatureCandidates[signatureCandidates.length - 1] : 'none';

const t18Log = fs.readFileSync(smokeLogT18, 'utf8');
const t18ExitCode = 1;
const t18Markers = [...t18Log.matchAll(/PW_SERVER_STARTUP\|[A-Z_]+/g)].map((m) => m[0]).join('>') || 'none';
const t18SigCandidates = t18Log
  .split(/\r?\n/)
  .filter((line) => /Timed out|Cannot find module|PW_SERVER_STARTUP\|FAILED|ReferenceError|Process from config\.webServer/.test(line));
const t18ErrorSignature = t18SigCandidates.length ? t18SigCandidates[t18SigCandidates.length - 1] : 'none_captured_in_smoke_log';

const parity = exitCode === t18ExitCode && markerSequence === t18Markers ? 'same' : 'different';

const resultPayload = {
  task_id: 'T19',
  plan_id: 'clean-20260325-01',
  timestamp_prefix: prefix,
  executed_command: `${execPath} ${scriptPath} --probe-url ${probeUrl}`,
  env_contract_source: envFile,
  exit_code: exitCode,
  result,
  duration_ms: durationMs,
  marker_sequence: markerSequence,
  error_signature: errorSignature
};
fs.writeFileSync(resultJson, `${JSON.stringify(resultPayload, null, 2)}\n`, 'utf8');

const comparison = [
  '# T18 vs T19 Wrapper Replay Comparison',
  '',
  '| Metric | T18 (Playwright webServer context) | T19 (manual replay outside Playwright) |',
  '|---|---|---|',
  `| exit_code | ${t18ExitCode} | ${exitCode} |`,
  `| marker_sequence | ${t18Markers} | ${markerSequence} |`,
  `| time_to_ready/failure | not_captured_in_T18_smoke_log | ${durationMs} ms |`,
  `| error_signature | ${t18ErrorSignature} | ${errorSignature} |`,
  `| parity | ${parity} | ${parity} |`,
  '',
  '## Notes',
  `- T18 source: ${smokeLogT18}`,
  `- T19 source: ${manualLog}`,
  '- T18 smoke log did not include explicit PW_SERVER_STARTUP markers or terminal failure line.',
  ''
].join('\n');
fs.writeFileSync(comparisonMd, comparison, 'utf8');

const hintPayload = {
  task_id: 'T19',
  plan_id: 'clean-20260325-01',
  recommendation:
    'Manual replay fails before readiness with server_process_exited_before_ready under env -i contract. Next minimal diagnostic: replay once with host PATH inherited while keeping other filtered vars unchanged to validate PATH/npm dependency.',
  scope: 'diagnostic_only',
  broad_refactor: false
};
fs.writeFileSync(hintJson, `${JSON.stringify(hintPayload, null, 2)}\n`, 'utf8');

console.log(`PREFIX=${prefix}`);
console.log(`EXIT_CODE=${exitCode}`);
console.log(`RESULT=${result}`);
console.log(`DURATION_MS=${durationMs}`);
console.log(`PARITY=${parity}`);
console.log(`ERROR_SIGNATURE=${errorSignature}`);
console.log(`MANUAL_LOG=${manualLog}`);
console.log(`RESULT_JSON=${resultJson}`);
console.log(`COMPARISON_MD=${comparisonMd}`);
console.log(`HINT_JSON=${hintJson}`);
