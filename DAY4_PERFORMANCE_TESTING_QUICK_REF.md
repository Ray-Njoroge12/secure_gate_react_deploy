# ⚡ Performance Testing - Quick Reference Guide

**Date:** October 8, 2025  
**Status:** ✅ READY TO EXECUTE  

---

## 🚀 Quick Start

### Option 1: Run Comprehensive Test Suite (Recommended)
```bash
cd secure-gate-access/server
npm run test:performance:comprehensive
```

### Option 2: Monitor Tests in Real-Time
```bash
# Terminal 1: Run tests
cd secure-gate-access/server
npm run test:performance:comprehensive

# Terminal 2: Monitor progress
cd secure-gate-access/server
npm run test:performance:monitor
```

### Option 3: Run Individual k6 Tests (if k6 installed)
```bash
cd secure-gate-access/server

# Smoke test
k6 run tests/performance/k6/smoke.test.js

# Login test
k6 run tests/performance/k6/login.test.js

# Load test
npm run test:performance:load
```

---

## 📋 Available Test Suites

### 1. Comprehensive Performance Test (Node.js Native)
**File:** `tests/performance/comprehensive-performance-test.js`  
**Command:** `npm run test:performance:comprehensive`

**What it does:**
- ✅ Smoke Test (5 users, 1 min)
- ✅ Load Test (1→50 users, ramping)
- ✅ Stress Test (100 users, immediate)
- ✅ Spike Test (10→100→10 pattern)

**Duration:** ~5-7 minutes  
**Dependencies:** None (uses Node.js native modules)  
**Output:** JSON results in `tests/results/` directory

### 2. Real-Time Monitor Dashboard
**File:** `tests/performance/monitor-dashboard.js`  
**Command:** `npm run test:performance:monitor`

**What it does:**
- 📊 Live progress tracking
- 📈 Real-time metrics display
- ✅ Test completion status
- 🎯 Pass/fail indicators

**Updates:** Every 2 seconds  
**Requirements:** Must run concurrently with performance tests

### 3. k6 Performance Tests
**Files:** `tests/performance/k6/*.test.js`  
**Commands:** Various (see below)

**Available Tests:**
- Smoke: `k6 run tests/performance/k6/smoke.test.js`
- Login: `k6 run tests/performance/k6/login.test.js`
- Registration: `k6 run tests/performance/k6/registration.test.js`
- Visitor Flow: `k6 run tests/performance/k6/visitor_flow.test.js`
- OTP: `k6 run tests/performance/k6/otp.test.js`

**Requirements:** k6 must be installed (`brew install k6` on macOS)

---

## 🎯 Performance Thresholds

### Critical Metrics
| Metric | Threshold | Priority |
|--------|-----------|----------|
| P95 Response Time | < 500ms | 🔴 Critical |
| P99 Response Time | < 1000ms | 🔴 Critical |
| Error Rate (baseline) | < 0.1% | 🔴 Critical |
| Error Rate (stress) | < 1% | 🟡 High |
| Success Rate | > 99.9% | 🔴 Critical |
| Recovery Time | < 30s | 🟡 High |
| Throughput | > 100 req/s | 🟢 Medium |

### Pass/Fail Criteria
- ✅ **PASS:** All critical metrics within thresholds
- ⚠️ **WARNING:** Some high priority metrics exceeded
- ❌ **FAIL:** Critical metrics exceeded or system crash

---

## 📊 Test Configuration

### Smoke Test 🔥
```javascript
{
  virtualUsers: 5,
  duration: 60000, // 1 minute
  endpoint: '/health',
  interval: 1000 // 1 second
}
```

### Load Test 📈
```javascript
{
  virtualUsers: 50,
  rampUpTime: 10000, // 10 seconds
  steadyTime: 60000, // 1 minute
  endpoints: [
    '/health',
    '/api/dashboard/stats',
    '/api/visitors',
    '/api/admin/system-health'
  ],
  interval: '500-1500ms' // Random
}
```

### Stress Test 💪
```javascript
{
  virtualUsers: 100,
  duration: 60000, // 1 minute
  immediateStart: true,
  endpoints: [
    '/health',
    '/api/dashboard/stats',
    '/api/visitors'
  ],
  interval: '200-500ms' // Aggressive
}
```

### Spike Test ⚡
```javascript
{
  phases: [
    { users: 10, duration: 20000 }, // Baseline
    { users: 100, duration: 10000 }, // Spike
    { users: 10, duration: 20000 }  // Recovery
  ],
  endpoint: '/health'
}
```

---

## 📁 Output Files

### Test Results
**Location:** `tests/results/performance-test-YYYY-MM-DD-HH-MM-SS.json`

**Structure:**
```json
{
  "tests": [
    {
      "testName": "Smoke Test",
      "count": 300,
      "successRate": 100,
      "errorRate": 0,
      "mean": 45.2,
      "p95": 87.5,
      "p99": 112.3,
      "requestsPerSecond": 5.0,
      "passed": true
    }
  ],
  "summary": {
    "totalTests": 4,
    "passed": 4,
    "failed": 0,
    "overallStatus": "PASS"
  }
}
```

### Documentation
- `DAY4_PERFORMANCE_TESTING_EXECUTION_PLAN.md` - Detailed test plan
- `DAY4_PERFORMANCE_TESTING_RESULTS.md` - Results and analysis
- `DAY4_PERFORMANCE_TESTING_QUICK_REF.md` - This document

---

## 🔧 Troubleshooting

### Server Not Running
```bash
# Error: Server is not available
# Solution: Start the server first

cd secure-gate-access/server
npm start
# Wait for "Server running on port 5001"

# Then run tests in another terminal
npm run test:performance:comprehensive
```

### Port Already in Use
```bash
# Error: EADDRINUSE: address already in use
# Solution: Kill the process on that port

# Find process
lsof -i :5001

# Kill it
kill -9 <PID>

# Or change port
PORT=5002 npm start
```

### High Error Rate
```bash
# If seeing lots of errors:
# 1. Check database connection
# 2. Verify Redis is running
# 3. Check rate limiting configuration
# 4. Review server logs
tail -f server.log
```

### Tests Running Slowly
```bash
# If tests are taking too long:
# 1. Reduce virtual users
# 2. Shorten test duration
# 3. Check system resources
# 4. Monitor CPU/memory usage
top
```

### Module Not Found Errors
```bash
# If seeing import errors:
# Solution: Verify Node.js version and reinstall

node --version  # Should be 18.x
npm install
```

---

## 📈 Interpreting Results

### Response Time Metrics

**Excellent (Green)** ✅
- P95 < 200ms
- P99 < 400ms
- Mean < 100ms

**Good (Yellow)** 🟡
- P95 200-500ms
- P99 400-1000ms
- Mean 100-300ms

**Poor (Red)** ❌
- P95 > 500ms
- P99 > 1000ms
- Mean > 300ms

### Success Rate

| Rate | Status | Action |
|------|--------|--------|
| > 99.9% | ✅ Excellent | No action needed |
| 99-99.9% | 🟡 Good | Monitor closely |
| 95-99% | 🟠 Warning | Investigate errors |
| < 95% | ❌ Critical | Fix immediately |

### Throughput

| RPS | System Load | Status |
|-----|-------------|--------|
| > 500 | High capacity | ✅ Excellent |
| 100-500 | Good capacity | 🟡 Acceptable |
| 50-100 | Limited | 🟠 Consider optimization |
| < 50 | Low | ❌ Needs improvement |

---

## 🚀 Common Commands

### Pre-Test Setup
```bash
# Navigate to server directory
cd secure-gate-access/server

# Install dependencies (if needed)
npm install

# Start server
npm start

# Verify health
curl http://localhost:5001/health
```

### Run Tests
```bash
# Comprehensive suite
npm run test:performance:comprehensive

# With monitoring
npm run test:performance:monitor

# Individual k6 tests (if k6 installed)
k6 run tests/performance/k6/smoke.test.js
```

### View Results
```bash
# List results
ls -lh tests/results/

# View latest results
cat tests/results/performance-test-*.json | jq '.'

# Open in editor
code tests/results/performance-test-*.json
```

### Clean Up
```bash
# Stop server
pkill -f "node server.js"

# Clean old results (optional)
rm tests/results/performance-test-*.json
```

---

## 🎯 Quick Decision Matrix

### When to Run Which Test?

| Scenario | Test to Run | Why |
|----------|-------------|-----|
| Quick sanity check | Smoke Test | Fast, basic validation |
| Pre-deployment validation | Comprehensive Suite | Full coverage |
| Capacity planning | Load + Stress Tests | Find limits |
| Traffic surge readiness | Spike Test | Test recovery |
| CI/CD pipeline | Smoke + Load | Balance speed/coverage |
| After optimization | Full Suite | Validate improvements |
| Production monitoring | Load Test (scheduled) | Regular health check |

---

## 📞 Need Help?

### Common Questions

**Q: How long do tests take?**  
A: ~5-7 minutes for comprehensive suite

**Q: Can I run tests on production?**  
A: NO! Tests generate significant load. Use staging/test environment.

**Q: What if tests fail?**  
A: Review error logs, check thresholds, optimize bottlenecks, re-run tests

**Q: How often should I run performance tests?**  
A: 
- Before each deployment (required)
- After major changes (recommended)
- Weekly on staging (best practice)
- After performance optimizations (validation)

**Q: Can I customize test parameters?**  
A: Yes! Edit the CONFIG object in `comprehensive-performance-test.js`

---

## ✅ Quick Checklist

### Before Running Tests
- [ ] Server is running on port 5001
- [ ] Database is accessible
- [ ] Redis is running (if used)
- [ ] No other heavy processes running
- [ ] Sufficient system resources available

### During Tests
- [ ] Monitor system resources (CPU, memory)
- [ ] Watch for error messages
- [ ] Note any unusual behavior
- [ ] Keep logs accessible

### After Tests
- [ ] Review all test results
- [ ] Check error logs
- [ ] Document any issues
- [ ] Create optimization tasks
- [ ] Update baseline metrics

---

**Last Updated:** October 8, 2025  
**Version:** 1.0  
**Maintained By:** DevOps Team
