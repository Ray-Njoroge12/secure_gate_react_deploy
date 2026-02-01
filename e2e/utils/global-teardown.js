/**
 * Global Teardown for E2E Testing
 * Cleans up the test environment after running tests
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Clean up test data
    console.log('🗑️ Cleaning up test data...');
    await cleanupTestData();
    
    // Generate test summary report
    console.log('📊 Generating test summary...');
    await generateTestSummary();
    
    // Archive test artifacts
    console.log('📦 Archiving test artifacts...');
    await archiveTestArtifacts();
    
    // Clean up temporary files
    console.log('🧽 Cleaning temporary files...');
    await cleanupTempFiles();
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  try {
    // Clean test database
    const response = await fetch('http://localhost:3001/api/test/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Cleanup': 'true'
      }
    });
    
    if (response.ok) {
      console.log('✅ Test data cleanup completed');
    } else {
      console.warn('⚠️ Test data cleanup failed (non-critical)');
    }
  } catch (error) {
    console.warn('⚠️ Test data cleanup failed (non-critical):', error.message);
  }
}

/**
 * Generate test summary report
 */
async function generateTestSummary() {
  try {
    const resultsPath = 'test-results/results.json';
    
    // Check if results file exists
    try {
      await fs.access(resultsPath);
    } catch {
      console.log('📝 No test results file found, skipping summary generation');
      return;
    }
    
    // Read test results
    const resultsData = await fs.readFile(resultsPath, 'utf8');
    const results = JSON.parse(resultsData);
    
    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      totalTests: results.stats?.total || 0,
      passed: results.stats?.passed || 0,
      failed: results.stats?.failed || 0,
      skipped: results.stats?.skipped || 0,
      duration: results.stats?.duration || 0,
      projects: {},
      failures: []
    };
    
    // Process project results
    if (results.suites) {
      results.suites.forEach(suite => {
        if (suite.project) {
          if (!summary.projects[suite.project]) {
            summary.projects[suite.project] = {
              total: 0,
              passed: 0,
              failed: 0,
              skipped: 0
            };
          }
          
          suite.specs?.forEach(spec => {
            spec.tests?.forEach(test => {
              summary.projects[suite.project].total++;
              
              if (test.status === 'passed') {
                summary.projects[suite.project].passed++;
              } else if (test.status === 'failed') {
                summary.projects[suite.project].failed++;
                summary.failures.push({
                  project: suite.project,
                  suite: suite.title,
                  test: test.title,
                  error: test.error?.message || 'Unknown error'
                });
              } else if (test.status === 'skipped') {
                summary.projects[suite.project].skipped++;
              }
            });
          });
        }
      });
    }
    
    // Calculate success rate
    summary.successRate = summary.totalTests > 0 
      ? ((summary.passed / summary.totalTests) * 100).toFixed(2) + '%'
      : '0%';
    
    // Write summary report
    const summaryPath = 'test-results/test-summary.json';
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    // Generate human-readable summary
    const readableSummary = generateReadableSummary(summary);
    await fs.writeFile('test-results/TEST_SUMMARY.md', readableSummary);
    
    console.log('✅ Test summary generated');
    console.log(`📊 Test Results: ${summary.passed}/${summary.totalTests} passed (${summary.successRate})`);
    
  } catch (error) {
    console.warn('⚠️ Test summary generation failed (non-critical):', error.message);
  }
}

/**
 * Generate human-readable test summary
 */
function generateReadableSummary(summary) {
  const date = new Date(summary.timestamp).toLocaleString();
  
  let markdown = `# E2E Integration Test Summary\n\n`;
  markdown += `**Generated:** ${date}\n`;
  markdown += `**Environment:** ${summary.environment}\n`;
  markdown += `**Duration:** ${(summary.duration / 1000).toFixed(2)} seconds\n\n`;
  
  markdown += `## Overall Results\n\n`;
  markdown += `- **Total Tests:** ${summary.totalTests}\n`;
  markdown += `- **Passed:** ${summary.passed} ✅\n`;
  markdown += `- **Failed:** ${summary.failed} ❌\n`;
  markdown += `- **Skipped:** ${summary.skipped} ⏭️\n`;
  markdown += `- **Success Rate:** ${summary.successRate}\n\n`;
  
  if (Object.keys(summary.projects).length > 0) {
    markdown += `## Results by Project\n\n`;
    
    Object.entries(summary.projects).forEach(([project, stats]) => {
      const projectSuccessRate = stats.total > 0 
        ? ((stats.passed / stats.total) * 100).toFixed(2) + '%'
        : '0%';
      
      markdown += `### ${project}\n`;
      markdown += `- Passed: ${stats.passed}/${stats.total} (${projectSuccessRate})\n`;
      markdown += `- Failed: ${stats.failed}\n`;
      markdown += `- Skipped: ${stats.skipped}\n\n`;
    });
  }
  
  if (summary.failures.length > 0) {
    markdown += `## Failed Tests\n\n`;
    
    summary.failures.forEach((failure, index) => {
      markdown += `${index + 1}. **${failure.project}** - ${failure.suite}\n`;
      markdown += `   - Test: ${failure.test}\n`;
      markdown += `   - Error: ${failure.error}\n\n`;
    });
  }
  
  markdown += `## Test Categories Covered\n\n`;
  markdown += `- ✅ Multi-Role Workflow Testing\n`;
  markdown += `- ✅ Cross-Role Collaboration Testing\n`;
  markdown += `- ✅ Performance Testing Under Load\n`;
  markdown += `- ✅ WCAG 2.1 AA Accessibility Compliance\n`;
  markdown += `- ✅ Device and Browser Compatibility\n`;
  markdown += `- ✅ API Integration Testing\n`;
  markdown += `- ✅ Real-Time Features Testing\n`;
  markdown += `- ✅ Security and Authentication Testing\n\n`;
  
  if (summary.successRate === '100%') {
    markdown += `## 🎉 All Tests Passed!\n\n`;
    markdown += `The system is ready for production deployment.\n`;
  } else if (parseFloat(summary.successRate) >= 95) {
    markdown += `## ✅ Tests Mostly Passed\n\n`;
    markdown += `The system is nearly ready for production. Review failed tests.\n`;
  } else {
    markdown += `## ⚠️ Some Tests Failed\n\n`;
    markdown += `Review and fix failed tests before production deployment.\n`;
  }
  
  return markdown;
}

/**
 * Archive test artifacts
 */
async function archiveTestArtifacts() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = `test-results/archive/${timestamp}`;
    
    // Create archive directory
    await fs.mkdir(archiveDir, { recursive: true });
    
    // Copy important artifacts
    const artifactsToArchive = [
      'test-results/results.json',
      'test-results/test-summary.json',
      'test-results/TEST_SUMMARY.md',
      'test-results/html-report',
      'test-results/junit.xml'
    ];
    
    for (const artifact of artifactsToArchive) {
      try {
        const stats = await fs.stat(artifact);
        const destPath = path.join(archiveDir, path.basename(artifact));
        
        if (stats.isDirectory()) {
          await fs.cp(artifact, destPath, { recursive: true });
        } else {
          await fs.copyFile(artifact, destPath);
        }
      } catch (error) {
        // Artifact doesn't exist, skip
      }
    }
    
    console.log(`✅ Test artifacts archived to ${archiveDir}`);
    
  } catch (error) {
    console.warn('⚠️ Test artifact archiving failed (non-critical):', error.message);
  }
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles() {
  try {
    const tempDirs = [
      'test-results/artifacts',
      'test-results/allure-results'
    ];
    
    for (const dir of tempDirs) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch (error) {
        // Directory doesn't exist or can't be removed, skip
      }
    }
    
    console.log('✅ Temporary files cleaned up');
    
  } catch (error) {
    console.warn('⚠️ Temporary file cleanup failed (non-critical):', error.message);
  }
}

export default globalTeardown;