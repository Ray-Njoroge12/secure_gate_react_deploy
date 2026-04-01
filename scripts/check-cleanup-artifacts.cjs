#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

const BLOCKED_PATTERNS = [
  { re: /^playwright-report\//i, reason: 'Playwright HTML report output' },
  { re: /^test-results\//i, reason: 'General test-results output' },
  { re: /^playwright-results.*\.json$/i, reason: 'Playwright JSON result artifact' },
  { re: /^production-readiness-tests\/reports\//i, reason: 'Generated production readiness report output' },
  { re: /^production-readiness-tests\/certification-output\//i, reason: 'Generated certification output' },
  { re: /^documentation\/archive\/validation-artifacts\//i, reason: 'Archived generated validation artifacts' },
  { re: /^secure-gate-access\/client\/e2e\/.auth\/.*\.json$/i, reason: 'Playwright auth-state artifact' },
  { re: /(^|\/)\.tmp\//i, reason: 'Temporary workspace folder content' }
];

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

function findBlockedFiles(files) {
  const blocked = [];
  for (const file of files) {
    for (const entry of BLOCKED_PATTERNS) {
      if (entry.re.test(file)) {
        blocked.push({ file, reason: entry.reason });
        break;
      }
    }
  }
  return blocked;
}

function findZeroByteStagedFiles(files) {
  const zeroByte = [];
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        const stat = fs.statSync(file);
        if (stat.isFile() && stat.size === 0) {
          zeroByte.push(file);
        }
      }
    } catch {
      // Ignore files that cannot be stat'ed.
    }
  }
  return zeroByte;
}

function printFailures(blocked, zeroByte) {
  console.error('Cleanup guard: staged files include disallowed artifacts or empty files.');

  if (blocked.length > 0) {
    console.error('Blocked artifacts:');
    for (const item of blocked) {
      console.error(`  - ${item.file} (${item.reason})`);
    }
  }

  if (zeroByte.length > 0) {
    console.error('Zero-byte staged files:');
    for (const file of zeroByte) {
      console.error(`  - ${file}`);
    }
  }

  console.error('If intentional, unstage or remove these files before committing.');
}

function main() {
  if (process.env.ALLOW_CLEANUP_ARTIFACTS === 'true') {
    process.exit(0);
  }

  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    process.exit(0);
  }

  const blocked = findBlockedFiles(stagedFiles);
  const zeroByte = findZeroByteStagedFiles(stagedFiles);

  if (blocked.length === 0 && zeroByte.length === 0) {
    process.exit(0);
  }

  printFailures(blocked, zeroByte);
  process.exit(1);
}

main();
