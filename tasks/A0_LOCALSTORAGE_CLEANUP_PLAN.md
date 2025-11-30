# A0.2: localStorage Token Cleanup Plan

**Status**: Analysis Complete  
**Priority**: CRITICAL  
**Estimated Time**: 4-6 hours

---

## Analysis Results

### ✅ Safe localStorage Usage (UI Preferences - OK to keep)

These use localStorage for non-sensitive UI preferences and can remain:

1. **Dark Mode** (`pages/resident/Settings.jsx`, `pages/guard/Settings.jsx`)
   - Stores: `darkMode` boolean
   - Risk: None (cosmetic preference)

2. **Toast Filters** (`pages/guard/GuardDashboard.jsx`)
   - Stores: `toastFilter` (all/info/warning/error)
   - Risk: None (UI filter preference)

3. **Profile Pictures** (`pages/guard/Settings.jsx`)
   - Stores: Blob URLs for profile pictures
   - Risk: Low (local display only, no auth)

4. **Form Drafts** (Various wizard components)
   - Stores: Form draft data (not tokens)
   - Risk: Low (user's own form data)

5. **Cookie Consent** (`components/CookieConsentBanner.jsx`)
   - Stores: Cookie consent preferences
   - Risk: None (required for compliance)

6. **Filter Preferences** (`components/ui/FilterPanel.jsx`)
   - Stores: Saved filter configurations
   - Risk: None (UI preference)

7. **Navigation State** (`utils/navigationHelpers.js`)
   - Stores: Navigation breadcrumbs
   - Risk: None (UI state)

---

## 🚨 CRITICAL: Token Storage (MUST FIX)

### Files Using localStorage for Tokens

#### 1. **`utils/httpInterceptor.js`** - HIGH PRIORITY
```javascript
// Line 37-38: VULNERABLE
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
```

**Fix**: Remove entirely, rely on httpOnly cookies via `credentials: 'include'`

#### 2. **`utils/errorReporting.js`** - HIGH PRIORITY
```javascript
// Lines 113, 267-270: VULNERABLE
const userStr = localStorage.getItem('user');
const token = user.token;
```

**Fix**: Remove token extraction, get user info from API if needed

#### 3. **`docs/DEPLOYMENT_GUIDE.md`** - Documentation only
```javascript
// Line 774: EXAMPLE CODE (needs update)
getToken: () => {
  return localStorage.getItem('token');
}
```

**Fix**: Update documentation examples to use httpOnly cookies

#### 4. **Test Files** - Test mocks only
- `__tests__/AuthContext.test.jsx`
- `__tests__/useLoadingStates.test.js`
- `__tests__/http.test.js`
- `docs/TESTING_GUIDE.md`

**Fix**: Update test mocks to not reference token storage

---

## Implementation Plan

### Step 1: Update httpInterceptor.js

**Current (Vulnerable)**:
```javascript
// utils/httpInterceptor.js
window.fetch = async function(url, options = {}) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (token && (url.startsWith('/api') || url.includes('/api'))) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  return self.apply(this, [url, options]);
};
```

**New (Secure)**:
```javascript
// utils/httpInterceptor.js
window.fetch = async function(url, options = {}) {
  // Remove manual token handling - httpOnly cookies handle auth
  
  // For API calls, ensure credentials are included
  if (url.startsWith('/api') || url.includes('/api')) {
    options = {
      ...options,
      credentials: 'include', // Send httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
  }
  
  return self.apply(this, [url, options]);
};
```

### Step 2: Update errorReporting.js

**Current (Vulnerable)**:
```javascript
// utils/errorReporting.js
getUserInfo() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return {
      id: user.id,
      email: user.email,
      role: user.role
    };
  }
  return null;
}

getAuthToken() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.token;
  }
  return null;
}
```

**New (Secure)**:
```javascript
// utils/errorReporting.js
import { useAuth } from '../contexts/AuthContext';

// Get user info from AuthContext instead
getUserInfo() {
  // Access from AuthContext (which uses httpOnly cookies)
  const { user } = useAuth();
  if (user) {
    return {
      id: user.id,
      email: user.email,
      role: user.role
    };
  }
  return null;
}

// Remove getAuthToken entirely - not needed with httpOnly cookies
// getAuthToken() { ... } // REMOVED
```

### Step 3: Update Documentation

Update all code examples in documentation to use httpOnly pattern:

**Files to update**:
- `docs/DEPLOYMENT_GUIDE.md`
- `docs/TESTING_GUIDE.md`
- Any README files with auth examples

**Pattern to replace**:
```javascript
// OLD (don't do this)
const token = localStorage.getItem('token');
fetch('/api/visitors', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// NEW (do this)
fetch('/api/visitors', {
  credentials: 'include', // httpOnly cookies sent automatically
  headers: { 'Content-Type': 'application/json' }
});
```

### Step 4: Update Test Mocks

**AuthContext.test.jsx**:
```javascript
// Remove these lines:
localStorage.setItem('token', 'mock-token');
localStorage.setItem('user', JSON.stringify(mockUser));

// Replace with:
// Mock httpOnly cookie behavior in tests
jest.mock('../services/authService', () => ({
  getCurrentUser: jest.fn().mockResolvedValue(mockUser)
}));
```

**http.test.js**:
```javascript
// Remove:
localStorage.setItem('token', 'test-token-123');

// Replace with:
// Mock fetch with credentials: 'include'
global.fetch = jest.fn().mockImplementation((url, options) => {
  expect(options.credentials).toBe('include');
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  });
});
```

---

## Verification Steps

### 1. Code Scan

```bash
# Should return 0 results after cleanup
grep -r "localStorage.getItem('token')" client/src --include="*.js" --include="*.jsx" | grep -v test | grep -v docs

grep -r "localStorage.setItem('token')" client/src --include="*.js" --include="*.jsx" | grep -v test | grep -v docs

grep -r "localStorage.getItem('user')" client/src --include="*.js" --include="*.jsx" | grep -v test | grep -v docs
```

### 2. Manual Testing

Test all authentication flows:

- [ ] Login (should set httpOnly cookie, not localStorage)
- [ ] Logout (should clear httpOnly cookie)
- [ ] Page refresh (session persists via cookie)
- [ ] API calls (credentials sent automatically)
- [ ] Token expiration (handled by server)

### 3. Browser DevTools Check

**Before cleanup**:
- Open DevTools → Application → Local Storage
- See `token` and `user` entries ❌

**After cleanup**:
- Open DevTools → Application → Local Storage
- NO `token` or `user` entries ✅
- Open DevTools → Application → Cookies
- See `auth_token` or similar httpOnly cookie ✅

---

## Migration Checklist

- [ ] Backup codebase before changes
- [ ] Update `utils/httpInterceptor.js`
- [ ] Update `utils/errorReporting.js`
- [ ] Update documentation examples
- [ ] Update test mocks
- [ ] Run code scan (grep for token storage)
- [ ] Test login flow
- [ ] Test logout flow
- [ ] Test page refresh
- [ ] Test all protected routes
- [ ] Test API calls
- [ ] Browser DevTools verification
- [ ] Update team on new auth pattern

---

## Rollback Plan

If issues arise:

1. **Keep backup branch**: `git checkout -b backup-before-localstorage-cleanup`
2. **Feature flag**: Add env variable to toggle between localStorage and httpOnly
3. **Gradual rollout**: Deploy to staging first, monitor for 24 hours
4. **Quick revert**: `git revert <commit-hash>` if critical issues

---

## Security Benefits After Cleanup

✅ **Eliminates XSS token theft** - httpOnly cookies can't be accessed by JavaScript  
✅ **OWASP A07 compliance** - Proper authentication storage  
✅ **Reduces attack surface** - No client-side token management  
✅ **Audit trail** - All auth handled server-side with logging  
✅ **Better security posture** - Aligns with industry best practices  

---

## Next Steps After Completion

1. Update security audit documentation
2. Update developer onboarding docs
3. Add ESLint rule to prevent future localStorage token usage:
   ```javascript
   // .eslintrc.js
   rules: {
     'no-restricted-syntax': [
       'error',
       {
         selector: "CallExpression[callee.object.name='localStorage'][callee.property.name='getItem'] > Literal[value='token']",
         message: "Do not store tokens in localStorage. Use httpOnly cookies instead."
       }
     ]
   }
   ```

---

**Status**: Ready for implementation  
**Estimated Time**: 4-6 hours (including testing)  
**Risk Level**: Medium (requires careful testing)  
**Impact**: High (security improvement)
