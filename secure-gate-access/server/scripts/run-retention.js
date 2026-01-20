import { dbManager } from '../src/database/db.enhanced.js';

const args = process.argv.slice(2);

const usage = 'Usage: node scripts/run-retention.js [--dry-run|--no-dry-run|--dry-run=true|--dry-run=false]';

const wantsHelp = args.includes('--help') || args.includes('-h');
if (wantsHelp) {
  console.log(usage);
  process.exit(0);
}

function resolveDryRunFlag() {
  if (args.includes('--dry-run')) {
    return 'true';
  }
  if (args.includes('--no-dry-run')) {
    return 'false';
  }
  const explicit = args.find((arg) => arg.startsWith('--dry-run='));
  if (!explicit) {
    return null;
  }
  const value = explicit.split('=')[1]?.trim().toLowerCase();
  if (!value) {
    return 'true';
  }
  if (value === 'true' || value === 'false') {
    return value;
  }
  throw new Error(`Invalid value for --dry-run: ${value}`);
}

let exitCode = 0;

async function run() {
  const dryRunValue = resolveDryRunFlag();
  if (dryRunValue !== null) {
    process.env.DATA_RETENTION_DRY_RUN = dryRunValue;
  }

  const { default: retentionService } = await import('../src/services/retentionService.js');

  await dbManager.initializeAsync();
  const result = await retentionService.runRetentionJob();
  console.log(JSON.stringify(result, null, 2));
}

run()
  .catch((error) => {
    exitCode = 1;
    console.error('Retention job failed:', error);
  })
  .finally(async () => {
    try {
      await dbManager.disconnect();
    } catch (error) {
      exitCode = exitCode || 1;
      console.error('Failed to close database connection:', error);
    }
    process.exit(exitCode);
  });
