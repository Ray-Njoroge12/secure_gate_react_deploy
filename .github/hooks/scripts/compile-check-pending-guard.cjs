#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.cwd(), '.tmp', 'compile-check-state.json');
const READ_TOOL_RE = /read|list|search|grep|find|view|get/i;
const WRITE_TOOL_RE = /write|edit|apply|patch|create|delete|rename|move|insert|replace/i;

const COMMAND_HINTS = {
  backend: [
    'cd secure-gate-access/server && npm run test:critical',
    'cd secure-gate-access/server && npm run test:unit'
  ],
  frontend: [
    'cd secure-gate-access/client && npm run build:fast',
    'cd secure-gate-access/client && npm test -- --watchAll=false --passWithNoTests'
  ]
};

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

function readPendingScopes() {
  try {
    if (!fs.existsSync(STATE_FILE)) return [];
    const parsed = safeJsonParse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (!parsed || !Array.isArray(parsed.pendingScopes)) return [];
    return parsed.pendingScopes.filter((scope) => scope === 'backend' || scope === 'frontend');
  } catch {
    return [];
  }
}

function emitPermission(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: reason
      }
    })
  );
}

function main() {
  if (process.env.ALLOW_PENDING_COMPILE_EDITS === 'true') {
    emitPermission('allow', 'Pending compile-check guard bypassed via ALLOW_PENDING_COMPILE_EDITS=true');
    return;
  }

  const pendingScopes = readPendingScopes();
  if (pendingScopes.length === 0) {
    emitPermission('allow', 'No pending compile-check scopes');
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

  const blob = JSON.stringify({ toolName, toolInput, payload });
  if (!isWriteLikeTool(toolName, blob)) {
    emitPermission('allow', 'Pending compile-check scopes ignored for non-write operation');
    return;
  }

  const guidance = pendingScopes
    .map((scope) => `${scope}: ${COMMAND_HINTS[scope].join(' OR ')}`)
    .join(' | ');

  emitPermission(
    'ask',
    `Compile-check still pending for ${pendingScopes.join(', ')} changes. Run checks first: ${guidance}. Set ALLOW_PENDING_COMPILE_EDITS=true to bypass temporarily.`
  );
}

main();
