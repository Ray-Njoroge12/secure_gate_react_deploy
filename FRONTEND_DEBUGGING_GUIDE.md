# 🔍 FRONTEND DEBUGGING & TROUBLESHOOTING GUIDE

**Project:** Secure Gate Access Control System  
**Date:** October 2, 2025  
**Purpose:** Quick reference for debugging common issues during optimization

---

## 🚨 CRITICAL ISSUES & FIXES

### Issue 1: CORS Errors on API Calls

**Symptom:**
```
Access to fetch at 'http://localhost:5000/api/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**Root Cause:**
- Hardcoded `localhost:5000` URLs bypassing proxy
- Backend CORS not configured for frontend origin

**Debug Steps:**
```bash
# Step 1: Check if proxy configured
cat client/package.json | grep proxy
# Should show: "proxy": "http://localhost:5000"

# Step 2: Check for hardcoded URLs
grep -r "localhost:5000" client/src/
# Should find NONE (or only in archived files)

# Step 3: Verify backend CORS
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://localhost:5000/api/auth/login -v
# Should return Access-Control-Allow-Origin header

# Step 4: Check if backend is running
curl http://localhost:5000/health
# Should return 200 OK
```

**Fix:**
```javascript
// WRONG:
const res = await fetch("http://localhost:5000/api/endpoint", {...});

// RIGHT:
const res = await fetch("/api/endpoint", {...});
// Proxy automatically forwards to localhost:5000
```

---

### Issue 2: "Module not found" after removing duplicates

**Symptom:**
```
Module not found: Error: Can't resolve './pages/RegisterNew'
```

**Root Cause:**
- File imported somewhere but not found
- Import path incorrect after moving files

**Debug Steps:**
```bash
# Step 1: Find all imports of the file
grep -r "RegisterNew" client/src/ --exclude-dir=node_modules

# Step 2: Check App.js routes
cat client/src/App.js | grep "RegisterNew"

# Step 3: Check for dynamic imports
grep -r "lazy.*RegisterNew" client/src/

# Step 4: Clear build cache
rm -rf client/node_modules/.cache
rm -rf client/build
```

**Fix:**
```javascript
// Remove the import or update the path
// OLD:
import RegisterNew from './pages/RegisterNew';

// NEW:
import Register from './pages/Register';
```

---

### Issue 3: Authentication not persisting after refresh

**Symptom:**
- Login works
- Page refresh → Logged out
- Token in localStorage but not recognized

**Root Cause:**
- Token format changed
- User object structure changed
- AuthContext not loading correctly

**Debug Steps:**
```bash
# Step 1: Check localStorage
# In browser console:
localStorage.getItem('token')
localStorage.getItem('user')

# Step 2: Check token expiry
# Decode JWT token:
# Go to jwt.io and paste token
# Check 'exp' field

# Step 3: Check AuthContext initialization
# Add console.log in AuthContext:
useEffect(() => {
  console.log('Auth initializing...', {
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user')
  });
  initializeAuth();
}, []);

# Step 4: Check backend /api/auth/profile endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/auth/profile
```

**Fix:**
```javascript
// Ensure initializeAuth runs on mount
useEffect(() => {
  initializeAuth();
}, []); // Empty dependency array

// Ensure token and user are set before render
if (loading) {
  return <Loading />;
}
```

---

### Issue 4: Console statements still appearing in production

**Symptom:**
- Built production bundle
- Console still showing debug logs
- Sensitive data exposed

**Root Cause:**
- Console statements not guarded with NODE_ENV
- Build process not stripping dead code
- console.error/warn not removed (intentionally kept)

**Debug Steps:**
```bash
# Step 1: Build production bundle
npm run build:production

# Step 2: Search built files for console statements
grep -r "console\.log" build/static/js/*.js | wc -l
# Should be very low (< 5)

# Step 3: Check for sensitive data
grep -r "token\|password" build/static/js/*.js | grep console
# Should find NONE

# Step 4: Check build configuration
cat client/package.json | grep build:production
# Should include NODE_ENV=production
```

**Fix:**
```javascript
// WRONG:
console.log('User token:', token);

// RIGHT (for debugging):
if (process.env.NODE_ENV === 'development') {
  console.log('User token:', token);
}

// BETTER (use logging utility):
import { logger } from './utils/logger';
logger.debug('User token:', token); // Only in development
```

---

### Issue 5: AdminDashboard axios errors after migration

**Symptom:**
```
Cannot read property 'data' of undefined
Error handling not working correctly
```

**Root Cause:**
- axios response format different from fetch
- Error handling pattern changed
- Token injection not working

**Debug Steps:**
```bash
# Step 1: Check import
grep "import.*http" client/src/pages/admin/AdminDashboard.jsx
# Should see: import { http } from "../../services/_http.js";

# Step 2: Check response handling
# axios returns: res.data.data
# http service returns: data directly (already unwrapped)

# Step 3: Test manually
# In browser console:
import { http } from './services/_http.js';
const data = await http.get('/api/admin/metrics');
console.log(data);

# Step 4: Check error format
try {
  const data = await http.get('/api/nonexistent');
} catch (error) {
  console.log('Error structure:', error);
}
```

**Fix:**
```javascript
// BEFORE (axios):
try {
  const res = await axios.get('/api/admin/metrics', { headers });
  setMetrics(res.data?.data || {});
} catch (e) {
  setError('Failed to load');
}

// AFTER (http service):
try {
  const data = await http.get('/api/admin/metrics');
  // data is already unwrapped (no .data.data needed)
  setMetrics(data || {});
} catch (e) {
  setError(handleApiError(e, 'Admin Metrics'));
}
```

---

## 🔧 DEBUGGING TOOLS

### Tool 1: React DevTools

**Installation:**
```bash
# Chrome Extension: React Developer Tools
# Firefox Extension: React Developer Tools
```

**Usage:**
```
1. Open DevTools → Components tab
2. Select component (e.g., AuthContext.Provider)
3. Check hooks state (token, user, loading)
4. Check props passed to children
5. Use Profiler to find slow renders
```

---

### Tool 2: Network Tab Debugging

**Usage:**
```
1. Open DevTools → Network tab
2. Filter: Fetch/XHR
3. Reload page
4. Check each request:
   - URL: Should be /api/... (not http://localhost:5000/api/...)
   - Method: POST, GET, etc.
   - Status: 200, 401, 404, etc.
   - Headers: Authorization present?
   - Response: Check data structure
5. Look for CORS errors (red text)
```

**Common Issues:**
- 401 Unauthorized → Token missing or expired
- 404 Not Found → Endpoint doesn't exist
- 500 Internal Server Error → Backend error (check backend logs)
- CORS error → Hardcoded URL or backend CORS issue

---

### Tool 3: Console Logging Best Practices

**Development Logging:**
```javascript
// Good patterns:
if (process.env.NODE_ENV === 'development') {
  console.log('[Auth] Login attempt:', { email });
  console.log('[API] Response:', response);
  console.log('[State] Updated state:', newState);
}

// Use prefixes for easy filtering:
// [Auth] - Authentication related
// [API] - API calls
// [State] - State updates
// [Route] - Routing
// [Error] - Errors
```

**Production Logging:**
```javascript
// Only log errors (for monitoring):
try {
  // ... code ...
} catch (error) {
  console.error('[ERROR]', {
    message: error.message,
    timestamp: new Date().toISOString(),
    // Do NOT log: tokens, passwords, PII
  });
  
  // Optionally send to error tracking service:
  // errorTracker.log(error);
}
```

---

### Tool 4: Bundle Analyzer

**Usage:**
```bash
# Generate bundle analysis
npm run analyze

# Opens browser with visualization
# Check for:
1. Large chunks (> 500KB)
2. Duplicate dependencies
3. Unused dependencies
4. Tree-shaking working?

# To reduce bundle size:
- Use lazy loading
- Remove unused dependencies
- Use dynamic imports
- Enable tree-shaking
```

---

### Tool 5: Lighthouse Audit

**Usage:**
```
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select categories: Performance, Accessibility, Best Practices, SEO
4. Select device: Desktop / Mobile
5. Click "Generate report"

6. Review scores:
   - Performance > 90
   - Accessibility > 95
   - Best Practices > 90
   - SEO > 90

7. Review opportunities:
   - Reduce unused JavaScript
   - Properly size images
   - Eliminate render-blocking resources
   - etc.
```

---

## 🧪 TESTING SCRIPTS

### Script 1: Quick API Test

```bash
#!/bin/bash
# test-api.sh - Test all critical API endpoints

BASE_URL="http://localhost:3000"
TOKEN=""

echo "=== Testing Critical Endpoints ==="

# Test 1: Login
echo -e "\n1. Testing login..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"resident@example.com","password":"resident123"}')
echo $RESPONSE | jq '.'
TOKEN=$(echo $RESPONSE | jq -r '.accessToken // .token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✅ Login successful"

# Test 2: Protected endpoint
echo -e "\n2. Testing protected endpoint..."
RESPONSE=$(curl -s -X GET $BASE_URL/api/visitors \
  -H "Authorization: Bearer $TOKEN")
echo $RESPONSE | jq '.'
if echo $RESPONSE | jq -e '.success' > /dev/null; then
  echo "✅ Protected endpoint works"
else
  echo "❌ Protected endpoint failed"
fi

# Test 3: Forgot password
echo -e "\n3. Testing forgot password..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}')
echo $RESPONSE | jq '.'
if echo $RESPONSE | jq -e '.success' > /dev/null; then
  echo "✅ Forgot password works"
else
  echo "⚠️  Forgot password endpoint may not be implemented"
fi

echo -e "\n=== Test Complete ==="
```

**Usage:**
```bash
chmod +x test-api.sh
./test-api.sh
```

---

### Script 2: Build Verification

```bash
#!/bin/bash
# verify-build.sh - Verify production build is clean

echo "=== Verifying Production Build ==="

# Step 1: Clean previous build
echo -e "\n1. Cleaning previous build..."
rm -rf build/
echo "✅ Cleaned"

# Step 2: Build production
echo -e "\n2. Building production..."
npm run build:production
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build successful"

# Step 3: Check for hardcoded URLs
echo -e "\n3. Checking for hardcoded URLs..."
HARDCODED=$(grep -r "localhost:5000" build/ | wc -l)
if [ $HARDCODED -eq 0 ]; then
  echo "✅ No hardcoded URLs"
else
  echo "❌ Found $HARDCODED hardcoded URLs"
  grep -r "localhost:5000" build/
fi

# Step 4: Check for sensitive data
echo -e "\n4. Checking for sensitive data..."
SENSITIVE=$(grep -r "password.*=\|token.*=\|secret.*=" build/static/js/*.js | wc -l)
if [ $SENSITIVE -eq 0 ]; then
  echo "✅ No sensitive data exposed"
else
  echo "⚠️  Found $SENSITIVE potential sensitive data"
fi

# Step 5: Check bundle size
echo -e "\n5. Checking bundle size..."
MAIN_SIZE=$(du -h build/static/js/main.*.js | cut -f1)
echo "Main bundle: $MAIN_SIZE"
if [ $(du -b build/static/js/main.*.js | cut -f1) -lt 524288 ]; then
  echo "✅ Bundle size acceptable (< 512KB)"
else
  echo "⚠️  Bundle size large (> 512KB)"
fi

# Step 6: Check for console statements
echo -e "\n6. Checking for console statements..."
CONSOLE_COUNT=$(grep -r "console\.log" build/static/js/*.js | wc -l)
echo "Console statements: $CONSOLE_COUNT"
if [ $CONSOLE_COUNT -lt 5 ]; then
  echo "✅ Minimal console statements"
else
  echo "⚠️  Too many console statements"
fi

echo -e "\n=== Verification Complete ==="
```

**Usage:**
```bash
chmod +x verify-build.sh
./verify-build.sh
```

---

### Script 3: Full System Test

```bash
#!/bin/bash
# full-system-test.sh - Test all user flows

echo "=== Full System Test ==="
echo "This script requires manual interaction"

# Test 1: Authentication
echo -e "\n📋 Test 1: Authentication Flow"
echo "1. Open http://localhost:3000 in browser"
echo "2. Should redirect to /login"
echo "3. Enter credentials and login"
echo "4. Should redirect to dashboard"
read -p "Test passed? (y/n): " AUTH_TEST
if [ "$AUTH_TEST" != "y" ]; then
  echo "❌ Authentication test failed"
  exit 1
fi
echo "✅ Authentication test passed"

# Test 2: Protected Routes
echo -e "\n📋 Test 2: Protected Routes"
echo "1. Logout"
echo "2. Try accessing /dashboard/resident directly"
echo "3. Should redirect to /login"
read -p "Test passed? (y/n): " ROUTE_TEST
if [ "$ROUTE_TEST" != "y" ]; then
  echo "❌ Protected route test failed"
  exit 1
fi
echo "✅ Protected route test passed"

# Test 3: Forgot Password
echo -e "\n📋 Test 3: Forgot Password"
echo "1. On login page, click 'Forgot Password'"
echo "2. Enter email and submit"
echo "3. Open DevTools console"
echo "4. Should NOT see CORS errors"
read -p "Test passed? (y/n): " FORGOT_TEST
if [ "$FORGOT_TEST" != "y" ]; then
  echo "❌ Forgot password test failed"
  exit 1
fi
echo "✅ Forgot password test passed"

# Test 4: Visitor Management
echo -e "\n📋 Test 4: Visitor Management"
echo "1. Login as resident"
echo "2. Navigate to 'Add Visitor'"
echo "3. Fill and submit form"
echo "4. Should see success message"
echo "5. Check console for errors"
read -p "Test passed? (y/n): " VISITOR_TEST
if [ "$VISITOR_TEST" != "y" ]; then
  echo "❌ Visitor management test failed"
  exit 1
fi
echo "✅ Visitor management test passed"

# Test 5: Admin Dashboard
echo -e "\n📋 Test 5: Admin Dashboard"
echo "1. Logout and login as admin"
echo "2. Dashboard should load"
echo "3. Metrics should display"
echo "4. No console errors"
read -p "Test passed? (y/n): " ADMIN_TEST
if [ "$ADMIN_TEST" != "y" ]; then
  echo "❌ Admin dashboard test failed"
  exit 1
fi
echo "✅ Admin dashboard test passed"

echo -e "\n=== All Tests Passed ✅ ==="
```

**Usage:**
```bash
chmod +x full-system-test.sh
./full-system-test.sh
```

---

## 📊 QUICK DIAGNOSTIC CHECKLIST

**When something breaks, check in this order:**

### 1. Browser Console
```
[ ] Any red errors?
[ ] Any CORS errors?
[ ] Any 401/403 errors?
[ ] Any 404 errors?
[ ] Any warnings?
```

### 2. Network Tab
```
[ ] Are requests going to correct URLs?
[ ] Are Authorization headers present?
[ ] Are responses in expected format?
[ ] Are there any failed requests?
```

### 3. React DevTools
```
[ ] Is AuthContext state correct?
[ ] Are props passed correctly?
[ ] Is component rendering?
[ ] Are hooks working correctly?
```

### 4. Backend Logs
```
[ ] Is backend running?
[ ] Are requests reaching backend?
[ ] Any backend errors?
[ ] Is database connected?
```

### 5. Build Process
```
[ ] Did build complete successfully?
[ ] Are all dependencies installed?
[ ] Is node_modules/.cache cleared?
[ ] Is build folder clean?
```

---

## 🆘 EMERGENCY PROCEDURES

### If Everything Breaks

**Step 1: Verify services running**
```bash
# Check if backend is running
curl http://localhost:5000/health

# Check if frontend is running
curl http://localhost:3000

# Check if database is running
docker ps | grep postgres
```

**Step 2: Check for recent changes**
```bash
# See recent commits
git log --oneline -10

# See current changes
git status
git diff

# If needed, revert last commit
git revert HEAD
```

**Step 3: Clear all caches**
```bash
# Clear frontend cache
cd client
rm -rf node_modules/.cache
rm -rf build
npm install

# Restart services
docker-compose restart
npm start
```

**Step 4: Rollback if necessary**
```bash
# Stash current changes
git stash

# Checkout last working commit
git checkout [last-working-commit]

# Rebuild and test
npm run build
npm start
```

---

## 📞 GETTING HELP

**Before asking for help, gather:**
1. Error message (exact text)
2. Steps to reproduce
3. Browser and version
4. Screenshot of error
5. Relevant code snippet
6. What you've tried

**Where to get help:**
1. Check this debugging guide
2. Check implementation plan
3. Check testing strategy
4. Review Git history
5. Ask team lead
6. Check documentation

---

**Last Updated:** October 2, 2025  
**Maintained By:** Development Team
