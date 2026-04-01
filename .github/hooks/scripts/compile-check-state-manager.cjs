#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(process.cwd(), '.tmp');
const STATE_FILE = path.join(STATE_DIR, 'compile-check-state.json');

const SCOPE_CONFIG = {
  backend: {
    commandHints: [
      'cd secure-gate-access/server && npm run test:critical',
      'cd secure-gate-access/server && npm run test:unit'
    ]
  },
  frontend: {
    commandHints: [
      'cd secure-gate-access/client && npm run build:fast',
      'cd secure-gate-access/client && npm test -- --watchAll=false --passWithNoTests'
    ]
  }
};

const BACKEND_PATH_RE = /^secure-gate-access[\\/]server[\\/]/i;
const FRONTEND_PATH_RE = /^secure-gate-access[\\/]client[\\/](src|scripts|config|e2e)[\\/]/i;
const WRITE_TOOL_RE = /write|edit|apply|patch|create|delete|rename|move|insert|replace/i;
const READ_TOOL_RE = /read|list|search|grep|find|view|get/i;

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getFirst(obj, paths, fallback = undefined) {
  for (const candidate of paths) {
    const parts = candidate.split('.');
    let current = obj;
    let found = true;
    for (const part of parts) {
      if (current && Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }
    if (found && current !== undefined) {
      return current;
    }
  }
  return fallback;
}

function collectStrings(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (!value || typeof value !== 'object') {
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, out);
    }
    return out;
  }
  for (const [key, val] of Object.entries(value)) {
    out.push(String(key));
    collectStrings(val, out);
  }
  return out;
}

function normalizePath(rawPath) {
  return String(rawPath || '')
    .replace(/^file:\/\//i, '')
    .replace(/\\/g, '/')
    .replace(/^.*?secure-gate-react-express-fresh\//, '')
    .replace(/^\.\//, '')
    .trim();
}

function extractPathsFromBlob(blob) {
  const pathPattern = /(secure-gate-access[\\/](?:client|server)[\\/][^\s"'`\]\[\{\}\(\),]+)/gi;
  const hits = new Set();
  let match;
  while ((match = pathPattern.exec(blob)) !== null) {
    hits.add(normalizePath(match[1]));
  }
  return Array.from(hits);
}

function classifyScopes(paths) {
  const scopes = new Set();
  for (const filePath of paths) {
    if (BACKEND_PATH_RE.test(filePath)) scopes.add('backend');
    if (FRONTEND_PATH_RE.test(filePath)) scopes.add('frontend');
  }
  return scopes;
}

function isWriteLikeTool(toolName, payloadBlob) {
  const normalizedName = String(toolName || '').toLowerCase();
  const normalizedBlob = String(payloadBlob || '').toLowerCase();

  if (READ_TOOL_RE.test(normalizedName)) {
    return false;
  }

  if (WRITE_TOOL_RE.test(normalizedName)) {
    return true;
  }

  if (/"edittype"\s*:\s*"(edit|insert|delete)"/.test(normalizedBlob)) {
    return true;
  }

  if (/"permissiondecision"\s*:\s*"(allow|ask|deny)"/.test(normalizedBlob)) {
    return false;
  }

  return /file|path|patch|rename|delete|create/.test(normalizedBlob);
}

function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return { pendingScopes: [] };
    const parsed = safeJsonParse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!parsed || !Array.isArray(parsed.pendingScopes)) {
      return { pendingScopes: [] };
    }
    return {
      pendingScopes: parsed.pendingScopes.filter((scope) => scope === 'backend' || scope === 'frontend'),
      updatedAt: parsed.updatedAt || null
    };
  } catch {
    return { pendingScopes: [] };
  }
}

function writeState(state) {
  const pendingScopes = Array.isArray(state.pendingScopes) ? state.pendingScopes : [];
  if (pendingScopes.length === 0) {
    try {
      if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
    } catch {
      // Ignore cleanup errors.
    }
    return;
  }

  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        pendingScopes,
        updatedAt: Date.now()
      },
      null,
      2
    )
  );
}

function scopeSatisfiedByTerminalCommand(scope, command) {
  const normalized = String(command || '').toLowerCase();
  if (scope === 'backend') {
    return (
      normalized.includes('cd secure-gate-access/server') &&
      (normalized.includes('npm run test:critical') || normalized.includes('npm run test:unit') || normalized.includes('npm run test'))
    );
  }
  if (scope === 'frontend') {
    return (
      normalized.includes('cd secure-gate-access/client') &&
      (normalized.includes('npm run build:fast') || normalized.includes('npm run build') || normalized.includes('npm test'))
    );
  }
  return false;
}

function scopeSatisfiedByRunTests(scope, files) {
  if (!Array.isArray(files) || files.length === 0) {
    return false;
  }

  const normalizedFiles = files.map((entry) => normalizePath(entry));

  if (scope === 'backend') {
    return normalizedFiles.some((entry) => BACKEND_PATH_RE.test(entry));
  }

  if (scope === 'frontend') {
    return normalizedFiles.some((entry) => FRONTEND_PATH_RE.test(entry));
  }

  return false;
}

function emitMessage(message) {
  const payload = { continue: true };
  if (message) {
    payload.systemMessage = message;
  }
  process.stdout.write(JSON.stringify(payload));
}

function main() {
  if (process.env.DISABLE_COMPILE_CHECK_HOOKS === 'true') {
    emitMessage('Compile-check state manager bypassed via DISABLE_COMPILE_CHECK_HOOKS=true');
    return;
  }

  const raw = fs.readFileSync(0, 'utf8') || '';
  const payload = safeJsonParse(raw.trim()) || {};

  const toolName = getFirst(payload, [
    'tool_name',
    'toolName',
    'tool.name',
    'name',
    'hookInput.tool_name',
    'hookInput.toolName'
  ], '');

  const toolInput = getFirst(payload, [
    'tool_input',
    'toolInput',
    'tool.input',
    'input',
    'hookInput.tool_input',
    'hookInput.toolInput'
  ], {});

  const state = readState();
  const pending = new Set(state.pendingScopes || []);
  const originalPending = new Set(state.pendingScopes || []);

  const payloadBlob = JSON.stringify({ toolName, toolInput, payload });

  if (isWriteLikeTool(toolName, payloadBlob)) {
    const pathCandidates = extractPathsFromBlob(payloadBlob);
    const touchedScopes = classifyScopes(pathCandidates);

    for (const scope of touchedScopes) {
      pending.add(scope);
    }

    writeState({ pendingScopes: Array.from(pending) });

    if (touchedScopes.size > 0) {
      const scopeHints = Array.from(touchedScopes)
        .map((scope) => `${scope}: ${SCOPE_CONFIG[scope].commandHints.join(' OR ')}`)
        .join(' | ');

      emitMessage(
        `Compile-check pending for ${Array.from(touchedScopes).join(', ')} changes. Recommended next commands: ${scopeHints}`
      );
      return;
    }

    emitMessage();
    return;
  }

  const normalizedToolName = String(toolName || '').toLowerCase();

  if (normalizedToolName.includes('run_in_terminal') || normalizedToolName.includes('terminal')) {
    const command = getFirst(toolInput, ['command', 'args.command', 'terminalCommand'], '');
    for (const scope of Array.from(pending)) {
      if (scopeSatisfiedByTerminalCommand(scope, command)) {
        pending.delete(scope);
      }
    }
  }

  if (normalizedToolName.includes('runtests')) {
    const files = getFirst(toolInput, ['files'], []);
    for (const scope of Array.from(pending)) {
      if (scopeSatisfiedByRunTests(scope, files)) {
        pending.delete(scope);
      }
    }
  }

  writeState({ pendingScopes: Array.from(pending) });

  const clearedScopes = Array.from(originalPending).filter((scope) => !pending.has(scope));
  if (clearedScopes.length > 0) {
    emitMessage(`Compile-check scope cleared: ${clearedScopes.join(', ')}.`);
    return;
  }

  emitMessage();
}

main();
