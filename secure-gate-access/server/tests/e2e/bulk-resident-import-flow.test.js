/**
 * E2E Test: Bulk Resident Import (CSV Upload)
 * 
 * This test covers the complete bulk resident import workflow
 * from CSV file upload to successful import and validation.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Bulk Resident Import Flow', () => {
  let adminPage;
  let csvFilePath;

  test.beforeEach(async ({ browser }) => {
    adminPage = await browser.newPage();
    
    // Create test CSV file
    csvFilePath = await createTestCSVFile();
  });

  test.afterEach(async () => {
    if (adminPage) await adminPage.close();
    
    // Clean up test CSV file
    if (csvFilePath) {
      const fs = require('fs');
      try {
        fs.unlinkSync(csvFilePath);
      } catch (error) {
        // File may not exist, ignore error
      }
    }
  });

  test('Complete bulk resident import workflow', async () => {
    // Step 1: Admin logs in and navigates to bulk import
    await test.step('Admin navigates to bulk import', async () => {
      await adminPage.goto('/login');
      
      // Login as admin
      await adminPage.fill('[data-testid="email-input"]', 'admin@test.com');
      await adminPage.fill('[data-testid="password-input"]', 'AdminPass123!');
      await adminPage.click('[data-testid="login-button"]');
      
      // Wait for admin dashboard
      await expect(adminPage.locator('[data-testid="admin-dashboard"]')).toBeVisible();
      
      // Navigate to residents management
      await adminPage.click('[data-testid="residents-menu"]');
      await expect(adminPage.locator('[data-testid="residents-page"]')).toBeVisible();
      
      // Click bulk import button
      await adminPage.click('[data-testid="bulk-import-button"]');
      await expect(adminPage.locator('[data-testid="bulk-import-modal"]')).toBeVisible();
    });

    // Step 2: Admin uploads CSV file
    await test.step('Admin uploads CSV file', async () => {
      // Upload CSV file
      const fileInput = adminPage.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles(csvFilePath);
      
      // Verify file is selected
      await expect(adminPage.locator('[data-testid="file-selected-indicator"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="file-name"]')).toContainText('residents.csv');
      
      // Click upload button
      await adminPage.click('[data-testid="upload-csv-button"]');
    });

    // Step 3: System validates CSV data
    await test.step('System validates CSV data', async () => {
      // Wait for validation to complete
      await expect(adminPage.locator('[data-testid="validation-progress"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="validation-complete"]')).toBeVisible({ timeout: 10000 });
      
      // Verify validation results
      await expect(adminPage.locator('[data-testid="validation-summary"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="valid-records-count"]')).toContainText('5');
      await expect(adminPage.locator('[data-testid="invalid-records-count"]')).toContainText('0');
      
      // Verify preview of data to be imported
      await expect(adminPage.locator('[data-testid="import-preview"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="preview-table"]')).toBeVisible();
    });

    // Step 4: Admin reviews and confirms import
    await test.step('Admin confirms import', async () => {
      // Review import details
      await expect(adminPage.locator('[data-testid="import-details"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="total-records"]')).toContainText('5');
      await expect(adminPage.locator('[data-testid="import-type"]')).toContainText('Residents');
      
      // Click confirm import button
      await adminPage.click('[data-testid="confirm-import-button"]');
      
      // Wait for import to complete
      await expect(adminPage.locator('[data-testid="import-progress"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="import-complete"]')).toBeVisible({ timeout: 15000 });
    });

    // Step 5: Verify import results
    await test.step('Verify import results', async () => {
      // Check success message
      await expect(adminPage.locator('[data-testid="import-success-message"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="import-success-message"]')).toContainText('5 residents imported successfully');
      
      // Check import summary
      await expect(adminPage.locator('[data-testid="import-summary"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="successful-imports"]')).toContainText('5');
      await expect(adminPage.locator('[data-testid="failed-imports"]')).toContainText('0');
      
      // Check for any warnings
      await expect(adminPage.locator('[data-testid="import-warnings"]')).toBeVisible();
    });

    // Step 6: Verify residents were created
    await test.step('Verify residents were created', async () => {
      // Close import modal
      await adminPage.click('[data-testid="close-import-modal"]');
      
      // Verify residents appear in the list
      await expect(adminPage.locator('[data-testid="residents-list"]')).toBeVisible();
      
      // Check for imported residents
      const importedResidents = [
        'John Doe',
        'Jane Smith',
        'Bob Johnson',
        'Alice Brown',
        'Charlie Wilson'
      ];
      
      for (const residentName of importedResidents) {
        await expect(adminPage.locator(`[data-testid="resident-${residentName.toLowerCase().replace(' ', '-')}"]`)).toBeVisible();
      }
    });

    // Step 7: Verify audit trail
    await test.step('Verify audit trail', async () => {
      // Navigate to audit logs
      await adminPage.click('[data-testid="audit-logs-menu"]');
      await expect(adminPage.locator('[data-testid="audit-logs-page"]')).toBeVisible();
      
      // Check for bulk import audit entry
      await expect(adminPage.locator('[data-testid="audit-entry-bulk-import"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="audit-entry-bulk-import"]')).toContainText('Bulk import completed');
      await expect(adminPage.locator('[data-testid="audit-entry-bulk-import"]')).toContainText('5 records');
    });
  });

  test('Bulk import error handling', async () => {
    await test.step('Handle invalid file format', async () => {
      await adminPage.goto('/login');
      await adminPage.fill('[data-testid="email-input"]', 'admin@test.com');
      await adminPage.fill('[data-testid="password-input"]', 'AdminPass123!');
      await adminPage.click('[data-testid="login-button"]');
      
      await adminPage.goto('/residents');
      await adminPage.click('[data-testid="bulk-import-button"]');
      
      // Upload invalid file (not CSV)
      const invalidFile = await createInvalidFile();
      const fileInput = adminPage.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles(invalidFile);
      
      await adminPage.click('[data-testid="upload-csv-button"]');
      
      // Verify error message
      await expect(adminPage.locator('[data-testid="file-format-error"]')).toContainText('Invalid file format');
    });

    await test.step('Handle CSV validation errors', async () => {
      // Create CSV with validation errors
      const invalidCSV = await createInvalidCSVFile();
      
      await adminPage.goto('/residents');
      await adminPage.click('[data-testid="bulk-import-button"]');
      
      const fileInput = adminPage.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles(invalidCSV);
      await adminPage.click('[data-testid="upload-csv-button"]');
      
      // Wait for validation
      await expect(adminPage.locator('[data-testid="validation-complete"]')).toBeVisible();
      
      // Verify validation errors
      await expect(adminPage.locator('[data-testid="validation-errors"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="invalid-records-count"]')).toContainText('2');
      
      // Check specific error messages
      await expect(adminPage.locator('[data-testid="error-invalid-email"]')).toContainText('Invalid email format');
      await expect(adminPage.locator('[data-testid="error-missing-name"]')).toContainText('Name is required');
    });

    await test.step('Handle duplicate records', async () => {
      // Create CSV with duplicate records
      const duplicateCSV = await createDuplicateCSVFile();
      
      await adminPage.goto('/residents');
      await adminPage.click('[data-testid="bulk-import-button"]');
      
      const fileInput = adminPage.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles(duplicateCSV);
      await adminPage.click('[data-testid="upload-csv-button"]');
      
      // Wait for validation
      await expect(adminPage.locator('[data-testid="validation-complete"]')).toBeVisible();
      
      // Verify duplicate warnings
      await expect(adminPage.locator('[data-testid="duplicate-warnings"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="duplicate-count"]')).toContainText('2');
    });
  });

  test('Bulk import security and permissions', async () => {
    await test.step('Test non-admin access denied', async () => {
      // Login as non-admin user
      await adminPage.goto('/login');
      await adminPage.fill('[data-testid="email-input"]', 'resident@test.com');
      await adminPage.fill('[data-testid="password-input"]', 'ResidentPass123!');
      await adminPage.click('[data-testid="login-button"]');
      
      // Try to access bulk import
      await adminPage.goto('/residents/bulk-import');
      
      // Verify access denied
      await expect(adminPage.locator('[data-testid="access-denied"]')).toBeVisible();
    });

    await test.step('Test file size limits', async () => {
      await adminPage.goto('/login');
      await adminPage.fill('[data-testid="email-input"]', 'admin@test.com');
      await adminPage.fill('[data-testid="password-input"]', 'AdminPass123!');
      await adminPage.click('[data-testid="login-button"]');
      
      await adminPage.goto('/residents');
      await adminPage.click('[data-testid="bulk-import-button"]');
      
      // Create large CSV file
      const largeCSV = await createLargeCSVFile();
      const fileInput = adminPage.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles(largeCSV);
      
      await adminPage.click('[data-testid="upload-csv-button"]');
      
      // Verify file size error
      await expect(adminPage.locator('[data-testid="file-size-error"]')).toContainText('File too large');
    });
  });

  test('Bulk import performance', async () => {
    await test.step('Test large file import performance', async () => {
      await adminPage.goto('/login');
      await adminPage.fill('[data-testid="email-input"]', 'admin@test.com');
      await adminPage.fill('[data-testid="password-input"]', 'AdminPass123!');
      await adminPage.click('[data-testid="login-button"]');
      
      await adminPage.goto('/residents');
      await adminPage.click('[data-testid="bulk-import-button"]');
      
      // Create medium-sized CSV file
      const mediumCSV = await createMediumCSVFile();
      const fileInput = adminPage.locator('[data-testid="csv-file-input"]');
      await fileInput.setInputFiles(mediumCSV);
      
      const startTime = Date.now();
      await adminPage.click('[data-testid="upload-csv-button"]');
      
      // Wait for import to complete
      await expect(adminPage.locator('[data-testid="import-complete"]')).toBeVisible();
      const endTime = Date.now();
      
      // Verify import completed within reasonable time
      const importTime = endTime - startTime;
      expect(importTime).toBeLessThan(30000); // 30 seconds
    });
  });
});

// Helper functions
async function createTestCSVFile() {
  const fs = require('fs');
  const path = require('path');
  
  const csvContent = `name,email,phone,unit,role
John Doe,john.doe@test.com,+254712345001,A101,resident
Jane Smith,jane.smith@test.com,+254712345002,A102,resident
Bob Johnson,bob.johnson@test.com,+254712345003,B101,resident
Alice Brown,alice.brown@test.com,+254712345004,B102,resident
Charlie Wilson,charlie.wilson@test.com,+254712345005,C101,resident`;
  
  const filePath = path.join(__dirname, 'test-residents.csv');
  fs.writeFileSync(filePath, csvContent);
  return filePath;
}

async function createInvalidFile() {
  const fs = require('fs');
  const path = require('path');
  
  const content = 'This is not a CSV file';
  const filePath = path.join(__dirname, 'test-invalid.txt');
  fs.writeFileSync(filePath, content);
  return filePath;
}

async function createInvalidCSVFile() {
  const fs = require('fs');
  const path = require('path');
  
  const csvContent = `name,email,phone,unit,role
,invalid-email,+254712345001,A101,resident
Jane Smith,,+254712345002,A102,resident
Bob Johnson,bob.johnson@test.com,invalid-phone,B101,resident`;
  
  const filePath = path.join(__dirname, 'test-invalid-residents.csv');
  fs.writeFileSync(filePath, csvContent);
  return filePath;
}

async function createDuplicateCSVFile() {
  const fs = require('fs');
  const path = require('path');
  
  const csvContent = `name,email,phone,unit,role
John Doe,john.doe@test.com,+254712345001,A101,resident
Jane Smith,jane.smith@test.com,+254712345002,A102,resident
John Doe,john.doe@test.com,+254712345001,A101,resident
Jane Smith,jane.smith@test.com,+254712345002,A102,resident`;
  
  const filePath = path.join(__dirname, 'test-duplicate-residents.csv');
  fs.writeFileSync(filePath, csvContent);
  return filePath;
}

async function createLargeCSVFile() {
  const fs = require('fs');
  const path = require('path');
  
  let csvContent = 'name,email,phone,unit,role\n';
  
  // Create 1000 records
  for (let i = 0; i < 1000; i++) {
    csvContent += `User ${i},user${i}@test.com,+254712345${i.toString().padStart(3, '0')},A${i % 100},resident\n`;
  }
  
  const filePath = path.join(__dirname, 'test-large-residents.csv');
  fs.writeFileSync(filePath, csvContent);
  return filePath;
}

async function createMediumCSVFile() {
  const fs = require('fs');
  const path = require('path');
  
  let csvContent = 'name,email,phone,unit,role\n';
  
  // Create 100 records
  for (let i = 0; i < 100; i++) {
    csvContent += `User ${i},user${i}@test.com,+254712345${i.toString().padStart(3, '0')},A${i % 10},resident\n`;
  }
  
  const filePath = path.join(__dirname, 'test-medium-residents.csv');
  fs.writeFileSync(filePath, csvContent);
  return filePath;
}
