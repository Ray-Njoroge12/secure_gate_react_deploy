#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || path.join('infrastructure', 'aws', 'iam');
const fullDir = path.resolve(process.cwd(), targetDir);

function isJsonFile(fileName) {
  return fileName.endsWith('.json');
}

function listJsonFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter(isJsonFile)
    .map((fileName) => path.join(dir, fileName));
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function isWildcardAction(action) {
  return action === '*' || action.endsWith(':*') || action.includes('*');
}

function isAllowedWildcardResource(resource) {
  if (!resource.includes('*')) return true;
  if (resource === '*') return false;
  return resource.endsWith('/*') && resource.indexOf('*') === resource.length - 1;
}

function lintPolicy(filePath) {
  const errors = [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const doc = JSON.parse(raw);

  const statements = ensureArray(doc.Statement);
  if (statements.length === 0) {
    errors.push('Policy has no statements.');
    return errors;
  }

  statements.forEach((statement, index) => {
    const actions = ensureArray(statement.Action);
    const resources = ensureArray(statement.Resource);

    actions.forEach((action) => {
      if (typeof action !== 'string') return;
      if (isWildcardAction(action)) {
        errors.push(`Statement ${index} has wildcard action: ${action}`);
      }
    });

    resources.forEach((resource) => {
      if (typeof resource !== 'string') return;
      if (!isAllowedWildcardResource(resource)) {
        errors.push(`Statement ${index} has overly broad resource: ${resource}`);
      }
    });

    if (statement.NotAction || statement.NotResource) {
      errors.push(`Statement ${index} uses NotAction/NotResource which is disallowed.`);
    }
  });

  return errors;
}

if (!fs.existsSync(fullDir)) {
  console.error(`IAM policy directory not found: ${fullDir}`);
  process.exit(1);
}

const files = listJsonFiles(fullDir);
if (files.length === 0) {
  console.log('No IAM policy JSON files found to lint.');
  process.exit(0);
}

let hasErrors = false;
files.forEach((filePath) => {
  const errors = lintPolicy(filePath);
  if (errors.length > 0) {
    hasErrors = true;
    console.error(`\n${path.relative(process.cwd(), filePath)}:`);
    errors.forEach((err) => console.error(`  - ${err}`));
  }
});

if (hasErrors) {
  console.error('\nIAM policy lint failed.');
  process.exit(1);
}

console.log('IAM policy lint passed.');
