#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 FINAL SYSTEM CLEANUP - ENVIRONMENT & CONFIG CONSOLIDATION');
console.log('============================================================\n');

// Get file info helper
const getFileInfo = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      exists: true,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      readableSize: (stats.size / 1024).toFixed(1) + 'KB'
    };
  } catch (error) {
    return { exists: false };
  }
};

// Analysis categories
const analysis = {
  envFiles: [],
  packageFiles: [],
  backupFiles: [],
  duplicateConfigs: [],
  unnecessaryFiles: []
};

console.log('📊 ANALYZING REMAINING SYSTEM FILES...\n');

// Find all .env files
const envPatterns = [
  'secure-gate-access/server/.env',
  'secure-gate-access/server/.env.*',
  'secure-gate-access/client/.env*',
  'secure-gate-access/.env*'
];

// Search for environment files
const { execSync } = require('child_process');

try {
  const envFiles = execSync('find secure-gate-access -name ".env*" -type f 2>/dev/null || true', { encoding: 'utf8' })
    .trim().split('\\n').filter(Boolean);
  
  analysis.envFiles = envFiles.map(file => ({
    path: file,
    info: getFileInfo(file),
    priority: file.includes('.backup') ? 'BACKUP' : 
              file.includes('.example') ? 'EXAMPLE' : 
              file.includes('.test') ? 'TEST' :
              file.includes('.africastalking') ? 'SERVICE' :
              file.includes('.mailgun') ? 'SERVICE' :
              file.includes('.production') ? 'PRODUCTION' : 'ACTIVE'
  }));
} catch (error) {
  console.log('⚠️ Error finding env files:', error.message);
}

// Find package.json files
try {
  const packageFiles = execSync('find . -name "package.json" -type f 2>/dev/null || true', { encoding: 'utf8' })
    .trim().split('\\n').filter(Boolean);
  
  analysis.packageFiles = packageFiles.map(file => ({
    path: file,
    info: getFileInfo(file)
  }));
} catch (error) {
  console.log('⚠️ Error finding package files:', error.message);
}

// Find backup files
try {
  const backupFiles = execSync('find . -name "*.backup*" -o -name "*-backup*" -o -name "*.bak" 2>/dev/null || true', { encoding: 'utf8' })
    .trim().split('\\n').filter(Boolean);
  
  analysis.backupFiles = backupFiles.map(file => ({
    path: file,
    info: getFileInfo(file)
  }));
} catch (error) {
  console.log('⚠️ Error finding backup files:', error.message);
}

// Report findings
console.log('🗂️ ENVIRONMENT FILES ANALYSIS:');
analysis.envFiles.forEach(file => {
  const priority = file.priority === 'ACTIVE' ? '🔥' : 
                   file.priority === 'PRODUCTION' ? '🏭' :
                   file.priority === 'SERVICE' ? '⚙️' :
                   file.priority === 'TEST' ? '🧪' :
                   file.priority === 'EXAMPLE' ? '📋' : '🗃️';
  console.log(`  ${priority} ${file.path} (${file.info.readableSize}) - ${file.priority}`);
});

console.log('\\n📦 PACKAGE.JSON FILES:');
analysis.packageFiles.forEach(file => {
  console.log(`  📄 ${file.path} (${file.info.readableSize})`);
});

console.log('\\n🗃️ BACKUP FILES:');
analysis.backupFiles.forEach(file => {
  console.log(`  🗄️ ${file.path} (${file.info.readableSize})`);
});

// Calculate total cleanup potential
const totalEnvFiles = analysis.envFiles.length;
const totalBackupFiles = analysis.backupFiles.length;
console.log(`\\n📈 CLEANUP SUMMARY:`);
console.log(`  • Environment files: ${totalEnvFiles} found`);
console.log(`  • Package files: ${analysis.packageFiles.length} found`);
console.log(`  • Backup files: ${totalBackupFiles} found`);

// Recommendations
console.log('\\n🎯 CLEANUP RECOMMENDATIONS:');

const backupEnvFiles = analysis.envFiles.filter(f => f.priority === 'BACKUP');
const exampleEnvFiles = analysis.envFiles.filter(f => f.priority === 'EXAMPLE');
const serviceEnvFiles = analysis.envFiles.filter(f => f.priority === 'SERVICE');

if (backupEnvFiles.length > 0) {
  console.log(`  🗑️ Remove ${backupEnvFiles.length} backup .env files`);
}

if (exampleEnvFiles.length > 0) {
  console.log(`  📋 Consolidate ${exampleEnvFiles.length} example .env files`);
}

if (serviceEnvFiles.length > 0) {
  console.log(`  ⚙️ Review ${serviceEnvFiles.length} service-specific .env files for consolidation`);
}

if (analysis.backupFiles.length > 0) {
  console.log(`  🗄️ Remove ${analysis.backupFiles.length} backup files`);
}

console.log('\\n✅ ANALYSIS COMPLETE - Ready for targeted cleanup');
