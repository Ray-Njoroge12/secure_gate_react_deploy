#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const watchPaths = [
  'playwright-report',
  'test-results',
  'secure-gate-access/client/build',
  'secure-gate-access/server/logs'
];

function hasEntries(relativePath) {
  try {
    const absolute = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolute)) return false;
    const stat = fs.statSync(absolute);
    if (!stat.isDirectory()) return stat.size > 0;
    const entries = fs.readdirSync(absolute);
    return entries.length > 0;
  } catch {
    return false;
  }
}

function buildMessage() {
  const present = watchPaths.filter((p) => hasEntries(p));
  if (present.length === 0) {
    return 'Session hygiene check: no common generated output directories detected.';
  }

  return [
    'Session hygiene check: generated output directories detected.',
    `Review before commit: ${present.join(', ')}`,
    'Use cleanup guardrails for artifacts and stale temporary files.'
  ].join(' ');
}

const message = buildMessage();

process.stdout.write(
  JSON.stringify({
    continue: true,
    systemMessage: message
  })
);
