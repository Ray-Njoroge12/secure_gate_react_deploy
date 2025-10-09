import logger from 'utils/logger';
#!/usr/bin/env node

/**
 * Tailwind Migration Script
 * 
 * Automated script to help migrate custom CSS to Tailwind classes:
 * - Scans components for custom CSS usage
 * - Suggests Tailwind alternatives
 * - Generates migration reports
 * - Validates converted classes
 */

const fs = require('fs');
const path = require('path');
const { migrationUtils, componentMigrationHelpers } = require('../utils/tailwindMigration');

// Configuration
const CONFIG = {
  srcDir: path.join(__dirname, '../src'),
  outputDir: path.join(__dirname, '../migration-reports'),
  fileExtensions: ['.jsx', '.js', '.tsx', '.ts'],
  excludeDirs: ['node_modules', '.git', 'dist', 'build', 'migration-reports'],
  excludeFiles: ['tailwindMigration.js', 'migrateToTailwind.js'],
};

// Migration patterns for common CSS patterns
const MIGRATION_PATTERNS = [
  // Layout patterns
  {
    pattern: /className\s*=\s*["']([^"']*container[^"']*)["']/g,
    replacement: (match, className) => {
      if (className.includes('container')) {
        return `className="${className.replace(/container[^"']*/, 'container-app')}"`;
      }
      return match;
    }
  },
  
  // Button patterns
  {
    pattern: /className\s*=\s*["']([^"']*btn[^"']*)["']/g,
    replacement: (match, className) => {
      const buttonClasses = className.split(' ').map(cls => {
        if (cls.includes('btn-primary')) return 'bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md font-medium transition-colors touch-target';
        if (cls.includes('btn-secondary')) return 'bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-md font-medium transition-colors touch-target';
        if (cls.includes('btn-outline')) return 'border border-brand-600 text-brand-600 hover:bg-brand-600 hover:text-white px-4 py-2 rounded-md font-medium transition-colors touch-target';
        if (cls.includes('btn-ghost')) return 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-md font-medium transition-colors touch-target';
        if (cls.includes('btn-sm')) return 'px-3 py-1.5 text-sm';
        if (cls.includes('btn-lg')) return 'px-6 py-3 text-lg';
        return cls;
      }).join(' ');
      return `className="${buttonClasses}"`;
    }
  },
  
  // Card patterns
  {
    pattern: /className\s*=\s*["']([^"']*card[^"']*)["']/g,
    replacement: (match, className) => {
      const cardClasses = className.split(' ').map(cls => {
        if (cls.includes('card')) return 'bg-background-secondary border border-border-primary rounded-lg shadow-md';
        if (cls.includes('card-header')) return 'px-6 py-4 border-b border-border-primary';
        if (cls.includes('card-body')) return 'px-6 py-4';
        if (cls.includes('card-footer')) return 'px-6 py-4 border-t border-border-primary';
        return cls;
      }).join(' ');
      return `className="${cardClasses}"`;
    }
  },
  
  // Form patterns
  {
    pattern: /className\s*=\s*["']([^"']*form[^"']*)["']/g,
    replacement: (match, className) => {
      const formClasses = className.split(' ').map(cls => {
        if (cls.includes('form-group')) return 'mb-4';
        if (cls.includes('form-label')) return 'block text-sm font-medium text-text-primary mb-2';
        if (cls.includes('form-input')) return 'w-full px-3 py-2 border border-border-primary rounded-md bg-background-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent touch-target';
        if (cls.includes('form-error')) return 'text-error-500 text-sm mt-1';
        if (cls.includes('form-help')) return 'text-text-muted text-sm mt-1';
        return cls;
      }).join(' ');
      return `className="${formClasses}"`;
    }
  },
  
  // Layout patterns
  {
    pattern: /className\s*=\s*["']([^"']*layout[^"']*)["']/g,
    replacement: (match, className) => {
      const layoutClasses = className.split(' ').map(cls => {
        if (cls.includes('sidebar')) return 'bg-background-secondary border-r border-border-primary';
        if (cls.includes('main-content')) return 'flex-1 p-6';
        if (cls.includes('header')) return 'bg-background-secondary border-b border-border-primary px-6 py-4';
        return cls;
      }).join(' ');
      return `className="${layoutClasses}"`;
    }
  },
  
  // Navigation patterns
  {
    pattern: /className\s*=\s*["']([^"']*nav[^"']*)["']/g,
    replacement: (match, className) => {
      const navClasses = className.split(' ').map(cls => {
        if (cls.includes('nav-link')) return 'navlink text-text-secondary hover:text-text-primary px-3 py-2 rounded-md transition-colors touch-target';
        if (cls.includes('nav-link-active')) return 'navlink text-brand-600 bg-brand-50 px-3 py-2 rounded-md touch-target';
        if (cls.includes('breadcrumb')) return 'flex items-center space-x-2 text-sm text-text-muted';
        return cls;
      }).join(' ');
      return `className="${navClasses}"`;
    }
  },
  
  // Table patterns
  {
    pattern: /className\s*=\s*["']([^"']*table[^"']*)["']/g,
    replacement: (match, className) => {
      const tableClasses = className.split(' ').map(cls => {
        if (cls.includes('table')) return 'w-full border-collapse';
        if (cls.includes('table-header')) return 'bg-background-tertiary';
        if (cls.includes('table-cell')) return 'px-4 py-3 border-b border-border-primary text-left';
        if (cls.includes('table-row')) return 'hover:bg-background-tertiary transition-colors';
        return cls;
      }).join(' ');
      return `className="${tableClasses}"`;
    }
  },
  
  // Modal patterns
  {
    pattern: /className\s*=\s*["']([^"']*modal[^"']*)["']/g,
    replacement: (match, className) => {
      const modalClasses = className.split(' ').map(cls => {
        if (cls.includes('modal-overlay')) return 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal';
        if (cls.includes('modal-content')) return 'bg-background-secondary rounded-lg shadow-xl max-w-md w-full mx-4';
        if (cls.includes('modal-header')) return 'px-6 py-4 border-b border-border-primary';
        if (cls.includes('modal-body')) return 'px-6 py-4';
        if (cls.includes('modal-footer')) return 'px-6 py-4 border-t border-border-primary flex justify-end space-x-2';
        return cls;
      }).join(' ');
      return `className="${modalClasses}"`;
    }
  },
];

// Utility functions
const utils = {
  // Check if file should be excluded
  shouldExcludeFile: (filePath) => {
    const relativePath = path.relative(CONFIG.srcDir, filePath);
    return CONFIG.excludeFiles.some(exclude => relativePath.includes(exclude)) ||
           CONFIG.excludeDirs.some(exclude => relativePath.includes(exclude));
  },
  
  // Get all files to process
  getAllFiles: (dir) => {
    const files = [];
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!CONFIG.excludeDirs.includes(item)) {
          files.push(...utils.getAllFiles(fullPath));
        }
      } else if (CONFIG.fileExtensions.includes(path.extname(item))) {
        if (!utils.shouldExcludeFile(fullPath)) {
          files.push(fullPath);
        }
      }
    });
    
    return files;
  },
  
  // Extract className attributes from file content
  extractClassNames: (content) => {
    const classNameRegex = /className\s*=\s*["']([^"']*)["']/g;
    const matches = [];
    let match;
    
    while ((match = classNameRegex.exec(content)) !== null) {
      matches.push({
        fullMatch: match[0],
        className: match[1],
        index: match.index,
      });
    }
    
    return matches;
  },
  
  // Apply migration patterns to content
  applyMigrationPatterns: (content) => {
    let migratedContent = content;
    const changes = [];
    
    MIGRATION_PATTERNS.forEach((pattern, index) => {
      const matches = [...migratedContent.matchAll(pattern.pattern)];
      
      matches.forEach(match => {
        const original = match[0];
        const migrated = pattern.replacement(match[0], match[1]);
        
        if (original !== migrated) {
          changes.push({
            pattern: index,
            original,
            migrated,
            line: migratedContent.substring(0, match.index).split('\n').length,
          });
          migratedContent = migratedContent.replace(original, migrated);
        }
      });
    });
    
    return { content: migratedContent, changes };
  },
  
  // Generate migration report
  generateReport: (filePath, originalContent, migratedContent, changes) => {
    const originalClassNames = utils.extractClassNames(originalContent);
    const migratedClassNames = utils.extractClassNames(migratedContent);
    
    const report = {
      file: path.relative(CONFIG.srcDir, filePath),
      timestamp: new Date().toISOString(),
      originalClassCount: originalClassNames.length,
      migratedClassCount: migratedClassNames.length,
      changes: changes,
      migrationRate: (changes.length / originalClassNames.length) * 100,
      recommendations: [],
    };
    
    // Add recommendations
    if (report.migrationRate < 50) {
      report.recommendations.push('Consider manual review for better migration coverage');
    }
    
    if (changes.length === 0) {
      report.recommendations.push('No migration patterns matched - file may already be using Tailwind or needs manual conversion');
    }
    
    return report;
  },
  
  // Write migration report to file
  writeReport: (reports) => {
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    const reportPath = path.join(CONFIG.outputDir, `migration-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2));
    
    logger.debug(`Migration report written to: ${reportPath}`);
    return reportPath;
  },
};

// Main migration function
const migrateToTailwind = () => {
  logger.debug('🚀 Starting Tailwind migration...');
  logger.debug(`📁 Scanning directory: ${CONFIG.srcDir}`);
  
  const files = utils.getAllFiles(CONFIG.srcDir);
  logger.debug(`📄 Found ${files.length} files to process`);
  
  const reports = [];
  let totalChanges = 0;
  let filesProcessed = 0;
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { content: migratedContent, changes } = utils.applyMigrationPatterns(content);
      
      if (changes.length > 0) {
        const report = utils.generateReport(filePath, content, migratedContent, changes);
        reports.push(report);
        totalChanges += changes.length;
        
        logger.debug(`✅ ${path.relative(CONFIG.srcDir, filePath)}: ${changes.length} changes`);
      }
      
      filesProcessed++;
    } catch (error) {
      logger.error(`❌ Error processing ${filePath}:`, error.message);
    }
  });
  
  // Generate summary
  const summary = {
    totalFiles: files.length,
    filesProcessed,
    filesWithChanges: reports.length,
    totalChanges,
    averageChangesPerFile: reports.length > 0 ? totalChanges / reports.length : 0,
    migrationRate: reports.length > 0 ? reports.reduce((sum, r) => sum + r.migrationRate, 0) / reports.length : 0,
  };
  
  logger.debug('\n📊 Migration Summary:');
  logger.debug(`   Total files: ${summary.totalFiles}`);
  logger.debug(`   Files processed: ${summary.filesProcessed}`);
  logger.debug(`   Files with changes: ${summary.filesWithChanges}`);
  logger.debug(`   Total changes: ${summary.totalChanges}`);
  logger.debug(`   Average changes per file: ${summary.averageChangesPerFile.toFixed(2)}`);
  logger.debug(`   Average migration rate: ${summary.migrationRate.toFixed(2)}%`);
  
  // Write reports
  if (reports.length > 0) {
    const reportPath = utils.writeReport(reports);
    logger.debug(`\n📋 Detailed report saved to: ${reportPath}`);
  } else {
    logger.debug('\n✨ No migration changes needed - all files are already using Tailwind!');
  }
  
  return { summary, reports };
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    logger.debug(`
Usage: node migrateToTailwind.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be changed without making changes
  --verbose      Show detailed output for each file

Examples:
  node migrateToTailwind.js
  node migrateToTailwind.js --dry-run --verbose
    `);
    process.exit(0);
  }
  
  const isDryRun = args.includes('--dry-run');
  const isVerbose = args.includes('--verbose');
  
  if (isDryRun) {
    logger.debug('🔍 Running in dry-run mode - no files will be modified');
  }
  
  if (isVerbose) {
    logger.debug('📝 Verbose mode enabled');
  }
  
  migrateToTailwind();
}

module.exports = {
  migrateToTailwind,
  utils,
  CONFIG,
  MIGRATION_PATTERNS,
};




