#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const JS_EXTENSIONS = new Set(['.js', '.cjs', '.mjs']);
const JSON_EXTENSION = '.json';

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalize(filePath) {
  return String(filePath || '').replace(/\\/g, '/');
}

function shouldCheckJsSyntax(filePath) {
  const normalized = normalize(filePath);
  const ext = path.extname(normalized).toLowerCase();

  if (!JS_EXTENSIONS.has(ext)) {
    return false;
  }

  if (normalized.startsWith('secure-gate-access/client/src/')) {
    return false;
  }

  if (normalized.endsWith('.jsx')) {
    return false;
  }

  if (normalized.startsWith('playwright-report/') || normalized.startsWith('test-results/')) {
    return false;
  }

  return true;
}

function shouldCheckJsonSyntax(filePath) {
  const normalized = normalize(filePath);
  const ext = path.extname(normalized).toLowerCase();
  if (ext !== JSON_EXTENSION) return false;

  return normalized.startsWith('.github/hooks/') || normalized.startsWith('.github/instructions/');
}

function checkNodeSyntax(filePath) {
  const result = spawnSync('node', ['--check', filePath], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    return (result.stderr || result.stdout || '').trim() || 'unknown node --check failure';
  }

  return null;
}

function checkJsonSyntax(filePath) {
  try {
    JSON.parse(fs.readFileSync(path.join(ROOT, filePath), 'utf8'));
    return null;
  } catch (error) {
    return error.message;
  }
}

function main() {
  if (process.env.ALLOW_STAGED_SYNTAX_FAILURES === 'true') {
    process.exit(0);
  }

  const staged = getStagedFiles();
  if (staged.length === 0) {
    process.exit(0);
  }

  const failures = [];

  for (const file of staged) {
    if (!fs.existsSync(path.join(ROOT, file))) {
      continue;
    }

    if (shouldCheckJsSyntax(file)) {
      const error = checkNodeSyntax(file);
      if (error) {
        failures.push({ file, kind: 'node-syntax', error });
      }
    }

    if (shouldCheckJsonSyntax(file)) {
      const error = checkJsonSyntax(file);
      if (error) {
        failures.push({ file, kind: 'json-parse', error });
      }
    }
  }

  if (failures.length === 0) {
    process.exit(0);
  }

  console.error('Staged syntax guard failed. Resolve errors before committing.');
  for (const failure of failures) {
    console.error(`- ${failure.file} [${failure.kind}]`);
    console.error(`  ${failure.error}`);
  }

  process.exit(1);
}

main();
