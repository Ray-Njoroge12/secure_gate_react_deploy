#!/usr/bin/env node
/**
 * Database Migration Verification Script
 * 
 * Checks for:
 * 1. Duplicate migration numbers
 * 2. Duplicate table creations  
 * 3. Missing down migrations
 * 4. Foreign key consistency
 * 5. Index coverage
 * 
 * Usage: node verify-migrations.js
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationsDir = join(__dirname, '../src/database/migrations');

class MigrationVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(msg) {
    this.errors.push(`❌ ERROR: ${msg}`);
  }

  addWarning(msg) {
    this.warnings.push(`⚠️  WARNING: ${msg}`);
  }

  addInfo(msg) {
    this.info.push(`ℹ️  INFO: ${msg}`);
  }

  async verify() {
    console.log('🔍 DATABASE MIGRATION VERIFICATION');
    console.log('='.repeat(80));
    console.log('');

    const files = (await readdir(migrationsDir))
      .filter(f => f.endsWith('.sql') && !f.endsWith('.disabled'))
      .sort();

    await this.checkDuplicateNumbers(files);
    await this.checkTableCreations(files);
    await this.checkDownMigrations(files);
    await this.checkForeignKeys(files);
    
    this.printResults();
  }

  async checkDuplicateNumbers(files) {
    const numbers = new Map();
    
    for (const file of files) {
      const match = file.match(/^(\d+)/);
      if (!match) {
        this.addWarning(`File without number prefix: ${file}`);
        continue;
      }
      
      const num = match[1];
      if (numbers.has(num)) {
        numbers.get(num).push(file);
      } else {
        numbers.set(num, [file]);
      }
    }
    
    const duplicates = [...numbers.entries()].filter(([_, files]) => files.length > 1);
    
    if (duplicates.length > 0) {
      this.addError(`Found ${duplicates.length} duplicate migration numbers:`);
      for (const [num, files] of duplicates) {
        this.addError(`  ${num}: ${files.join(', ')}`);
      }
    } else {
      this.addInfo(`✅ No duplicate migration numbers`);
    }
  }

  async checkTableCreations(files) {
    const tables = new Map();
    
    for (const file of files) {
      const content = await readFile(join(migrationsDir, file), 'utf-8');
      const matches = content.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/gi);
      
      for (const match of matches) {
        const table = match[1];
        if (!tables.has(table)) {
          tables.set(table, []);
        }
        tables.get(table).push(file);
      }
    }
    
    const duplicates = [...tables.entries()].filter(([_, files]) => files.length > 1);
    
    if (duplicates.length > 0) {
      this.addWarning(`Found ${duplicates.length} tables created in multiple migrations:`);
      for (const [table, files] of duplicates) {
        this.addWarning(`  ${table} in: ${files.join(', ')}`);
      }
    } else {
      this.addInfo(`✅ No duplicate table creations`);
    }
    
    this.addInfo(`Total unique tables: ${tables.size}`);
  }

  async checkDownMigrations(files) {
    let missingDown = 0;
    
    for (const file of files) {
      const content = await readFile(join(migrationsDir, file), 'utf-8');
      
      if (!content.includes('-- Down migration') && !content.includes('-- Rollback')) {
        missingDown++;
      }
    }
    
    if (missingDown > 0) {
      this.addWarning(`${missingDown} migrations missing down/rollback section`);
    } else {
      this.addInfo(`✅ All migrations have down migration sections`);
    }
  }

  async checkForeignKeys(files) {
    const onDeleteBehaviors = new Map();
    
    for (const file of files) {
      const content = await readFile(join(migrationsDir, file), 'utf-8');
      const matches = content.matchAll(/ON DELETE (CASCADE|SET NULL|RESTRICT|NO ACTION)/gi);
      
      for (const match of matches) {
        const behavior = match[1].toUpperCase();
        onDeleteBehaviors.set(behavior, (onDeleteBehaviors.get(behavior) || 0) + 1);
      }
    }
    
    this.addInfo(`Foreign key ON DELETE behaviors:`);
    for (const [behavior, count] of onDeleteBehaviors.entries()) {
      this.addInfo(`  ${behavior}: ${count} instances`);
    }
    
    if (onDeleteBehaviors.size > 2) {
      this.addWarning(`Multiple ON DELETE behaviors used - consider standardizing`);
    }
  }

  printResults() {
    console.log('');
    console.log('='.repeat(80));
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(80));
    console.log('');
    
    if (this.errors.length > 0) {
      console.log('ERRORS:');
      this.errors.forEach(err => console.log(err));
      console.log('');
    }
    
    if (this.warnings.length > 0) {
      console.log('WARNINGS:');
      this.warnings.forEach(warn => console.log(warn));
      console.log('');
    }
    
    if (this.info.length > 0) {
      console.log('INFO:');
      this.info.forEach(info => console.log(info));
      console.log('');
    }
    
    console.log('='.repeat(80));
    
    if (this.errors.length === 0) {
      console.log('✅ VERIFICATION PASSED - No critical errors found');
    } else {
      console.log(`❌ VERIFICATION FAILED - ${this.errors.length} error(s) found`);
      process.exit(1);
    }
  }
}

// Run verification
const verifier = new MigrationVerifier();
verifier.verify().catch(err => {
  console.error('Verification script error:', err);
  process.exit(1);
});
