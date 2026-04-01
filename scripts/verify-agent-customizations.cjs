#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();

const instructionFiles = [
  '.github/instructions/backend-estate-guardrails.instructions.md',
  '.github/instructions/frontend-routing-auth.instructions.md',
  '.github/instructions/testing-execution.instructions.md',
  '.github/instructions/user-functionality-journeys.instructions.md',
  '.github/instructions/cleanup-hygiene.instructions.md'
];

const hookJsonFiles = [
  '.github/hooks/block-archive-edits.json',
  '.github/hooks/compile-check-pending-guard.json',
  '.github/hooks/compile-check-state-manager.json',
  '.github/hooks/session-start-cleanliness.json',
  '.github/hooks/user-functionality-risk-guard.json'
];

const hookScriptFiles = [
  '.github/hooks/scripts/block-archive-edits.cjs',
  '.github/hooks/scripts/compile-check-pending-guard.cjs',
  '.github/hooks/scripts/compile-check-state-manager.cjs',
  '.github/hooks/scripts/session-start-cleanliness.cjs',
  '.github/hooks/scripts/user-functionality-risk-guard.cjs'
];

const requiredFiles = [
  '.github/copilot-instructions.md',
  '.githooks/pre-commit',
  'scripts/check-cleanup-artifacts.cjs',
  'scripts/check-staged-syntax.cjs',
  'scripts/setup-git-hooks.sh',
  '.github/CUSTOMIZATION_RUNBOOK.md'
];

const failures = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function assertExists(relativePath) {
  if (!exists(relativePath)) {
    failures.push(`Missing file: ${relativePath}`);
  }
}

function checkInstructionFrontmatter(relativePath) {
  const absolute = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolute)) {
    return;
  }

  const content = fs.readFileSync(absolute, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    failures.push(`Instruction missing frontmatter: ${relativePath}`);
    return;
  }

  const frontmatter = match[1];
  if (!/\bdescription\s*:/m.test(frontmatter)) {
    failures.push(`Instruction missing description field: ${relativePath}`);
  }
}

function checkHookJson(relativePath) {
  const absolute = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolute)) {
    return;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    if (!parsed.hooks || typeof parsed.hooks !== 'object') {
      failures.push(`Hook JSON missing hooks object: ${relativePath}`);
    }
  } catch (error) {
    failures.push(`Invalid JSON in ${relativePath}: ${error.message}`);
  }
}

function checkNodeSyntax(relativePath) {
  const absolute = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolute)) {
    return;
  }

  const result = spawnSync('node', ['--check', absolute], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push(`Syntax check failed for ${relativePath}: ${(result.stderr || result.stdout || '').trim()}`);
  }
}

function checkShellSyntax(relativePath) {
  const absolute = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolute)) {
    return;
  }

  const result = spawnSync('sh', ['-n', absolute], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push(`Shell syntax check failed for ${relativePath}: ${(result.stderr || result.stdout || '').trim()}`);
  }
}

function checkPreCommitWiring() {
  const preCommitPath = path.join(ROOT, '.githooks/pre-commit');
  if (!fs.existsSync(preCommitPath)) {
    return;
  }

  const content = fs.readFileSync(preCommitPath, 'utf8');
  if (!content.includes('node scripts/check-cleanup-artifacts.cjs')) {
    failures.push('Pre-commit hook does not call scripts/check-cleanup-artifacts.cjs');
  }
  if (!content.includes('node scripts/check-staged-syntax.cjs')) {
    failures.push('Pre-commit hook does not call scripts/check-staged-syntax.cjs');
  }
}

function checkGitHooksPath() {
  const result = spawnSync('git', ['config', '--get', 'core.hooksPath'], { encoding: 'utf8' });
  if (result.status !== 0) {
    warnings.push('Could not read git core.hooksPath (run from repo root with git available).');
    return;
  }

  const hooksPath = (result.stdout || '').trim();
  if (hooksPath !== '.githooks') {
    warnings.push(`core.hooksPath is '${hooksPath || '(empty)'}', expected '.githooks'. Run: sh scripts/setup-git-hooks.sh`);
  }
}

function printSummary() {
  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.error('Failures:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Agent customization verification passed.');
}

function main() {
  for (const file of requiredFiles) assertExists(file);
  for (const file of instructionFiles) {
    assertExists(file);
    checkInstructionFrontmatter(file);
  }
  for (const file of hookJsonFiles) {
    assertExists(file);
    checkHookJson(file);
  }
  for (const file of hookScriptFiles) {
    assertExists(file);
    checkNodeSyntax(file);
  }

  checkNodeSyntax('scripts/check-cleanup-artifacts.cjs');
  checkNodeSyntax('scripts/check-staged-syntax.cjs');
  checkShellSyntax('scripts/setup-git-hooks.sh');
  checkPreCommitWiring();
  checkGitHooksPath();

  printSummary();
}

main();
