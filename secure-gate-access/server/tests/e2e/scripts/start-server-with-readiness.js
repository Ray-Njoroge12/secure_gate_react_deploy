#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  createStartupMarkerTranscriptWriter,
  formatStartupMarker,
  waitForReadiness
} from './startupReadiness.js';

const readArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] || null;
};

const probeUrl = readArg('--probe-url') || process.env.PW_SERVER_PROBE_URL || 'http://localhost:3001/health/ready';
const timeoutMs = Number(process.env.PW_SERVER_STARTUP_TIMEOUT_MS || '120000');
const intervalMs = Number(process.env.PW_SERVER_PROBE_INTERVAL_MS || '1000');
const tracePrefix = process.env.PW_WRAPPER_TRACE_PREFIX || null;
const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, '../../../../../');
const serverRoot = path.resolve(scriptDir, '../../..');
const loadEnvPath = path.resolve(serverRoot, 'load-env.js');
const serverEntryPath = path.resolve(serverRoot, 'server.js');
const customStartCommand = process.env.PW_SERVER_START_COMMAND?.trim();
const useCustomShellCommand = Boolean(customStartCommand);
const startupCommand = useCustomShellCommand ? customStartCommand : process.execPath;
const startupArgs = useCustomShellCommand ? [] : ['--import', loadEnvPath, serverEntryPath];
const startupCommandForLog = useCustomShellCommand
  ? customStartCommand
  : `${process.execPath} --import "${loadEnvPath}" "${serverEntryPath}"`;
const traceDir = process.env.PW_TRACE_LOG_DIR
  ? path.resolve(process.env.PW_TRACE_LOG_DIR)
  : path.resolve(repoRoot, 'docs/plan/clean-20260325-01/logs');
const markerTranscriptPath = process.env.PW_WRAPPER_TRANSCRIPT_PATH?.trim()
  ? path.resolve(process.env.PW_WRAPPER_TRANSCRIPT_PATH)
  : null;

const redactIfSensitive = (key, value) => {
  if (/(TOKEN|SECRET|PASSWORD|PASS|KEY|COOKIE|AUTH|CREDENTIAL)/i.test(key)) {
    return '[REDACTED]';
  }

  return value;
};

const buildFilteredEnvSnapshot = () => {
  const keys = new Set(['PATH', 'NODE_ENV', 'PORT', 'CI']);

  Object.keys(process.env)
    .filter((key) => key.startsWith('PW_') || key.startsWith('PLAYWRIGHT_'))
    .forEach((key) => keys.add(key));

  const sortedKeys = Array.from(keys).sort((a, b) => a.localeCompare(b));

  return sortedKeys.map((key) => `${key}=${redactIfSensitive(key, process.env[key] ?? '')}`);
};

const writeTraceArtifacts = () => {
  if (!tracePrefix) {
    return;
  }

  fs.mkdirSync(traceDir, { recursive: true });

  const runtimeArtifactPath = path.join(traceDir, `${tracePrefix}_wrapper_runtime.json`);
  const filteredEnvPath = path.join(traceDir, `${tracePrefix}_wrapper_env.filtered.env`);

  const runtimePayload = {
    cwd: process.cwd(),
    execPath: process.execPath,
    scriptPath,
    argv: process.argv
  };

  fs.writeFileSync(runtimeArtifactPath, `${JSON.stringify(runtimePayload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(filteredEnvPath, `${buildFilteredEnvSnapshot().join('\n')}\n`, 'utf8');
};

const logMarker = (status, details = {}) => {
  const marker = formatStartupMarker(status, details);
  console.log(marker);
  writeTranscriptMarker(marker);
};

const writeTranscriptMarker = createStartupMarkerTranscriptWriter({
  transcriptPath: markerTranscriptPath,
  onError: (error) => {
    console.warn('[PW_WRAPPER_TRACE] Failed to append startup transcript marker:', error?.message || error);
  }
});

try {
  writeTraceArtifacts();
} catch (error) {
  console.warn('[PW_WRAPPER_TRACE] Failed to write runtime/env artifacts:', error?.message || error);
}

const serverProcess = spawn(startupCommand, startupArgs, {
  stdio: 'inherit',
  shell: useCustomShellCommand,
  env: {
    ...process.env,
    PW_SERVER_STARTUP_MODE: 'playwright'
  }
});

let isReady = false;
let hasShutdown = false;

const shutdown = (exitCode = 0) => {
  if (hasShutdown) {
    return;
  }

  hasShutdown = true;
  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }

  process.exit(exitCode);
};

serverProcess.once('exit', (code, signal) => {
  if (hasShutdown) {
    return;
  }

  if (!isReady) {
    logMarker('FAILED', {
      reason: 'server_process_exited_before_ready',
      code: code ?? 'null',
      signal: signal ?? 'none'
    });
    process.exit(code ?? 1);
    return;
  }

  process.exit(code ?? 0);
});

process.once('SIGTERM', () => shutdown(0));
process.once('SIGINT', () => shutdown(0));

logMarker('STARTING', { command: startupCommandForLog, probeUrl, timeoutMs, intervalMs });

try {
  const readinessResult = await waitForReadiness({
    probeUrl,
    timeoutMs,
    intervalMs,
    onAttempt: ({ attempt, statusCode, ok, error }) => {
      logMarker('PROBE_ATTEMPT', {
        attempt,
        probeUrl,
        statusCode,
        ok,
        error: error || 'none'
      });
    }
  });

  isReady = true;
  logMarker('READY', {
    probeUrl,
    attempts: readinessResult.attempts,
    durationMs: readinessResult.durationMs,
    statusCode: readinessResult.statusCode
  });
} catch (error) {
  logMarker('FAILED', {
    reason: 'readiness_probe_timeout',
    probeUrl,
    timeoutMs,
    attempts: error?.attempts ?? 'unknown',
    lastStatus: error?.lastStatusCode ?? 0,
    error: error?.message || 'unknown_error'
  });
  shutdown(1);
}
