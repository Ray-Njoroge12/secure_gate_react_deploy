#!/usr/bin/env node
/**
 * Console Statement Migration Script
 * Replaces console.log/error/warn with proper logging service
 *
 * Usage: node scripts/migrate-console-statements.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_DIR = path.join(__dirname, '../src');
const CLIENT_DIR = path.join(__dirname, '../../client/src');

// Statistics
const stats = {
  filesProcessed: 0,
  consoleLogReplaced: 0,
  consoleErrorReplaced: 0,
  consoleWarnReplaced: 0,
  consoleInfoReplaced: 0,
  consoleDebugReplaced: 0,
  importsAdded: 0,
  errors: []
};

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  if (ext !== '.js' && ext !== '.jsx') return false;

  // Skip certain files
  const skipPatterns = [
    'node_modules',
    'build',
    'dist',
    '.test.',
    '.spec.',
    'migrate-console-statements.js'
  ];

  return !skipPatterns.some(pattern => filePath.includes(pattern));
}

/**
 * Check if file already imports logging service
 */
function hasLoggingImport(content, isServer) {
  if (isServer) {
    return content.includes("import loggingService from") ||
           content.includes("const loggingService = require");
  } else {
    return content.includes("import logger from") ||
           content.includes("const logger = require");
  }
}

/**
 * Add logging import to file
 */
function addLoggingImport(content, isServer) {
  const importStatement = isServer
    ? "import loggingService from './services/loggingService.js';\n"
    : "import logger from 'utils/logger';\n";

  // Find the last import statement
  const importRegex = /^import .+ from .+;$/gm;
  const imports = content.match(importRegex);

  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertIndex = lastImportIndex + lastImport.length + 1;

    return content.slice(0, insertIndex) + importStatement + content.slice(insertIndex);
  } else {
    // No imports found, add at the beginning
    return importStatement + content;
  }
}

/**
 * Migrate console statements in content
 */
function migrateConsoleStatements(content, isServer) {
  let modified = content;
  const logService = isServer ? 'loggingService' : 'logger';

  // Track if we need to add import
  let needsImport = false;

  // Replace console.log
  const consoleLogMatches = (modified.match(/console\.log\(/g) || []).length;
  if (consoleLogMatches > 0) {
    // Replace console.log with proper format
    modified = modified.replace(
      /console\.log\((.*?)\);?/gs,
      (match, args) => {
        needsImport = true;
        stats.consoleLogReplaced++;

        // Handle different argument patterns
        if (args.includes(',')) {
          // Multiple arguments - convert to structured logging
          const parts = args.split(',').map(s => s.trim());
          const message = parts[0].replace(/['"]/g, '');
          const data = parts.slice(1).join(', ');
          return `${logService}.logInfo(${parts[0]}, { data: ${data} });`;
        } else {
          return `${logService}.logInfo(${args});`;
        }
      }
    );
  }

  // Replace console.error
  const consoleErrorMatches = (modified.match(/console\.error\(/g) || []).length;
  if (consoleErrorMatches > 0) {
    modified = modified.replace(
      /console\.error\((.*?)\);?/gs,
      (match, args) => {
        needsImport = true;
        stats.consoleErrorReplaced++;

        if (args.includes(',')) {
          const parts = args.split(',').map(s => s.trim());
          return `${logService}.logError(${parts[0]}, ${parts.slice(1).join(', ')});`;
        } else {
          return `${logService}.logError(${args});`;
        }
      }
    );
  }

  // Replace console.warn
  const consoleWarnMatches = (modified.match(/console\.warn\(/g) || []).length;
  if (consoleWarnMatches > 0) {
    modified = modified.replace(
      /console\.warn\((.*?)\);?/gs,
      (match, args) => {
        needsImport = true;
        stats.consoleWarnReplaced++;

        if (args.includes(',')) {
          const parts = args.split(',').map(s => s.trim());
          return `${logService}.logWarn(${parts[0]}, ${parts.slice(1).join(', ')});`;
        } else {
          return `${logService}.logWarn(${args});`;
        }
      }
    );
  }

  // Replace console.info
  const consoleInfoMatches = (modified.match(/console\.info\(/g) || []).length;
  if (consoleInfoMatches > 0) {
    modified = modified.replace(/console\.info\(/g, () => {
      needsImport = true;
      stats.consoleInfoReplaced++;
      return `${logService}.logInfo(`;
    });
  }

  // Replace console.debug
  const consoleDebugMatches = (modified.match(/console\.debug\(/g) || []).length;
  if (consoleDebugMatches > 0) {
    modified = modified.replace(/console\.debug\(/g, () => {
      needsImport = true;
      stats.consoleDebugReplaced++;
      return `${logService}.logDebug(`;
    });
  }

  // Add import if needed and not already present
  if (needsImport && !hasLoggingImport(modified, isServer)) {
    modified = addLoggingImport(modified, isServer);
    stats.importsAdded++;
  }

  return modified;
}

/**
 * Process a single file
 */
async function processFile(filePath, isServer) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Check if file has console statements
    if (!content.includes('console.')) {
      return;
    }

    const modified = migrateConsoleStatements(content, isServer);

    if (modified !== content) {
      await fs.writeFile(filePath, modified, 'utf-8');
      stats.filesProcessed++;
      console.log(`✓ Migrated: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Recursively process directory
 */
async function processDirectory(dir, isServer) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip certain directories
        if (!['node_modules', 'build', 'dist', '.git'].includes(entry.name)) {
          await processDirectory(fullPath, isServer);
        }
      } else if (entry.isFile() && shouldProcessFile(fullPath)) {
        await processFile(fullPath, isServer);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error.message);
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🔄 Starting console statement migration...\n');

  // Process server files
  console.log('📂 Processing server files...');
  await processDirectory(SERVER_DIR, true);

  // Process client files
  console.log('\n📂 Processing client files...');
  await processDirectory(CLIENT_DIR, false);

  // Print statistics
  console.log('\n✅ Migration complete!\n');
  console.log('📊 Statistics:');
  console.log(`   Files processed: ${stats.filesProcessed}`);
  console.log(`   console.log replaced: ${stats.consoleLogReplaced}`);
  console.log(`   console.error replaced: ${stats.consoleErrorReplaced}`);
  console.log(`   console.warn replaced: ${stats.consoleWarnReplaced}`);
  console.log(`   console.info replaced: ${stats.consoleInfoReplaced}`);
  console.log(`   console.debug replaced: ${stats.consoleDebugReplaced}`);
  console.log(`   Imports added: ${stats.importsAdded}`);

  const totalReplaced = stats.consoleLogReplaced + stats.consoleErrorReplaced +
                        stats.consoleWarnReplaced + stats.consoleInfoReplaced +
                        stats.consoleDebugReplaced;
  console.log(`\n   Total console statements replaced: ${totalReplaced}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach(({ file, error }) => {
      console.log(`   - ${file}: ${error}`);
    });
  }
}

// Run migration
migrate().catch(console.error);
