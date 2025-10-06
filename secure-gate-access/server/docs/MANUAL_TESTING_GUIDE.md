# Manual Testing Guide
## Secure Gate Access Control System

**Version:** 1.0.0  
**Last Updated:** January 1, 2025

---

## Overview

This guide provides comprehensive documentation for executing manual testing of the Secure Gate Access Control System. The manual testing suite includes 196 tests across 9 categories to ensure complete system validation.

## Test Categories

| Category | Tests | Priority | Description |
|----------|-------|----------|-------------|
| Browser Compatibility | 32 | HIGH | Cross-browser functionality testing |
| Mobile Responsive | 24 | HIGH | Mobile device compatibility testing |
| Security Validation | 28 | CRITICAL | Security vulnerability testing |
| Performance | 20 | HIGH | System performance validation |
| Accessibility | 24 | MEDIUM | Accessibility compliance testing |
| Error Handling | 20 | HIGH | Error scenario testing |
| State Management | 16 | MEDIUM | Application state testing |
| Data Display | 16 | MEDIUM | Data presentation testing |
| Integration | 16 | HIGH | System integration testing |

## Prerequisites

### Environment Setup
1. **Backend Server:** Running on port 3001
2. **Frontend Server:** Running on port 3000
3. **Database:** PostgreSQL running and accessible
4. **Test Users:** Created and available

### Test Users
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

## Running Manual Tests

### Quick Start
```bash
# Run all manual tests
npm run test:manual

# Run manual tests with detailed output
npm run test:manual:run

# View test report
npm run test:manual:report
```

### Manual Execution Steps

1. **Start Services:**
   ```bash
   # Terminal 1 - Backend
   cd secure-gate-access/server
   npm run dev
   
   # Terminal 2 - Frontend
   cd secure-gate-access/client
   npm start
   ```

2. **Execute Tests:**
   ```bash
   # Terminal 3 - Run tests
   cd secure-gate-access/server
   npm run test:manual
   ```

3. **View Results:**
   ```bash
   # Open HTML report
   npm run test:manual:report
   
   # Or manually open
   open tests/results/manual-test-report.html
   ```

## Test Execution Framework

### Automated Framework
The manual testing framework provides:
- **Automated Test Execution:** Runs all 196 tests automatically
- **Cross-Browser Testing:** Tests on Chrome, Firefox, Safari, Edge
- **Mobile Testing:** Tests on various mobile devices
- **Real-time Reporting:** Live progress updates
- **Comprehensive Reports:** HTML and JSON reports

### Manual Verification
For critical tests, manual verification is recommended:
- **Security Tests:** Verify security measures manually
- **Accessibility Tests:** Test with actual screen readers
- **Performance Tests:** Monitor real-time performance
- **User Experience Tests:** Validate user interactions

## Test Categories Details

### 1. Browser Compatibility Tests (32 tests)

#### Chrome Browser Tests
- Login functionality
- Dashboard rendering
- Navigation menu
- Form submissions
- Data tables
- Modal dialogs
- File uploads
- API calls

#### Firefox Browser Tests
- Login functionality
- Dashboard rendering
- Navigation menu
- Form submissions
- Data tables
- Modal dialogs
- File uploads
- API calls

#### Safari Browser Tests
- Login functionality
- Dashboard rendering
- Navigation menu
- Form submissions
- Data tables
- Modal dialogs
- File uploads
- API calls

#### Edge Browser Tests
- Login functionality
- Dashboard rendering
- Navigation menu
- Form submissions
- Data tables
- Modal dialogs
- File uploads
- API calls

### 2. Mobile Responsive Tests (24 tests)

#### iPhone Tests
- Login form on iPhone 12 (390x844)
- Dashboard on iPhone 12
- Navigation on iPhone 12
- Forms on iPhone 12
- Tables on iPhone 12
- Login form on iPhone SE (375x667)

#### Android Tests
- Login form on Samsung Galaxy S20 (360x800)
- Dashboard on Samsung Galaxy S20
- Navigation on Samsung Galaxy S20
- Forms on Samsung Galaxy S20
- Tables on Samsung Galaxy S20
- Login form on Pixel 5 (393x851)

#### Tablet Tests
- Login form on iPad (768x1024)
- Dashboard on iPad
- Navigation on iPad
- Forms on iPad
- Tables on iPad
- Login form on iPad Pro (1024x1366)

#### Touch Interaction Tests
- Touch navigation
- Touch form inputs
- Touch buttons
- Touch scrolling
- Touch gestures
- Touch accessibility

### 3. Security Validation Tests (28 tests)

#### Authentication Security
- SQL injection prevention
- XSS prevention
- CSRF protection
- Session management
- Password strength validation
- Account lockout mechanism
- Token expiration
- Secure password reset

#### Authorization Security
- Role-based access control
- Admin-only functions
- Guard-only functions
- Resident-only functions
- Unauthorized access prevention
- API endpoint protection
- File upload security
- Data access restrictions

#### Data Security
- Data encryption in transit
- Data encryption at rest
- PII protection
- Audit trail integrity
- Data sanitization
- Input validation
- Output encoding
- Error message security

#### Network Security
- HTTPS enforcement
- Security headers
- CORS configuration
- Rate limiting

### 4. Performance Tests (20 tests)

#### Page Load Performance
- Login page load time (< 3s)
- Dashboard load time (< 2s)
- Residents page load time (< 3s)
- Visitors page load time (< 3s)
- Incidents page load time (< 3s)

#### API Performance
- Health endpoint response time (< 1s)
- Login API response time (< 2s)
- Data fetch API response time (< 2s)
- File upload response time (< 5s)
- Bulk import response time (< 10s)

#### Memory Performance
- Memory usage during normal operation
- Memory usage during file upload
- Memory usage during bulk operations
- Memory leak detection
- Garbage collection efficiency

#### Database Performance
- Database query response time
- Database connection pooling
- Database transaction performance
- Database index efficiency
- Database backup performance

### 5. Accessibility Tests (24 tests)

#### Keyboard Navigation
- Tab navigation through forms
- Tab navigation through menus
- Tab navigation through tables
- Tab navigation through modals
- Tab navigation through buttons
- Tab navigation through links

#### Screen Reader Compatibility
- ARIA labels on form inputs
- ARIA labels on buttons
- ARIA labels on navigation
- ARIA labels on tables
- ARIA labels on modals
- ARIA labels on status messages

#### Visual Accessibility
- Color contrast ratios
- Font size scalability
- Focus indicators
- Error message visibility
- Success message visibility
- Loading indicator visibility

#### Motor Accessibility
- Touch target sizes
- Clickable area sizes
- Drag and drop functionality
- Swipe gestures
- Pinch to zoom
- Voice control compatibility

### 6. Error Handling Tests (20 tests)

#### Form Validation Errors
- Required field validation
- Email format validation
- Phone format validation
- Password strength validation
- File type validation
- File size validation

#### Authentication Errors
- Invalid login credentials
- Expired session handling
- Account lockout handling
- Token expiration handling
- Password reset errors
- Registration errors

#### Network Errors
- Connection timeout handling
- Server error handling
- API error handling
- File upload errors
- Database connection errors
- Service unavailable errors

#### System Errors
- JavaScript errors
- Unexpected errors

### 7. State Management Tests (16 tests)

#### User Session Management
- Login state persistence
- Logout state clearing
- Session timeout handling
- Token refresh handling
- Multi-tab session sync
- Browser refresh state

#### Application State Management
- Form state persistence
- Navigation state persistence
- Filter state persistence
- Sort state persistence
- Pagination state persistence
- Modal state management

#### Data State Management
- Data caching
- Data synchronization
- Data invalidation
- Data persistence

### 8. Data Display Tests (16 tests)

#### Table Display
- Data table rendering
- Table pagination
- Table sorting
- Table filtering
- Table search
- Table export

#### Form Display
- Form field rendering
- Form validation display
- Form error display
- Form success display
- Form loading display
- Form progress display

#### Chart Display
- Chart rendering
- Chart data accuracy
- Chart interactivity
- Chart responsiveness

### 9. Integration Tests (16 tests)

#### Frontend-Backend Integration
- API communication
- Data synchronization
- Error propagation
- Authentication flow
- Authorization flow
- Session management

#### Database Integration
- Data persistence
- Data retrieval
- Data updates
- Data deletion
- Transaction handling
- Data integrity

#### External Service Integration
- Email service integration
- SMS service integration
- File storage integration
- Logging service integration

## Test Results and Reporting

### Report Types
1. **HTML Report:** Interactive web-based report
2. **JSON Report:** Machine-readable data
3. **Category Reports:** Individual category analysis
4. **Performance Analysis:** Performance metrics and recommendations
5. **Security Analysis:** Security assessment and recommendations
6. **Recommendations:** Actionable improvement suggestions

### Report Locations
- **Main Report:** `tests/results/manual-test-report.html`
- **JSON Report:** `tests/results/manual-test-report.json`
- **Category Reports:** `tests/results/categories/`
- **Performance Analysis:** `tests/results/performance-analysis.json`
- **Security Analysis:** `tests/results/security-analysis.json`
- **Recommendations:** `tests/results/recommendations.json`

### Success Criteria

#### Overall Pass Rate
- **Target:** >95% pass rate
- **Critical Tests:** 100% pass rate (Security, Authentication)
- **High Priority Tests:** >90% pass rate
- **Medium Priority Tests:** >85% pass rate

#### Performance Targets
- **Page Load Time:** <3 seconds
- **API Response Time:** <2 seconds
- **File Upload Time:** <5 seconds
- **Bulk Import Time:** <10 seconds

#### Accessibility Targets
- **WCAG 2.1 AA Compliance:** >90%
- **Keyboard Navigation:** 100% functional
- **Screen Reader Compatibility:** >95%

## Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check if ports are available
lsof -i :3000
lsof -i :3001

# Kill processes if needed
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

#### Database Connection Issues
```bash
# Check database status
pg_ctl status

# Start database if needed
pg_ctl start
```

#### Test Failures
1. **Check Service Status:** Ensure all services are running
2. **Check Test Data:** Verify test users exist
3. **Check Logs:** Review console output for errors
4. **Check Network:** Ensure no firewall blocking

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm run test:manual:run

# Run specific test category
node tests/manual/run-manual-tests.js --category=security
```

## Best Practices

### Test Execution
1. **Run Tests Regularly:** Execute before each deployment
2. **Document Issues:** Record all failures with details
3. **Verify Fixes:** Re-run tests after fixes
4. **Monitor Performance:** Track performance metrics over time

### Test Maintenance
1. **Update Test Data:** Keep test data current
2. **Review Test Cases:** Update tests as features change
3. **Optimize Performance:** Improve test execution speed
4. **Enhance Coverage:** Add tests for new features

### Quality Assurance
1. **Manual Verification:** Verify critical tests manually
2. **Cross-Platform Testing:** Test on different operating systems
3. **User Testing:** Include real user feedback
4. **Continuous Improvement:** Regularly improve test suite

## Integration with CI/CD

### Automated Testing
```yaml
# .github/workflows/manual-tests.yml
name: Manual Tests
on: [push, pull_request]
jobs:
  manual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:manual
      - uses: actions/upload-artifact@v3
        with:
          name: manual-test-results
          path: tests/results/
```

### Quality Gates
- **Pass Rate:** >90% required for deployment
- **Security Tests:** 100% pass rate required
- **Performance Tests:** All targets must be met
- **Critical Tests:** No failures allowed

## Conclusion

The manual testing suite provides comprehensive validation of the Secure Gate Access Control System across all critical aspects. Regular execution of these tests ensures system reliability, security, and performance before production deployment.

---

**Manual Testing Status: ✅ READY FOR EXECUTION**  
**Next Step: Run `npm run test:manual` to execute all tests**
