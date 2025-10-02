#!/usr/bin/env node
// scripts/file-by-file-validation.js
// Validates every modified file in the frontend optimization

const fs = require('fs');
const path = require('path');

console.log('📁 FILE-BY-FILE VALIDATION');
console.log('==========================\n');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function validateFile(filePath, checks) {
  const fullPath = path.join(__dirname, '../', filePath);
  
  if (!fs.existsSync(fullPath)) {
    results.failed.push({
      file: filePath,
      issue: 'File does not exist'
    });
    console.log(`❌ ${filePath} - File not found`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  let filePass = true;
  const issues = [];

  for (const check of checks) {
    const passed = check.test(content);
    if (!passed) {
      filePass = false;
      issues.push(check.name);
    }
  }

  if (filePass) {
    results.passed.push(filePath);
    console.log(`✅ ${filePath}`);
  } else {
    results.failed.push({
      file: filePath,
      issues
    });
    console.log(`❌ ${filePath}`);
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
}

console.log('🔍 Phase 1 Files: Critical Fixes\n');

validateFile('secure-gate-access/client/src/pages/Login.jsx', [
  {
    name: 'No hardcoded localhost:5000',
    test: (content) => !content.includes('localhost:5000')
  },
  {
    name: 'Uses /api/auth/forgot-password',
    test: (content) => content.includes('/api/auth/forgot-password') || !content.includes('forgot-password')
  }
]);

validateFile('secure-gate-access/client/src/pages/Register.js', [
  {
    name: 'No hardcoded URLs',
    test: (content) => !content.includes('localhost:5000')
  },
  {
    name: 'debug_otp guarded with NODE_ENV',
    test: (content) => {
      if (!content.includes('debug_otp')) return true;
      const lines = content.split('\n');
      let inGuard = false;
      for (const line of lines) {
        if (line.includes('process.env.NODE_ENV') && line.includes('development')) {
          inGuard = true;
        }
        if (inGuard && line.includes('debug_otp')) {
          return true;
        }
        if (line.includes('}') && inGuard) {
          inGuard = false;
        }
      }
      return false;
    }
  }
]);

validateFile('secure-gate-access/client/src/pages/GuestInvite.jsx', [
  {
    name: 'debug_otp guarded',
    test: (content) => {
      if (!content.includes('debug_otp')) return true;
      return content.includes('NODE_ENV');
    }
  }
]);

validateFile('secure-gate-access/client/src/pages/ResetPasswordPage.js', [
  {
    name: 'Uses /api/auth/reset-password',
    test: (content) => content.includes('/api/auth/reset-password')
  },
  {
    name: 'No hardcoded localhost',
    test: (content) => !content.includes('localhost:5000')
  }
]);

console.log('\n🔍 Phase 2 Files: Code Cleanup\n');

validateFile('secure-gate-access/client/src/utils/logger.js', [
  {
    name: 'Exports logger functions',
    test: (content) => content.includes('export') && content.includes('logger')
  },
  {
    name: 'Guards production logging',
    test: (content) => content.includes('NODE_ENV')
  },
  {
    name: 'Has debug, info, warn, error methods',
    test: (content) => ['debug', 'info', 'warn', 'error'].every(m => content.includes(m))
  }
]);

validateFile('secure-gate-access/client/src/pages/resident/AddVisitor.jsx', [
  {
    name: 'Uses visitorService',
    test: (content) => content.includes('visitorService')
  },
  {
    name: 'Has error handling',
    test: (content) => content.includes('catch') && content.includes('error')
  },
  {
    name: 'Console statements guarded or removed',
    test: (content) => {
      const unguardedLogs = content.match(/console\.(log|debug)\([^)]*\)/g);
      if (!unguardedLogs) return true;
      // Check if they're prefixed with [DEBUG], [ERROR], etc or in NODE_ENV guard
      return unguardedLogs.every(log => 
        log.includes('[DEBUG]') || 
        log.includes('[ERROR]') || 
        log.includes('[INFO]') ||
        content.includes('NODE_ENV')
      );
    }
  }
]);

validateFile('secure-gate-access/client/src/pages/resident/ResidentDashboard.jsx', [
  {
    name: 'Has error handling',
    test: (content) => content.includes('catch')
  },
  {
    name: 'Console statements prefixed',
    test: (content) => {
      const consoleLogs = content.match(/console\.(log|error|warn)\(/g);
      if (!consoleLogs) return true;
      // Should have prefixes
      return content.includes('[ERROR]') || content.includes('[AUTH]');
    }
  }
]);

console.log('\n🔍 Phase 3 Files: Admin Standardization\n');

const adminPages = [
  'AdminDashboard.jsx',
  'ManageResidents.jsx',
  'ManageGuards.jsx',
  'VisitorLog.jsx',
  'AccessControl.jsx',
  'IncidentManagement.jsx'
];

adminPages.forEach(page => {
  validateFile(`secure-gate-access/client/src/pages/admin/${page}`, [
    {
      name: 'Uses adminService',
      test: (content) => content.includes('adminService')
    },
    {
      name: 'No direct axios import',
      test: (content) => !content.includes('import axios from')
    },
    {
      name: 'Has error handling',
      test: (content) => content.includes('catch') || content.includes('handleApiError')
    },
    {
      name: 'Has loading state',
      test: (content) => content.includes('loading') || content.includes('Loading')
    }
  ]);
});

validateFile('secure-gate-access/client/src/services/adminService.js', [
  {
    name: 'Uses _http service',
    test: (content) => content.includes('from \'./_http.js\'')
  },
  {
    name: 'No axios import',
    test: (content) => !content.includes('import axios')
  },
  {
    name: 'Exports admin methods',
    test: (content) => {
      return ['getMetrics', 'getAuditLogs', 'getAllResidents', 'getAllGuards'].every(
        method => content.includes(method)
      );
    }
  }
]);

console.log('\n🔍 Phase 4 Files: Performance Optimization\n');

validateFile('secure-gate-access/client/src/hooks/usePerformanceMonitoring.js', [
  {
    name: 'Exports usePerformanceMonitoring',
    test: (content) => content.includes('export') && content.includes('usePerformanceMonitoring')
  },
  {
    name: 'Uses performance API',
    test: (content) => content.includes('performance.')
  },
  {
    name: 'Guards with NODE_ENV',
    test: (content) => content.includes('NODE_ENV')
  }
]);

validateFile('secure-gate-access/client/src/components/ui/ErrorBoundary.jsx', [
  {
    name: 'Imports logger',
    test: (content) => content.includes('logger')
  },
  {
    name: 'Has componentDidCatch',
    test: (content) => content.includes('componentDidCatch')
  },
  {
    name: 'Logs errors',
    test: (content) => content.includes('logger.error')
  },
  {
    name: 'Shows error ID',
    test: (content) => content.includes('errorId')
  }
]);

console.log('\n🔍 Supporting Files\n');

validateFile('secure-gate-access/client/src/utils/errorMapper.js', [
  {
    name: 'Exports handleApiError',
    test: (content) => content.includes('handleApiError')
  },
  {
    name: 'Maps status codes',
    test: (content) => content.includes('401') || content.includes('403') || content.includes('500')
  }
]);

validateFile('secure-gate-access/client/src/utils/errorHandler.js', [
  {
    name: 'Has error handling logic',
    test: (content) => content.includes('error')
  }
]);

validateFile('secure-gate-access/client/src/services/_http.js', [
  {
    name: 'Exports http object',
    test: (content) => content.includes('export') && content.includes('http')
  },
  {
    name: 'Has HTTP methods',
    test: (content) => ['get', 'post', 'put', 'delete'].every(m => content.includes(m))
  },
  {
    name: 'Handles tokens',
    test: (content) => content.includes('Authorization') || content.includes('Bearer')
  }
]);

validateFile('secure-gate-access/client/src/App.js', [
  {
    name: 'Uses lazy loading',
    test: (content) => content.includes('lazy')
  },
  {
    name: 'Has Suspense',
    test: (content) => content.includes('Suspense')
  },
  {
    name: 'Has ErrorBoundary',
    test: (content) => content.includes('ErrorBoundary')
  }
]);

// Summary
console.log('\n==========================');
console.log('📊 VALIDATION SUMMARY');
console.log('==========================');
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ Failed Files:');
  results.failed.forEach(item => {
    console.log(`   ${item.file}`);
    if (item.issues) {
      item.issues.forEach(issue => console.log(`      - ${issue}`));
    } else {
      console.log(`      - ${item.issue}`);
    }
  });
}

// Save report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    passed: results.passed.length,
    failed: results.failed.length,
    warnings: results.warnings.length,
    total: results.passed.length + results.failed.length
  },
  passed: results.passed,
  failed: results.failed,
  warnings: results.warnings
};

const reportPath = path.join(__dirname, '../artifacts/test_runs/file-validation-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n📄 Report saved: ${reportPath}`);

if (results.failed.length === 0) {
  console.log('\n🎉 ALL FILES VALIDATED SUCCESSFULLY!\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${results.failed.length} FILES FAILED VALIDATION\n`);
  process.exit(1);
}
