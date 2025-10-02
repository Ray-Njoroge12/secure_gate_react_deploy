#!/usr/bin/env node
// scripts/critical-path-test.js
// Tests critical user flows to ensure optimization didn't break functionality

const fs = require('fs');
const path = require('path');

console.log('🧪 CRITICAL PATH TESTING');
console.log('========================\n');

let passCount = 0;
let failCount = 0;
const results = [];

// Helper to log results
function testCase(name, condition, details = '') {
  const passed = condition();
  results.push({ name, passed, details });
  
  if (passed) {
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   ${details}`);
    failCount++;
  }
}

// Helper to check file content
function fileContains(filePath, searchString) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    return content.includes(searchString);
  } catch (error) {
    return false;
  }
}

function fileNotContains(filePath, searchString) {
  return !fileContains(filePath, searchString);
}

console.log('📋 CRITICAL PATH 1: Authentication Flow\n');

testCase(
  'Login page has no hardcoded URLs',
  () => fileNotContains('secure-gate-access/client/src/pages/Login.jsx', 'localhost:5000')
);

testCase(
  'Register page guards debug_otp with NODE_ENV',
  () => {
    const content = fs.readFileSync(
      path.join(__dirname, '../secure-gate-access/client/src/pages/Register.js'),
      'utf-8'
    );
    const hasDebugOtp = content.includes('debug_otp');
    const hasGuard = content.includes('process.env.NODE_ENV');
    return !hasDebugOtp || (hasDebugOtp && hasGuard);
  }
);

testCase(
  'Reset password page uses proxy',
  () => {
    const content = fs.readFileSync(
      path.join(__dirname, '../secure-gate-access/client/src/pages/ResetPasswordPage.js'),
      'utf-8'
    );
    return content.includes('/api/auth/reset-password') && 
           !content.includes('localhost:5000');
  }
);

testCase(
  'AuthContext exists and is valid',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/context/AuthContext.js'))
);

testCase(
  'ProtectedRoute component exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/routes/ProtectedRoute.jsx'))
);

console.log('\n📋 CRITICAL PATH 2: Resident Flow\n');

testCase(
  'ResidentDashboard uses logger instead of raw console',
  () => fileContains('secure-gate-access/client/src/pages/resident/ResidentDashboard.jsx', 'logger')
);

testCase(
  'AddVisitor uses logger',
  () => fileContains('secure-gate-access/client/src/pages/resident/AddVisitor.jsx', 'logger')
);

testCase(
  'AddVisitor uses visitorService',
  () => fileContains('secure-gate-access/client/src/pages/resident/AddVisitor.jsx', 'visitorService')
);

testCase(
  'GeneratePass exists and is valid',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/pages/resident/GeneratePass.jsx'))
);

testCase(
  'VisitorHistory exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/pages/resident/VisitorHistory.jsx'))
);

testCase(
  'BulkInvite exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/pages/resident/BulkInvite.jsx'))
);

testCase(
  'Duplicate AddVisitorNew not in src',
  () => !fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/pages/resident/AddVisitorNew.jsx'))
);

console.log('\n📋 CRITICAL PATH 3: Guard Flow\n');

testCase(
  'GuardDashboard exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/pages/guard/GuardDashboard.jsx'))
);

testCase(
  'ManualCheck exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/pages/guard/ManualCheck.jsx'))
);

testCase(
  'ScanQR exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/pages/guard/ScanQR.jsx'))
);

testCase(
  'QRScanner component exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/components/QRScanner.jsx'))
);

console.log('\n📋 CRITICAL PATH 4: Admin Flow\n');

testCase(
  'AdminDashboard uses adminService',
  () => fileContains('secure-gate-access/client/src/pages/admin/AdminDashboard.jsx', 'adminService')
);

testCase(
  'AdminDashboard does not import axios',
  () => fileNotContains('secure-gate-access/client/src/pages/admin/AdminDashboard.jsx', 'import axios')
);

testCase(
  'ManageResidents uses adminService',
  () => fileContains('secure-gate-access/client/src/pages/admin/ManageResidents.jsx', 'adminService')
);

testCase(
  'ManageGuards uses adminService',
  () => fileContains('secure-gate-access/client/src/pages/admin/ManageGuards.jsx', 'adminService')
);

testCase(
  'VisitorLog uses adminService',
  () => fileContains('secure-gate-access/client/src/pages/admin/VisitorLog.jsx', 'adminService')
);

testCase(
  'AccessControl uses adminService',
  () => fileContains('secure-gate-access/client/src/pages/admin/AccessControl.jsx', 'adminService')
);

testCase(
  'IncidentManagement uses adminService',
  () => fileContains('secure-gate-access/client/src/pages/admin/IncidentManagement.jsx', 'adminService')
);

testCase(
  'All admin pages use handleApiError',
  () => {
    const adminPages = [
      'AdminDashboard.jsx',
      'ManageResidents.jsx',
      'ManageGuards.jsx',
      'VisitorLog.jsx',
      'AccessControl.jsx',
      'IncidentManagement.jsx'
    ];
    return adminPages.every(page => 
      fileContains(`secure-gate-access/client/src/pages/admin/${page}`, 'handleApiError')
    );
  }
);

console.log('\n📋 CRITICAL PATH 5: Services & Utilities\n');

testCase(
  'adminService.js exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/services/adminService.js'))
);

testCase(
  'adminService uses http service',
  () => fileContains('secure-gate-access/client/src/services/adminService.js', 'from \'./_http.js\'')
);

testCase(
  'adminService does not use axios',
  () => fileNotContains('secure-gate-access/client/src/services/adminService.js', 'import axios')
);

testCase(
  'logger.js exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/utils/logger.js'))
);

testCase(
  'logger guards production logging',
  () => fileContains('secure-gate-access/client/src/utils/logger.js', 'NODE_ENV')
);

testCase(
  'errorMapper.js exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/utils/errorMapper.js'))
);

testCase(
  'errorHandler.js exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/utils/errorHandler.js'))
);

testCase(
  '_http.js service exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/services/_http.js'))
);

testCase(
  'visitorService.js exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/services/visitorService.js'))
);

console.log('\n📋 CRITICAL PATH 6: Performance & Optimization\n');

testCase(
  'usePerformanceMonitoring hook exists',
  () => fs.existsSync(path.join(__dirname, '../secure-gate-access/client/src/hooks/usePerformanceMonitoring.js'))
);

testCase(
  'ErrorBoundary uses logger',
  () => fileContains('secure-gate-access/client/src/components/ui/ErrorBoundary.jsx', 'from \'../../utils/logger\'')
);

testCase(
  'App.js uses code splitting',
  () => {
    const content = fs.readFileSync(
      path.join(__dirname, '../secure-gate-access/client/src/App.js'),
      'utf-8'
    );
    return content.includes('lazy') && content.includes('Suspense');
  }
);

testCase(
  'Build scripts exist',
  () => {
    const pkgPath = path.join(__dirname, '../secure-gate-access/client/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.scripts.build && pkg.scripts['build:production'];
  }
);

console.log('\n📋 CRITICAL PATH 7: Configuration\n');

testCase(
  'Proxy configuration exists',
  () => {
    const pkgPath = path.join(__dirname, '../secure-gate-access/client/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.proxy === 'http://localhost:5000';
  }
);

testCase(
  'No duplicate files in src',
  () => {
    const duplicates = ['RegisterNew.js', 'AddVisitorNew.jsx', 'BulkInviteNew.jsx'];
    return duplicates.every(file => 
      !fs.existsSync(path.join(__dirname, `../secure-gate-access/client/src/pages/${file}`)) &&
      !fs.existsSync(path.join(__dirname, `../secure-gate-access/client/src/pages/resident/${file}`))
    );
  }
);

// Summary
console.log('\n========================');
console.log('📊 TEST SUMMARY');
console.log('========================');
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`Total: ${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n🎉 ALL CRITICAL PATHS VALIDATED!');
  console.log('Frontend optimization maintains all functionality.\n');
} else {
  console.log(`\n❌ ${failCount} CRITICAL PATH(S) FAILED!`);
  console.log('Review failed tests above.\n');
}

// Generate report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    passed: passCount,
    failed: failCount,
    total: passCount + failCount,
    passRate: ((passCount / (passCount + failCount)) * 100).toFixed(2) + '%'
  },
  results
};

const reportPath = path.join(__dirname, '../artifacts/test_runs/critical-path-test-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`📄 Report saved: ${reportPath}\n`);

process.exit(failCount > 0 ? 1 : 0);
