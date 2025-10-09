# 🧪 Test Execution Quick Reference

## 🚀 How to Run Tests

### Prerequisites
```bash
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
```

---

## 📋 Test Commands

### All Tests
```bash
npm test                          # Run all tests
npm run test:coverage             # All tests with coverage
npm run test:watch                # All tests in watch mode
```

### Unit Tests
```bash
npm run test:unit                 # Run unit tests
npm run test:unit:coverage        # Unit tests with coverage
npm run test:unit:watch           # Unit tests in watch mode
```

### Integration Tests
```bash
npm run test:integration          # Run integration tests
npm run test:integration:coverage # Integration tests with coverage
```

### E2E Tests
```bash
npm run test:e2e                  # Run e2e tests
npm run test:e2e:coverage         # E2E tests with coverage
npm run test:playwright           # Run Playwright tests (separate)
```

---

## 🔧 Integration Tests with Server

### Option 1: Automated Script (Recommended)
```bash
./run-integration-tests.sh
```

This automatically:
1. Starts the server
2. Waits for server to be ready
3. Runs integration tests
4. Stops the server
5. Shows results

### Option 2: Manual (Two Terminals)

**Terminal 1 - Start Server:**
```bash
npm start
```

**Terminal 2 - Run Tests:**
```bash
npm run test:integration
```

---

## 📊 Coverage Reports

After running tests with `--coverage`, view reports at:
- `coverage/unit/index.html` - Unit test coverage
- `coverage/integration/index.html` - Integration test coverage
- `coverage/e2e/index.html` - E2E test coverage

Open in browser:
```bash
open coverage/integration/index.html
```

---

## 🎯 Coverage Thresholds

- **Unit Tests:** 70% (statements, functions, lines), 65% (branches)
- **Integration Tests:** 75% (statements, functions, lines), 70% (branches)
- **E2E Tests:** 65% (statements, functions, lines), 60% (branches)
- **Overall:** 70% minimum

---

## 🐛 Troubleshooting

### Server Not Running
```bash
# Check if server is running
curl http://localhost:3001/api/health

# If not, start it
npm start
```

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Database Issues
```bash
# Reset test database
npm run test:reset

# Seed test data
npm run test:seed

# Cleanup test data
npm run test:cleanup
```

### ES Module Warnings
```bash
# This warning is expected and can be ignored:
# (node:xxxxx) ExperimentalWarning: VM Modules is an experimental feature
```

---

## 📝 Test File Locations

```
tests/
├── unit/              # Unit tests (to be created)
├── integration/       # 11 integration test files
├── e2e/              # 6 e2e test files
├── helpers/          # Test helper utilities
├── fixtures/         # Test data fixtures
├── seeds/            # Database seed scripts
└── setup.js          # Global test setup
```

---

## ✅ Quick Health Check

Run this to verify everything is working:

```bash
# 1. Check test discovery
npm test -- --listTests

# 2. Check server health
curl http://localhost:3001/api/health

# 3. Run one simple test
npm run test:integration -- tests/integration/auth.integration.test.js
```

---

## 🔗 Related Documentation

- **FINAL_PRE_DAY3_STATUS.md** - Complete status report
- **TEST_INFRASTRUCTURE_STATUS_REPORT.md** - Technical details
- **EXECUTION_SUMMARY.md** - Execution overview

---

**Quick Start:**
```bash
cd secure-gate-access/server
./run-integration-tests.sh
```

**That's it!** 🎉
