# 🚀 FRONTEND OPTIMIZATION IMPLEMENTATION PLAN

**Project:** Secure Gate Access Control System  
**Date:** October 2, 2025  
**Status:** Ready for Execution  
**Estimated Duration:** 4-6 hours

---

## 📊 EXECUTIVE SUMMARY

This plan addresses **15 critical issues** identified in the frontend analysis:
- **3 Critical Bugs** (blocking production)
- **5 Duplicate Files** (code bloat)
- **53+ Debug Statements** (security/performance)
- **6 Inconsistent Patterns** (maintainability)
- **Architecture Improvements** (optimization)

**Success Criteria:**
✅ All critical bugs fixed and tested  
✅ Code duplication eliminated  
✅ Consistent HTTP client pattern  
✅ Production-ready (no debug code)  
✅ All tests passing  
✅ Manual browser testing successful

---

## 🔴 PHASE 1: CRITICAL FIXES (Priority: URGENT)

### **1.1 Fix Hardcoded Localhost URLs**

**Issue:** 3 files contain `http://localhost:5000` hardcoded URLs that bypass proxy
**Impact:** Password reset will fail in Docker/production
**Root Cause:** Direct fetch calls instead of using proxy configuration

**Affected Files:**
1. `/client/src/pages/Login.jsx` (line 59)
2. `/client/src/pages/ForgotPasswordPage.js` (line 14)
3. `/client/src/pages/ResetPasswordPage.js` (line 17)

**Backend Verification:**
✅ Proxy configured: `"proxy": "http://localhost:5000"` in package.json
✅ Backend endpoints exist in middleware whitelist:
   - `/api/auth/forgot-password`
   - `/api/auth/reset-password`

**Implementation Steps:**

**Step 1.1.1: Fix Login.jsx forgot password**
```javascript
// BEFORE (Line 59):
const res = await fetch("http://localhost:5000/api/forgot-password", {

// AFTER:
const res = await fetch("/api/auth/forgot-password", {
```

**Step 1.1.2: Fix ForgotPasswordPage.js**
```javascript
// BEFORE (Line 14):
const res = await fetch("http://localhost:5000/api/forgot-password", {

// AFTER:
const res = await fetch("/api/auth/forgot-password", {
```

**Step 1.1.3: Fix ResetPasswordPage.js**
```javascript
// BEFORE (Line 17):
const res = await fetch(`http://localhost:5000/api/reset-password/${token}`, {

// AFTER:
const res = await fetch(`/api/auth/reset-password/${token}`, {
```

**Testing Strategy:**
```bash
# Test 1: Verify endpoints work with proxy
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test 2: Manual browser testing
1. Open http://localhost:3000/login
2. Click "Forgot Password"
3. Enter email and submit
4. Verify no CORS errors in console
5. Check backend logs for request

# Test 3: Production build test
npm run build:production
# Verify no localhost URLs in built files:
grep -r "localhost:5000" build/ || echo "✓ No hardcoded URLs found"
```

**Success Criteria:**
- [ ] No `localhost:5000` URLs in any frontend files
- [ ] Forgot password form works without CORS errors
- [ ] Reset password form works without CORS errors
- [ ] Production build contains no hardcoded URLs

---

### **1.2 Remove Debug OTP Code**

**Issue:** Production code exposes debug_otp from backend
**Impact:** Security risk if backend accidentally leaks OTP
**Root Cause:** No environment check before using debug data

**Affected Files:**
1. `/client/src/pages/Register.js` (lines 221-223)
2. `/client/src/pages/GuestInvite.jsx` (line 145)

**Implementation Steps:**

**Step 1.2.1: Add environment check to Register.js**
```javascript
// BEFORE (Lines 221-223):
if (response && response.debug_otp) {
  setOtp(response.debug_otp);
  setOtpSuccess('Debug OTP provided (dev only)');
}

// AFTER:
if (process.env.NODE_ENV === 'development' && response && response.debug_otp) {
  setOtp(response.debug_otp);
  setOtpSuccess('⚠️ Debug OTP (dev only): ' + response.debug_otp);
}
```

**Step 1.2.2: Add environment check to GuestInvite.jsx**
```javascript
// BEFORE (Line 145):
otp={visitor.debug_otp || visitor.otp}

// AFTER:
otp={process.env.NODE_ENV === 'development' ? (visitor.debug_otp || visitor.otp) : visitor.otp}
```

**Testing Strategy:**
```bash
# Test 1: Development mode
NODE_ENV=development npm start
# Verify debug OTP appears in console

# Test 2: Production mode
npm run build:production
# Verify debug code is stripped/guarded
grep -r "debug_otp" build/static/js/*.js && echo "⚠️ Found debug code" || echo "✓ Clean"

# Test 3: Runtime test
# Register visitor and verify no OTP exposed in production build
```

**Success Criteria:**
- [ ] Debug OTP only shows in development mode
- [ ] Production build doesn't expose debug_otp
- [ ] Registration flow still works correctly

---

## 🧹 PHASE 2: CODE CLEANUP

### **2.1 Remove Duplicate Files**

**Issue:** 5 duplicate files with "*New" suffix cluttering codebase
**Impact:** Confusion, larger bundle, maintenance overhead

**Files to Remove:**
1. `/client/src/pages/RegisterNew.js` (not imported in App.js)
2. `/client/src/pages/resident/AddVisitorNew.jsx` (not imported)
3. `/client/src/pages/resident/BulkInviteNew.jsx` (not imported)

**Files to Evaluate (may be valid):**
4. `/client/src/pages/ForgotPasswordPage.js` (replaced by Login.jsx inline form)
5. `/client/src/pages/ResetPasswordPage.js` (check if routed)

**Implementation Steps:**

**Step 2.1.1: Verify files are not imported**
```bash
# Search for imports of duplicate files
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client
grep -r "RegisterNew" src/ 
grep -r "AddVisitorNew" src/
grep -r "BulkInviteNew" src/
grep -r "ForgotPasswordPage" src/
grep -r "ResetPasswordPage" src/
```

**Step 2.1.2: Check App.js routes**
```bash
# Verify routes don't reference these files
cat src/App.js | grep -E "RegisterNew|AddVisitorNew|BulkInviteNew|ForgotPasswordPage|ResetPasswordPage"
```

**Step 2.1.3: Safe removal (after verification)**
```bash
# Move to archive first (safety measure)
mkdir -p ../archived_duplicates
mv src/pages/RegisterNew.js ../archived_duplicates/
mv src/pages/resident/AddVisitorNew.jsx ../archived_duplicates/
mv src/pages/resident/BulkInviteNew.jsx ../archived_duplicates/

# If ForgotPasswordPage/ResetPasswordPage are unused:
mv src/pages/ForgotPasswordPage.js ../archived_duplicates/
# mv src/pages/ResetPasswordPage.js ../archived_duplicates/  # Only if not routed
```

**Testing Strategy:**
```bash
# Test 1: Build succeeds
npm run build:fast
# Should complete without errors

# Test 2: No broken imports
npm start
# Check console for import errors

# Test 3: All routes work
# Manual testing of each user flow
```

**Success Criteria:**
- [ ] No import errors after removal
- [ ] Build succeeds
- [ ] All routes still functional
- [ ] Bundle size reduced

---

### **2.2 Remove Unused Admin Pages**

**Issue:** 5 admin pages import axios but aren't routed in App.js
**Impact:** Dead code, unnecessary dependencies, confusion

**Files to Evaluate:**
1. `/client/src/pages/admin/VisitorLog.jsx`
2. `/client/src/pages/admin/ManageResidents.jsx`
3. `/client/src/pages/admin/AccessControl.jsx`
4. `/client/src/pages/admin/IncidentManagement.jsx`
5. `/client/src/pages/admin/ManageGuards.jsx`

**Implementation Steps:**

**Step 2.2.1: Verify not imported**
```bash
grep -r "VisitorLog\|ManageResidents\|AccessControl\|IncidentManagement\|ManageGuards" src/App.js
```

**Step 2.2.2: Check if intended for future use**
```bash
# Check for TODO comments or documentation
grep -r "TODO.*VisitorLog\|TODO.*ManageResidents" src/
```

**Step 2.2.3: Decision tree**
- **If not routed AND no future plans:** Move to archived_unused
- **If planned for future:** Add comment in file header explaining status
- **If should be routed:** Add to App.js and implement

**Testing Strategy:**
```bash
# After removal/archival:
npm run build:fast
# Verify no errors

# Check bundle size reduction:
npm run analyze
```

**Success Criteria:**
- [ ] Decision documented for each file
- [ ] Build succeeds
- [ ] No broken references

---

### **2.3 Remove Console Statements**

**Issue:** 53+ console.log/error/warn statements in production code
**Impact:** Security (data leakage), performance, unprofessional

**Affected Files:** 20+ files with console statements

**Implementation Steps:**

**Step 2.3.1: Audit critical console statements**
```bash
# Find all console statements
grep -r "console\.(log|error|warn|info)" src/ --exclude-dir=node_modules > console_audit.txt

# Categorize:
# - Authentication/tokens: REMOVE (security risk)
# - User data: REMOVE (PII risk)
# - Debug data: REMOVE or guard with NODE_ENV
# - Error logging: KEEP (but consider proper logging service)
```

**Step 2.3.2: Remove sensitive console.log**

Priority removals:
1. `AddVisitor.jsx` line 99: `console.log('Sending visitor data:', visitorData)`
2. `ResidentDashboard.jsx` line 26: `console.error('No authentication token found')`
3. Any console.log containing tokens, emails, passwords

**Step 2.3.3: Add development guards for debugging**
```javascript
// Pattern to use:
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG]', message);
}

// Or create a debug utility:
// utils/logger.js
export const logger = {
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args);
    }
  },
  error: (...args) => {
    console.error('[ERROR]', ...args);
    // Could also send to error tracking service
  }
};
```

**Testing Strategy:**
```bash
# Test 1: Production build check
npm run build:production
# Verify console statements minimized in build
grep -r "console\.log" build/static/js/*.js | wc -l

# Test 2: Development mode still works
NODE_ENV=development npm start
# Verify debug logs appear

# Test 3: Production mode clean
# Deploy and check browser console - should be minimal output
```

**Success Criteria:**
- [ ] No sensitive data in console statements
- [ ] Console statements guarded or removed
- [ ] Development debugging still works
- [ ] Production console is clean

---

## 🔧 PHASE 3: STANDARDIZATION

### **3.1 Migrate AdminDashboard from Axios to Fetch**

**Issue:** AdminDashboard uses axios while rest of app uses fetch via _http.js
**Impact:** Inconsistent error handling, larger bundle, dual dependencies

**Affected Files:**
1. `/client/src/pages/admin/AdminDashboard.jsx`
2. Any other admin pages using axios

**Root Cause:** Different developer or implementation period

**Implementation Steps:**

**Step 3.1.1: Analyze current axios usage**
```bash
# Find all axios imports
grep -r "import.*axios" src/pages/admin/
```

**Step 3.1.2: Refactor AdminDashboard.jsx**
```javascript
// BEFORE:
import axios from "axios";
const res = await axios.get("/api/admin/metrics", { headers });

// AFTER:
import { http } from "../../services/_http.js";
const res = await http.get("/api/admin/metrics");
// Note: http.get auto-adds token from localStorage
```

**Step 3.1.3: Update error handling**
```javascript
// BEFORE (axios):
try {
  const res = await axios.get(url, { headers });
  setData(res.data?.data || {});
} catch (e) {
  setError("Failed to load");
}

// AFTER (http service):
try {
  const data = await http.get(url);
  setData(data || {});
} catch (e) {
  setError(handleApiError(e, 'Admin Metrics'));
}
```

**Step 3.1.4: Remove axios dependency (if only used by admin)**
```bash
# Check if axios is used elsewhere
grep -r "import.*axios" src/ --exclude-dir=node_modules

# If only in admin pages, consider removing from package.json
# (Keep for now if removing requires team discussion)
```

**Testing Strategy:**
```bash
# Test 1: Admin dashboard loads
# Login as admin
# Verify metrics load
# Check network tab for correct requests

# Test 2: Error handling works
# Simulate 401/403 errors
# Verify redirects to login

# Test 3: Token handling
# Verify Authorization header sent
# Check token refresh on expiry
```

**Success Criteria:**
- [ ] AdminDashboard uses http service
- [ ] All API calls work correctly
- [ ] Error handling consistent with other pages
- [ ] Token injection automatic

---

### **3.2 Standardize Password Reset Flow**

**Issue:** Login.jsx has inline forgot password, separate pages exist
**Decision Needed:** Keep inline or use separate pages?

**Implementation Steps:**

**Step 3.2.1: Evaluate current implementation**
```javascript
// Current: Login.jsx has inline forgot password modal
// Separate: ForgotPasswordPage.js and ResetPasswordPage.js exist

// Recommendation: Keep inline for UX, add proper routing for reset
```

**Step 3.2.2: Add reset password route (if missing)**
```javascript
// In App.js:
<Route path="/reset-password/:token" element={<ResetPasswordPage />} />
```

**Step 3.2.3: Ensure consistency**
- Both use same API endpoints
- Same error handling
- Same success messages

**Testing Strategy:**
```bash
# Test full flow:
1. Login page → Click "Forgot Password"
2. Enter email → Submit
3. Check email for reset link (or backend logs in dev)
4. Click reset link → Opens /reset-password/:token
5. Enter new password → Submit
6. Verify redirect to login
7. Login with new password
```

**Success Criteria:**
- [ ] Reset flow works end-to-end
- [ ] Consistent error messages
- [ ] No hardcoded URLs
- [ ] Mobile responsive

---

## ⚡ PHASE 4: OPTIMIZATION

### **4.1 Code Splitting Optimization**

**Current Status:** Good (lazy loading implemented)
**Improvement:** Verify all routes are lazy loaded

**Implementation Steps:**

**Step 4.1.1: Audit App.js imports**
```javascript
// All route components should be lazy loaded:
const ComponentName = lazy(() => import("./path/to/Component"));
```

**Step 4.1.2: Add loading states**
```javascript
// Ensure all Suspense boundaries have good fallbacks
<Suspense fallback={<Loading message="Loading dashboard..." />}>
```

**Step 4.1.3: Analyze bundle**
```bash
npm run analyze
# Check for:
# - Main chunk size < 500KB
# - Route chunks appropriately split
# - No duplicate code in multiple chunks
```

**Testing Strategy:**
```bash
# Test 1: Network throttling
# Open DevTools → Network → Slow 3G
# Verify pages load acceptably

# Test 2: Bundle analysis
npm run analyze
# Review chunk sizes

# Test 3: Lighthouse audit
# Run Lighthouse → Check Performance score > 90
```

**Success Criteria:**
- [ ] All routes lazy loaded
- [ ] Good loading states
- [ ] Acceptable chunk sizes
- [ ] Performance score > 90

---

### **4.2 Error Boundary Enhancement**

**Current Status:** ErrorBoundary exists
**Improvement:** Add better error reporting

**Implementation Steps:**

**Step 4.2.1: Enhance ErrorBoundary.jsx**
```javascript
// Add error logging to external service (future)
// Add error recovery options
// Add better user messaging
```

**Step 4.2.2: Add boundaries at route level**
```javascript
// Wrap each major route with ErrorBoundary
<ErrorBoundary fallback={<ErrorPage />}>
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
</ErrorBoundary>
```

**Testing Strategy:**
```bash
# Test error scenarios:
1. Network failure during data fetch
2. Invalid API response
3. Component crash (throw error in useEffect)
4. Verify error boundary catches and displays fallback
```

**Success Criteria:**
- [ ] Errors caught gracefully
- [ ] User-friendly error messages
- [ ] App doesn't crash completely
- [ ] Option to recover/retry

---

### **4.3 Performance Monitoring**

**Issue:** performanceOptimization.js exists but may not be used effectively

**Implementation Steps:**

**Step 4.3.1: Review existing performance utilities**
```bash
cat src/utils/performanceOptimization.js
# Check what utilities are available
```

**Step 4.3.2: Add performance marks**
```javascript
// In critical paths:
performance.mark('dashboard-load-start');
// ... load data ...
performance.mark('dashboard-load-end');
performance.measure('dashboard-load', 'dashboard-load-start', 'dashboard-load-end');
```

**Step 4.3.3: Add to key components**
- Dashboard components
- Form submissions
- Data fetching operations

**Testing Strategy:**
```bash
# Test with React DevTools Profiler
# Measure render times
# Identify slow components
# Optimize as needed
```

**Success Criteria:**
- [ ] Key operations measured
- [ ] Performance data available in dev tools
- [ ] No unnecessary re-renders

---

## ✅ PHASE 5: COMPREHENSIVE TESTING

### **5.1 Unit Testing**

**Test Files to Create/Update:**

**Step 5.1.1: Test AuthContext**
```javascript
// __tests__/AuthContext.test.js
- Test login flow
- Test logout flow
- Test token persistence
- Test auto-redirect when authenticated
```

**Step 5.1.2: Test _http service**
```javascript
// __tests__/_http.test.js
- Test token injection
- Test error handling
- Test response parsing
```

**Step 5.1.3: Test errorMapper**
```javascript
// __tests__/errorMapper.test.js
- Test status code mapping
- Test error message formatting
- Test handleApiError
```

**Run Tests:**
```bash
npm test -- --coverage
# Verify > 80% coverage for critical paths
```

**Success Criteria:**
- [ ] Core services tested
- [ ] 80%+ coverage
- [ ] All tests passing

---

### **5.2 Integration Testing**

**Test Scenarios:**

**Scenario 1: Authentication Flow**
```
1. Open /login
2. Enter valid credentials
3. Click "Sign In"
4. Verify redirect to correct dashboard
5. Verify token stored
6. Refresh page → Still authenticated
7. Logout → Redirect to login
8. Verify token cleared
```

**Scenario 2: Forgot Password Flow**
```
1. Open /login
2. Click "Forgot Password"
3. Enter email
4. Submit form
5. Verify success message
6. Check network tab for correct API call
7. Verify no CORS errors
```

**Scenario 3: Protected Routes**
```
1. Open /dashboard/resident (not logged in)
2. Verify redirect to /login
3. Login as resident
4. Verify access granted
5. Try to access /dashboard/admin
6. Verify redirect back to /dashboard/resident
```

**Scenario 4: Visitor Creation**
```
1. Login as resident
2. Navigate to "Add Visitor"
3. Fill form with valid data
4. Submit
5. Verify success message
6. Check visitor appears in dashboard
7. Verify QR code generated
```

**Scenario 5: Admin Dashboard**
```
1. Login as admin
2. Verify metrics load
3. Verify audit logs load
4. Check filters work
5. Verify no console errors
```

**Success Criteria:**
- [ ] All scenarios pass
- [ ] No console errors
- [ ] Network requests correct
- [ ] UI responsive

---

### **5.3 Browser Compatibility Testing**

**Browsers to Test:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Mobile Chrome (Android)

**Test Matrix:**
```
Feature           | Chrome | Firefox | Safari | Edge | Mobile
------------------|--------|---------|--------|------|-------
Login             |   ✓    |    ✓    |   ✓    |  ✓   |   ✓
Forgot Password   |   ✓    |    ✓    |   ✓    |  ✓   |   ✓
Dashboard         |   ✓    |    ✓    |   ✓    |  ✓   |   ✓
QR Code Display   |   ✓    |    ✓    |   ✓    |  ✓   |   ✓
Forms             |   ✓    |    ✓    |   ✓    |  ✓   |   ✓
```

**Success Criteria:**
- [ ] Works in all major browsers
- [ ] Mobile responsive
- [ ] No browser-specific bugs

---

### **5.4 Performance Testing**

**Metrics to Measure:**

**Lighthouse Audit:**
```bash
# Run Lighthouse in Chrome DevTools
# Target scores:
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90
```

**Bundle Size:**
```bash
npm run analyze
# Targets:
- Main chunk: < 500KB
- Route chunks: < 200KB each
- Total initial load: < 1MB
```

**Load Time:**
```bash
# Measure with DevTools Performance tab
# Targets:
- Time to Interactive: < 3s (fast 3G)
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
```

**Success Criteria:**
- [ ] Lighthouse score > 90
- [ ] Bundle size acceptable
- [ ] Load time < 3s on slow connection

---

### **5.5 Security Testing**

**Checks to Perform:**

**Step 5.5.1: No sensitive data in console**
```bash
# Build production
npm run build:production

# Search built files
grep -r "password\|token\|secret" build/static/js/*.js | grep -v "password:" | wc -l
# Should be minimal/only in form labels
```

**Step 5.5.2: No API keys in frontend**
```bash
grep -r "API_KEY\|SECRET\|PRIVATE" src/
# Should find none
```

**Step 5.5.3: XSS protection**
```bash
# Verify React escapes user input
# Test in forms: Try entering <script>alert('xss')</script>
# Should be escaped and not execute
```

**Step 5.5.4: CSRF protection**
```bash
# Verify tokens sent in headers
# Check backend validates CSRF tokens
```

**Success Criteria:**
- [ ] No sensitive data exposed
- [ ] No API keys in frontend
- [ ] XSS protected
- [ ] CSRF protected

---

## 📊 EXECUTION CHECKLIST

### Pre-Implementation
- [ ] Backup current codebase
- [ ] Create feature branch: `frontend-optimization`
- [ ] Document current state
- [ ] Set up testing environment

### Phase 1: Critical Fixes
- [ ] Fix hardcoded localhost URLs (3 files)
- [ ] Add debug OTP environment checks (2 files)
- [ ] Test forgot/reset password flow
- [ ] Verify production build clean

### Phase 2: Code Cleanup
- [ ] Remove duplicate files (5 files)
- [ ] Evaluate unused admin pages (5 files)
- [ ] Remove/guard console statements (53+ locations)
- [ ] Test build succeeds

### Phase 3: Standardization
- [ ] Migrate AdminDashboard to http service
- [ ] Standardize password reset flow
- [ ] Verify consistent error handling
- [ ] Test all admin features

### Phase 4: Optimization
- [ ] Verify code splitting
- [ ] Enhance error boundaries
- [ ] Add performance monitoring
- [ ] Run Lighthouse audit

### Phase 5: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Browser compatibility tests
- [ ] Performance tests
- [ ] Security tests

### Post-Implementation
- [ ] Final manual testing
- [ ] Documentation update
- [ ] Create PR with detailed changes
- [ ] Team review
- [ ] Merge to main

---

## 🎯 SUCCESS METRICS

**Code Quality:**
- ✅ No hardcoded URLs
- ✅ No duplicate files
- ✅ Consistent patterns
- ✅ < 10 console statements (guarded)

**Performance:**
- ✅ Lighthouse score > 90
- ✅ Bundle size optimized
- ✅ Load time < 3s

**Functionality:**
- ✅ All user flows working
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Browser compatible

**Security:**
- ✅ No sensitive data exposed
- ✅ Production-ready code
- ✅ XSS/CSRF protected

---

## 📝 NOTES & DECISIONS

### Decision Log:

**Decision 1:** Keep inline forgot password in Login.jsx
- **Reason:** Better UX, already implemented
- **Action:** Ensure ResetPasswordPage properly routed

**Decision 2:** Archive duplicate files instead of deleting
- **Reason:** Safety measure, can restore if needed
- **Action:** Create archived_duplicates folder

**Decision 3:** Keep axios dependency for now
- **Reason:** May be used by other features, team decision needed
- **Action:** Document in technical debt

**Decision 4:** Guard debug code with NODE_ENV instead of removing
- **Reason:** Useful for development, stripped in production builds
- **Action:** Verify build process strips dead code

---

## 🚀 ESTIMATED TIMELINE

**Phase 1 (Critical):** 2 hours
**Phase 2 (Cleanup):** 2 hours
**Phase 3 (Standardization):** 2 hours
**Phase 4 (Optimization):** 1 hour
**Phase 5 (Testing):** 3 hours

**Total:** 10 hours (can be parallelized by multiple developers)

---

## 📞 SUPPORT & ESCALATION

**If Issues Arise:**
1. Check this plan's troubleshooting section
2. Review Git history for context
3. Consult team lead
4. Document decisions in this plan

**Emergency Rollback:**
```bash
git checkout main
git branch -D frontend-optimization
# Start fresh if needed
```

---

**Plan Created By:** AI Assistant  
**Plan Reviewed By:** [Pending]  
**Plan Approved By:** [Pending]  
**Execution Start Date:** [TBD]  
**Execution End Date:** [TBD]
