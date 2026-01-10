import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DEFAULT_ENTRY = path.resolve('client/build/index.html');

const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ENTRY;

if (!fs.existsSync(inputPath)) {
  console.error(`CSP validation failed: file not found at ${inputPath}`);
  process.exit(1);
}

const html = fs.readFileSync(inputPath, 'utf-8');
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]?.trim())
  .filter(Boolean);

if (inlineScripts.length === 0) {
  console.log('✅ CSP validation: no inline scripts detected.');
  process.exit(0);
}

const hashes = inlineScripts.map(script => {
  const hash = crypto.createHash('sha256').update(script).digest('base64');
  return `'sha256-${hash}'`;
});

console.log('⚠️ CSP validation: inline scripts detected. Add these hashes to script-src:');
hashes.forEach(hash => console.log(`  ${hash}`));
