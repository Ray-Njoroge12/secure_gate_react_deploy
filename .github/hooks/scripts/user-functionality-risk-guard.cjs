#!/usr/bin/env node

const fs = require('fs');

const HIGH_RISK_PATTERNS = [
  /secure-gate-access[\\/]client[\\/]src[\\/]contexts[\\/]AuthContext\.js/i,
  /secure-gate-access[\\/]client[\\/]src[\\/]utils[\\/]apiClient\.js/i,
  /secure-gate-access[\\/]client[\\/]src[\\/]routes[\\/]ProtectedRoute\.jsx/i,
  /secure-gate-access[\\/]client[\\/]src[\\/]pages[\\/]/i,
  /secure-gate-access[\\/]server[\\/]src[\\/]middleware[\\/]authMiddleware\.js/i,
  /secure-gate-access[\\/]server[\\/]src[\\/]middleware[\\/]estateContextMiddleware\.js/i,
  /secure-gate-access[\\/]server[\\/]src[\\/]routes[\\/]/i,
  /secure-gate-access[\\/]server[\\/]src[\\/]services[\\/]userService\.js/i,
  /secure-gate-access[\\/]server[\\/]src[\\/]services[\\/]healthCore\.js/i,
  /secure-gate-access[\\/]server[\\/]src[\\/]routes[\\/]healthRoutes\.js/i,
  /secure-gate-access[\\/]server[\\/]server\.js/i
];

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getFirst(obj, paths, fallback = undefined) {
  for (const path of paths) {
    const parts = path.split('.');
    let current = obj;
    let ok = true;
    for (const part of parts) {
      if (current && Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && current !== undefined) {
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
  for (const key of Object.keys(value)) {
    out.push(String(key));
    collectStrings(value[key], out);
  }
  return out;
}

function isWriteLikeTool(toolName, payloadBlob) {
  const name = String(toolName || '').toLowerCase();
  const blob = String(payloadBlob || '').toLowerCase();

  if (/read|list|search|grep|find|view|get/.test(name)) {
    return false;
  }

  if (/write|edit|apply|patch|create|delete|rename|move|insert|replace/.test(name)) {
    return true;
  }

  if (/"edittype"\s*:\s*"(edit|insert|delete)"/.test(blob)) {
    return true;
  }

  return /file|path|patch|rename|delete|create/.test(blob);
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
  if (process.env.ALLOW_HIGH_RISK_EDITS === 'true') {
    emitPermission('allow', 'High-risk edit guard bypassed via ALLOW_HIGH_RISK_EDITS=true');
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

  const writeLike = isWriteLikeTool(toolName, JSON.stringify({ toolName, toolInput }));
  if (!writeLike) {
    emitPermission('allow', 'No write-like tool action detected');
    return;
  }

  const allStrings = collectStrings({ toolName, toolInput, payload });
  const joined = allStrings.join('\n');
  const touchesHighRisk = HIGH_RISK_PATTERNS.some((pattern) => pattern.test(joined));

  if (!touchesHighRisk) {
    emitPermission('allow', 'No user-functionality high-risk path detected');
    return;
  }

  emitPermission(
    'ask',
    'High-risk user-functionality path detected. Confirm role/estate impact review, startup health checks, and targeted user-journey validation before proceeding.'
  );
}

main();
