# E2E Testing Guide
## Secure Gate Access Control System

**Version:** 1.0.0  
**Last Updated:** January 1, 2025

---

## Overview

This guide provides comprehensive documentation for the End-to-End (E2E) testing suite of the Secure Gate Access Control System. The E2E tests use Playwright to simulate real user interactions across the complete application stack.

## Test Framework

- **Framework:** Playwright
- **Browsers:** Chromium, Firefox, WebKit
- **Mobile Testing:** Mobile Chrome, Mobile Safari
- **Configuration:** `playwright.config.js`

## Critical Test Flows

### 1. Admin → Resident → Visitor → Guard Flow
**File:** `admin-resident-visitor-flow.test.js`

**Description:** Complete workflow from admin creating a resident to the resident inviting a visitor and the guard approving the visit.

**Test Steps:**
1. Admin logs in and creates a resident
2. Resident logs in and invites a visitor
3. Visitor receives OTP and verifies
4. Guard logs in and approves the visitor
5. Verify complete workflow and audit trail

**Key Features Tested:**
- User role management
- Visitor invitation system
- OTP verification
- Guard approval process
- Audit trail generation

### 2. Visitor OTP Gate Entry Flow
**File:** `visitor-otp-gate-flow.test.js`

**Description:** Visitor journey from pre-registration using invite code to receiving OTP and successfully entering the gate.

**Test Steps:**
1. Visitor pre-registers using invite code
2. Visitor receives and enters OTP
3. Visitor arrives at gate and scans QR code
4. Guard verifies visitor at gate
5. Guard allows visitor entry
6. Visitor checks in successfully

**Key Features Tested:**
- Invite code validation
- OTP generation and verification
- QR code generation and scanning
- Gate verification process
- Check-in/check-out system

### 3. Password Reset Flow
**File:** `password-reset-flow.test.js`

**Description:** Complete password reset workflow from requesting reset to successfully logging in with new password.

**Test Steps:**
1. User requests password reset
2. User receives reset email and clicks link
3. User enters new password
4. User logs in with new password
5. Verify old password no longer works
6. Verify security measures

**Key Features Tested:**
- Password reset request
- Email verification
- Token validation
- Password strength requirements
- Security measures (token expiration, single use)

### 4. Bulk Resident Import Flow
**File:** `bulk-resident-import-flow.test.js`

**Description:** Bulk import workflow from CSV file upload to successful import and validation.

**Test Steps:**
1. Admin logs in and navigates to bulk import
2. Admin uploads CSV file
3. System validates CSV data
4. Admin reviews and confirms import
5. Verify import results
6. Verify residents were created
7. Verify audit trail

**Key Features Tested:**
- CSV file upload
- Data validation
- Bulk import process
- Error handling
- Audit trail generation

### 5. Incident Reporting Flow
**File:** `incident-reporting-flow.test.js`

**Description:** Complete incident reporting workflow from incident creation to resolution and follow-up.

**Test Steps:**
1. Guard reports an incident
2. Guard fills incident details
3. Verify incident was created
4. Admin reviews incident
5. Admin assigns incident
6. Security team investigates
7. Security team resolves incident
8. Admin reviews resolution
9. Verify complete audit trail

**Key Features Tested:**
- Incident creation
- Assignment workflow
- Investigation process
- Resolution management
- Audit trail generation

## Test Configuration

### Playwright Configuration
```javascript
// playwright.config.js
module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }]
  ],
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    backendURL: process.env.BACKEND_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } }
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../client',
      port: 3000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'npm run dev',
      cwd: '.',
      port: 3001,
      reuseExistingServer: !process.env.CI
    }
  ]
});
```

## Running E2E Tests

### Prerequisites
1. **Install Dependencies:**
   ```bash
   npm install
   npx playwright install
   ```

2. **Start Services:**
   ```bash
   # Backend (Terminal 1)
   cd secure-gate-access/server
   npm run dev
   
   # Frontend (Terminal 2)
   cd secure-gate-access/client
   npm start
   ```

### Test Commands

#### Run All E2E Tests
```bash
npm run test:e2e
```

#### Run Tests with Browser UI
```bash
npm run test:e2e:ui
```

#### Run Tests in Headed Mode
```bash
npm run test:e2e:headed
```

#### Debug Tests
```bash
npm run test:e2e:debug
```

#### View Test Report
```bash
npm run test:e2e:report
```

### Running Specific Tests

#### Run Single Test File
```bash
npx playwright test admin-resident-visitor-flow.test.js
```

#### Run Tests by Tag
```bash
npx playwright test --grep "Admin.*Resident.*Visitor"
```

#### Run Tests in Specific Browser
```bash
npx playwright test --project=chromium
```

## Test Data Management

### Test Users
The E2E tests use the following test users:

- **Admin User:**
  - Email: `admin@test.com`
  - Password: `AdminPass123!`
  - Role: `admin`

- **Resident User:**
  - Email: `resident@test.com`
  - Password: `ResidentPass123!`
  - Role: `resident`

- **Guard User:**
  - Email: `guard@test.com`
  - Password: `GuardPass123!`
  - Role: `guard`

### Test Data Cleanup
- Test data is automatically cleaned up after each test
- Global setup creates necessary test users
- Global teardown removes test data

## Test Environment Setup

### Global Setup (`global-setup.js`)
- Starts backend and frontend servers
- Creates test users and data
- Waits for services to be ready

### Global Teardown (`global-teardown.js`)
- Cleans up test data
- Stops services (handled by Playwright)

## Test Selectors

### Data Test IDs
All interactive elements use `data-testid` attributes for reliable testing:

```html
<!-- Login Form -->
<input data-testid="email-input" type="email" />
<input data-testid="password-input" type="password" />
<button data-testid="login-button">Login</button>

<!-- Dashboard -->
<div data-testid="admin-dashboard">Admin Dashboard</div>
<div data-testid="resident-dashboard">Resident Dashboard</div>
<div data-testid="guard-dashboard">Guard Dashboard</div>

<!-- Navigation -->
<button data-testid="residents-menu">Residents</button>
<button data-testid="visitors-menu">Visitors</button>
<button data-testid="incidents-menu">Incidents</button>
```

## Error Handling Tests

### Validation Errors
- Form validation for required fields
- Email format validation
- Password strength requirements
- File upload validation

### Permission Errors
- Role-based access control
- Unauthorized access attempts
- Admin-only functionality

### Network Errors
- Service unavailability
- Timeout handling
- Retry mechanisms

## Performance Testing

### Load Testing
- Multiple concurrent users
- Large data sets
- File upload performance

### Response Time Testing
- Page load times
- API response times
- Database query performance

## Mobile Testing

### Responsive Design
- Mobile viewport testing
- Touch interactions
- Mobile-specific features

### Cross-Platform Testing
- iOS Safari
- Android Chrome
- Different screen sizes

## Continuous Integration

### CI Configuration
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Reports

### HTML Report
- Interactive test results
- Screenshots and videos
- Test timeline
- Error details

### JSON Report
- Machine-readable results
- CI/CD integration
- Custom reporting

### JUnit Report
- Standard XML format
- CI/CD compatibility
- Test result aggregation

## Troubleshooting

### Common Issues

#### Tests Failing Due to Timeouts
```bash
# Increase timeout in playwright.config.js
use: {
  actionTimeout: 30000,
  navigationTimeout: 60000
}
```

#### Browser Not Found
```bash
# Reinstall browsers
npx playwright install
```

#### Services Not Starting
```bash
# Check if ports are available
lsof -i :3000
lsof -i :3001
```

#### Database Connection Issues
```bash
# Ensure database is running
# Check connection string in .env
```

### Debug Mode
```bash
# Run tests in debug mode
npx playwright test --debug

# Run specific test in debug mode
npx playwright test admin-resident-visitor-flow.test.js --debug
```

## Best Practices

### Test Design
1. **Independent Tests:** Each test should be independent
2. **Clear Test Names:** Use descriptive test names
3. **Single Responsibility:** One test per scenario
4. **Data Cleanup:** Always clean up test data

### Selectors
1. **Use Data Test IDs:** Prefer `data-testid` over CSS selectors
2. **Stable Selectors:** Avoid selectors that change frequently
3. **Semantic Selectors:** Use meaningful test IDs

### Error Handling
1. **Expect Errors:** Test both success and failure scenarios
2. **Clear Error Messages:** Provide meaningful error messages
3. **Retry Logic:** Implement retry for flaky tests

### Performance
1. **Parallel Execution:** Run tests in parallel when possible
2. **Resource Management:** Clean up resources after tests
3. **Timeout Configuration:** Set appropriate timeouts

## Maintenance

### Regular Updates
- Update Playwright version
- Update test dependencies
- Review and update test selectors
- Update test data as needed

### Test Review
- Review test coverage
- Identify flaky tests
- Optimize test performance
- Update documentation

## Support

For issues with E2E tests:
1. Check the troubleshooting section
2. Review test logs and reports
3. Check browser console for errors
4. Verify service availability

---

**This E2E testing guide ensures comprehensive testing of all critical user flows in the Secure Gate Access Control System.**
