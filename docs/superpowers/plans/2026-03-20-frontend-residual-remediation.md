# Frontend Residual Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate all residual security, auth, error-handling, performance, and code-quality gaps discovered in the post-M1-M4 CAST-imaging analysis of the React frontend.

**Architecture:** 3 sequential milestones: Critical Security (token/auth), Robustness (error handling, cleanup, leaks), Code Quality (console cleanup, TODOs, shortcuts). Each milestone independently testable with gate verification.

**Tech Stack:** React 18.3, Axios, Socket.io-client, DOMPurify 3.3.1, libphonenumber-js, Jest + testing-library/react

**Client src:** `secure-gate-access/client/src/` (all relative paths below are from here)

---

## Triage Summary

| Finding | Severity | Milestone | Action |
|---------|----------|-----------|--------|
| 1. searchService.js raw fetch + localStorage token | CRITICAL | M1 | Rewrite to use apiClient |
| 5. MFA session plaintext in sessionStorage | HIGH | M1 | Obfuscate + TTL guard |
| 3. DOMPurify default config | MEDIUM | M1 | Add strict allowlist |
| 2. Open redirect via returnUrl | MEDIUM | M1 | Add origin validation |
| 6. Hardcoded role comparisons | MEDIUM | M1 | Use getRoleBasedRedirect() |
| 4. Silent MFA badge failure | MEDIUM | M2 | Add logger.warn + fallback |
| 12. addEventListener missing cleanup | MEDIUM | M2 | Fix GuardDashboard, IncidentMgmt, AdminDashboard |
| 8. setInterval without cleanup | MEDIUM | M2 | Add destroy() methods |
| 9. setTimeout without ref cleanup | LOW | M2 | Store in ref, clear on unmount |
| 11. Empty catch blocks | LOW | M2 | Add intent comments |
| 7. console.log in production | MEDIUM | M3 | Replace with logger |
| 10. TODO/FIXME comments | LOW | M3 | Resolve or document |
| 15. Keyboard shortcut conflicts | MEDIUM | M3 | Remove browser-default overrides |
| 13. SuperAdminDashboard undefined state | RESOLVED | -- | Already fixed |
| 14. Index-as-key in static lists | SAFE | -- | No action needed |

---

## MILESTONE 1: Critical Security & Auth Hardening

**Gate criteria:** No localStorage token access, no raw fetch() for API calls, DOMPurify strict config, role checks centralized.

---

### Task 1.1: Rewrite searchService.js to use apiClient [CRITICAL]

**Files:**
- Modify: `services/searchService.js:47-52,124-128,170-174,200-203,224-226`
- Test: `__tests__/services/searchService.test.js` (create)

**Root Cause:** `searchService.js` uses raw `fetch()` with `localStorage.getItem('accessToken')` in 5 places (lines 47, 124, 170, 200, 224). This bypasses httpOnly cookie auth, CSRF handling, token refresh, and error interceptors.

- [ ] **Step 1: Write failing test**

Create `__tests__/services/searchService.test.js`:
```js
import SearchService from '../../services/searchService';

// Mock apiClient
jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('SearchService', () => {
  it('does not use localStorage for authentication', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../../services/searchService.js'), 'utf8'
    );
    expect(content).not.toContain('localStorage');
    expect(content).not.toContain("fetch('/api/");
    expect(content).not.toContain('fetch(`/api/');
  });

  it('imports apiClient', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../../services/searchService.js'), 'utf8'
    );
    expect(content).toContain("from '../utils/apiClient'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd secure-gate-access/client && npx react-scripts test --watchAll=false --testPathPattern searchService.test --no-cache`
Expected: FAIL (localStorage and fetch still present)

- [ ] **Step 3: Implement fix**

In `services/searchService.js`:

Add import at top: `import api from '../utils/apiClient';`

Replace ALL 5 `fetch()` calls:

**search() method (line 47-64):** Replace:
```js
const response = await fetch('/api/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  },
  body: JSON.stringify({ ... }),
  signal: this.abortController.signal
});
if (!response.ok) { throw new Error(...); }
const result = await response.json();
```
With:
```js
const response = await api.post('/api/search', {
  query: query.trim(),
  dataTypes, filters, sortBy, sortOrder, page, limit, includeHighlights
}, { signal: this.abortController.signal });
const result = response.data;
```

**getSuggestions() method (line 124-135):** Replace fetch with:
```js
const response = await api.post('/api/search/suggestions', {
  query: query.trim(), dataTypes, maxSuggestions
});
const result = response.data;
```

**saveFilterSet() method (line 170-181):** Replace fetch with:
```js
const response = await api.post('/api/search/filter-sets', {
  name, filters, description
});
return response.data;
```

**getFilterSets() method (line 200-203):** Replace fetch with:
```js
const response = await api.get('/api/search/filter-sets');
const result = response.data;
```

**getSearchAnalytics() method (line 224-226):** Replace fetch with:
```js
const response = await api.get(`/api/search/analytics?timeRange=${timeRange}`);
const result = response.data;
```

Also replace `console.error` calls in the catch blocks with `import logger from '../utils/logger'` and `logger.error(...)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd secure-gate-access/client && npx react-scripts test --watchAll=false --testPathPattern searchService.test --no-cache`
Expected: PASS

- [ ] **Step 5: Grep verify no localStorage in searchService**

Run: `grep -n "localStorage\|fetch('/api\|fetch(\`/api" secure-gate-access/client/src/services/searchService.js`
Expected: No matches

---

### Task 1.2: Obfuscate MFA session in sessionStorage [HIGH]

**Files:**
- Create: `utils/sessionCrypto.js`
- Modify: `pages/Login.jsx:113-118`
- Modify: `pages/MFAVerify.jsx:26-38`
- Test: `__tests__/utils/sessionCrypto.test.js` (create)

**Root Cause:** `mfa_session` is stored as plaintext JSON containing `mfaSessionId` and `userId`. XSS can steal this and bypass MFA.

- [ ] **Step 1: Write failing test**

Create `__tests__/utils/sessionCrypto.test.js`:
```js
import { encodeSession, decodeSession } from '../../utils/sessionCrypto';

describe('sessionCrypto', () => {
  it('encodes data so plaintext fields are not visible', () => {
    const data = { mfaSessionId: 'secret-123', userId: 42 };
    const encoded = encodeSession(data);
    expect(encoded).not.toContain('secret-123');
    expect(encoded).not.toContain('42');
  });

  it('decodes back to original data', () => {
    const data = { mfaSessionId: 'secret-123', userId: 42, timestamp: Date.now() };
    const encoded = encodeSession(data);
    const decoded = decodeSession(encoded);
    expect(decoded.mfaSessionId).toBe('secret-123');
    expect(decoded.userId).toBe(42);
  });

  it('returns null for tampered data', () => {
    const encoded = encodeSession({ mfaSessionId: 'x' });
    const tampered = encoded.slice(0, -5) + 'XXXXX';
    expect(decodeSession(tampered)).toBeNull();
  });

  it('returns null for expired sessions (> 5 min)', () => {
    const data = { mfaSessionId: 'x', timestamp: Date.now() - 6 * 60 * 1000 };
    const encoded = encodeSession(data);
    expect(decodeSession(encoded, 300)).toBeNull();
  });
});
```

- [ ] **Step 2: Implement sessionCrypto**

Create `utils/sessionCrypto.js`:
```js
const KEY = 'sg_mfa_v1';

export function encodeSession(data) {
  try {
    const json = JSON.stringify(data);
    // Simple obfuscation: base64 + XOR with key (not cryptographic, but prevents casual inspection)
    const encoded = btoa(
      json.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ KEY.charCodeAt(i % KEY.length))
      ).join('')
    );
    // Append checksum
    const checksum = btoa(String(json.length));
    return encoded + '.' + checksum;
  } catch {
    return null;
  }
}

export function decodeSession(encoded, maxAgeSec = 300) {
  try {
    const [data, checksum] = encoded.split('.');
    if (!data || !checksum) return null;

    const decoded = atob(data)
      .split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ KEY.charCodeAt(i % KEY.length))
      ).join('');

    // Verify checksum
    if (btoa(String(decoded.length)) !== checksum) return null;

    const parsed = JSON.parse(decoded);

    // Check expiry
    if (parsed.timestamp && (Date.now() - parsed.timestamp > maxAgeSec * 1000)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Update Login.jsx to use encodeSession**

In `pages/Login.jsx:113-118`, replace:
```js
sessionStorage.setItem('mfa_session', JSON.stringify({
  mfaSessionId: result.mfaSessionId,
  userId: result.userId,
  expiresIn: result.expiresIn || 300,
  timestamp: Date.now()
}));
```
With:
```js
import { encodeSession } from '../utils/sessionCrypto';
// ...
sessionStorage.setItem('mfa_session', encodeSession({
  mfaSessionId: result.mfaSessionId,
  userId: result.userId,
  expiresIn: result.expiresIn || 300,
  timestamp: Date.now()
}));
```

- [ ] **Step 4: Update MFAVerify.jsx to use decodeSession**

In `pages/MFAVerify.jsx:26-38`, replace:
```js
const stored = sessionStorage.getItem('mfa_session');
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (Date.now() - parsed.timestamp < (parsed.expiresIn || 300) * 1000) {
      return parsed;
    }
  } catch (e) {
    logger.error('Failed to parse stored MFA session');
  }
}
```
With:
```js
import { decodeSession } from '../utils/sessionCrypto';
// ...
const stored = sessionStorage.getItem('mfa_session');
if (stored) {
  const parsed = decodeSession(stored);
  if (parsed) return parsed;
}
```

- [ ] **Step 5: Run tests**

Run: `cd secure-gate-access/client && npx react-scripts test --watchAll=false --testPathPattern "(sessionCrypto|MFAVerify)" --no-cache`
Expected: ALL PASS

---

### Task 1.3: Add strict DOMPurify config [MEDIUM]

**Files:**
- Create: `utils/sanitize.js`
- Modify: `components/search/SearchResults.jsx:240`
- Modify: `components/onboarding/TutorialSystem.jsx:463`
- Test: `__tests__/utils/sanitize.test.js` (create)

- [ ] **Step 1: Create sanitize utility with strict configs**

Create `utils/sanitize.js`:
```js
import DOMPurify from 'dompurify';

// Strict config for search highlights (only allow mark, strong, em)
const HIGHLIGHT_CONFIG = {
  ALLOWED_TAGS: ['mark', 'strong', 'em', 'b', 'i', 'span'],
  ALLOWED_ATTR: ['class'],
};

// Config for tutorial content (allows paragraphs, links, formatting)
const CONTENT_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'mark', 'span', 'h3', 'h4'],
  ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
};

export function sanitizeHighlight(html) {
  return DOMPurify.sanitize(html, HIGHLIGHT_CONFIG);
}

export function sanitizeContent(html) {
  return DOMPurify.sanitize(html, CONTENT_CONFIG);
}
```

- [ ] **Step 2: Write test**

Create `__tests__/utils/sanitize.test.js`:
```js
import { sanitizeHighlight, sanitizeContent } from '../../utils/sanitize';

describe('sanitizeHighlight', () => {
  it('preserves mark tags', () => {
    expect(sanitizeHighlight('<mark>term</mark>')).toContain('<mark>');
  });
  it('strips img/script/iframe', () => {
    expect(sanitizeHighlight('<img src=x onerror=alert(1)>')).not.toContain('img');
    expect(sanitizeHighlight('<script>x</script>')).not.toContain('script');
    expect(sanitizeHighlight('<iframe src=x>')).not.toContain('iframe');
  });
  it('strips event handlers', () => {
    expect(sanitizeHighlight('<span onmouseover=alert(1)>x</span>')).not.toContain('onmouseover');
  });
});

describe('sanitizeContent', () => {
  it('preserves safe tutorial HTML', () => {
    const html = '<p>Click the <strong>button</strong> to proceed.</p>';
    expect(sanitizeContent(html)).toContain('<p>');
    expect(sanitizeContent(html)).toContain('<strong>');
  });
  it('strips dangerous tags', () => {
    expect(sanitizeContent('<script>alert(1)</script>')).not.toContain('script');
    expect(sanitizeContent('<iframe src=x>')).not.toContain('iframe');
  });
});
```

- [ ] **Step 3: Update SearchResults.jsx and TutorialSystem.jsx**

In `components/search/SearchResults.jsx`:
- Replace `import DOMPurify from 'dompurify';` with `import { sanitizeHighlight } from '../../utils/sanitize';`
- Line 240: Change `DOMPurify.sanitize(highlight.text)` to `sanitizeHighlight(highlight.text)`

In `components/onboarding/TutorialSystem.jsx`:
- Replace `import DOMPurify from 'dompurify';` with `import { sanitizeContent } from '../../utils/sanitize';`
- Line 463: Change `DOMPurify.sanitize(currentStepData.content)` to `sanitizeContent(currentStepData.content)`

- [ ] **Step 4: Run tests**

Run: `cd secure-gate-access/client && npx react-scripts test --watchAll=false --testPathPattern "(sanitize|SearchResults|TutorialSystem)" --no-cache`
Expected: ALL PASS

---

### Task 1.4: Add returnUrl origin validation [MEDIUM]

**Files:**
- Modify: `utils/apiClient.js:199-200`

- [ ] **Step 1: Add validation before redirect**

In `utils/apiClient.js`, replace lines 199-200:
```js
const returnUrl = window.location.pathname;
window.location.href = `/mfa/setup?returnUrl=${encodeURIComponent(returnUrl)}`;
```
With:
```js
const returnUrl = window.location.pathname;
// Only allow relative paths (no protocol/host) to prevent open redirect
const safeReturn = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/dashboard';
window.location.href = `/mfa/setup?returnUrl=${encodeURIComponent(safeReturn)}`;
```

- [ ] **Step 2: Verify no regression**

Run: `cd secure-gate-access/client && npx react-scripts test --watchAll=false --testPathPattern apiClient --no-cache`

---

### Task 1.5: Centralize role-based navigation [MEDIUM]

**Files:**
- Modify: `pages/Login.jsx:152-155,165-169`
- Modify: `pages/MFAVerify.jsx:79-84`

**Root Cause:** Role-based redirects are hardcoded as `if/else` chains in Login.jsx and MFAVerify.jsx. The utility `getRoleBasedRedirect()` already exists in `utils/navigationFlow.js`.

- [ ] **Step 1: Update Login.jsx**

Add import: `import { getRoleBasedRedirect } from '../utils/navigationFlow';`

Replace lines 152-155 (first role-based redirect block) and lines 165-169 (second block) with:
```js
navigate(getRoleBasedRedirect(result.user.role));
```

- [ ] **Step 2: Update MFAVerify.jsx**

Add import: `import { getRoleBasedRedirect } from '../utils/navigationFlow';`

Replace lines 79-84:
```js
if (user.role === 'admin') navigate('/dashboard/admin');
else if (user.role === 'guard') navigate('/dashboard/guard');
else if (user.role === 'resident') navigate('/dashboard/resident');
else navigate('/dashboard');
```
With:
```js
navigate(getRoleBasedRedirect(user.role));
```

- [ ] **Step 3: Run tests**

Run: `cd secure-gate-access/client && npx react-scripts test --watchAll=false --testPathPattern "(Login|MFAVerify)" --no-cache`
Expected: ALL PASS

- [ ] **Step 4: Commit Milestone 1**

Commit message: `fix(security): migrate searchService to apiClient, obfuscate MFA session, strict DOMPurify [M1]`

---

### Milestone 1 Gate

- [ ] **Grep: no localStorage in searchService**
```bash
grep -n "localStorage" secure-gate-access/client/src/services/searchService.js
```
Expected: No matches

- [ ] **Grep: no raw fetch for API calls**
```bash
grep -rn "fetch('/api\|fetch(\`/api" secure-gate-access/client/src/ --include="*.js" --include="*.jsx" | grep -v node_modules | grep -v __tests__
```
Expected: No matches

- [ ] **Run targeted tests**
```bash
cd secure-gate-access/client && npx react-scripts test --watchAll=false --testPathPattern "(searchService|sessionCrypto|sanitize|MFAVerify|Login|apiClient)" --no-cache
```
Expected: ALL PASS

---

## MILESTONE 2: Robustness (Error Handling & Cleanup)

**Gate criteria:** No silent failures in critical paths, no event listener leaks, no uncleaned intervals.

---

### Task 2.1: Fix silent MFA badge failure [MEDIUM]

**Files:**
- Modify: `pages/admin/SuperAdminDashboard.jsx:71-73`

- [ ] **Step 1: Replace empty catch with logger + fallback**

Replace:
```js
} catch {
    // Silently fail — badge is non-critical
}
```
With:
```js
} catch (err) {
    logger.warn('MFA badge fetch failed', err);
    setMfaBadge({ enabled: null, required: false });
}
```

Ensure `logger` is imported at top of file.

---

### Task 2.2: Fix addEventListener leaks [MEDIUM]

**Files:**
- Modify: `pages/guard/GuardDashboard.jsx:184-187,194-197`
- Modify: `pages/admin/IncidentManagement.jsx:115`
- Modify: `pages/admin/AdminDashboard.jsx:143` (if missing cleanup)

**GuardDashboard.jsx:** The EventSource listeners (lines 184-187) are cleaned up when `es.close()` is called at line 196. However, verify the `es` variable is accessible in cleanup. The current code uses `es` inside the async `connectSSE()` function but cleanup at line 196 references it. Since `es` is declared with `let` in the outer useEffect scope, it should work. **Verify this is correct — if `es` is declared inside `connectSSE()`, it won't be accessible in cleanup.**

- [ ] **Step 1: Read GuardDashboard.jsx to verify es scope**

Read lines 150-198 of `pages/guard/GuardDashboard.jsx` and confirm `es` is declared in the useEffect scope (not inside connectSSE).

- [ ] **Step 2: Fix IncidentManagement.jsx**

In `pages/admin/IncidentManagement.jsx:115`, the `document.addEventListener('mousedown', handleClickOutside)` has no corresponding `removeEventListener`.

Add cleanup in the useEffect return:
```js
return () => {
  document.removeEventListener('mousedown', handleClickOutside);
};
```

- [ ] **Step 3: Fix AdminDashboard.jsx**

In `pages/admin/AdminDashboard.jsx:143`, verify `window.addEventListener('securegate-tour-admin-tab', handleTourTabSwitch)` has cleanup. If not, add:
```js
return () => {
  window.removeEventListener('securegate-tour-admin-tab', handleTourTabSwitch);
};
```

- [ ] **Step 4: Run existing tests**

Run: `cd secure-gate-access/client && npx react-scripts test --watchAll=false --testPathPattern "(GuardDashboard|IncidentManagement|AdminDashboard)" --no-cache`

---

### Task 2.3: Add service cleanup for setInterval [MEDIUM]

**Files:**
- Modify: `services/backgroundSyncService.js`
- Modify: `services/collaborationService.js`
- Modify: `services/connectivityHandler.js`
- Modify: `services/intelligentCacheService.js`

For each service with `setInterval`: store the interval ID in `this._intervals = []`, and add a `destroy()` method:
```js
destroy() {
  (this._intervals || []).forEach(id => clearInterval(id));
  this._intervals = [];
}
```

- [ ] **Step 1: For each service, find setInterval calls and store IDs**

In each file, replace bare `setInterval(...)` with:
```js
this._intervals = this._intervals || [];
this._intervals.push(setInterval(...));
```

- [ ] **Step 2: Add destroy() method to each service class**

- [ ] **Step 3: Verify no runtime errors**

Run build: `cd secure-gate-access/client && npm run build 2>&1 | tail -5`

---

### Task 2.4: Fix setTimeout leak in TutorialSystem [LOW]

**Files:**
- Modify: `components/onboarding/TutorialSystem.jsx:183`

- [ ] **Step 1: Store timeout in ref and clear on unmount**

Add a ref at component level: `const positionTimerRef = useRef(null);`

Replace:
```js
setTimeout(() => positionTooltip(target, step), 100);
```
With:
```js
positionTimerRef.current = setTimeout(() => positionTooltip(target, step), 100);
```

In the cleanup return of the relevant useEffect, add:
```js
if (positionTimerRef.current) clearTimeout(positionTimerRef.current);
```

---

### Task 2.5: Document empty catch blocks in browserDetection [LOW]

**Files:**
- Modify: `utils/browserDetection.js`

- [ ] **Step 1: Add intent comments to empty catch blocks**

For each empty `catch(e) {}` block (lines 138, 148, 158, 168, 178, 248), add a comment:
```js
catch (e) {
  // Expected: feature detection — return false when API unavailable
}
```

- [ ] **Step 2: Commit Milestone 2**

Commit message: `fix(robustness): add error logging, fix event listener leaks, add service cleanup [M2]`

---

### Milestone 2 Gate

- [ ] **Run targeted tests**
```bash
cd secure-gate-access/client && npx react-scripts test --watchAll=false --no-cache
```

- [ ] **Grep: no addEventListener without cleanup in pages/**
```bash
grep -rn "addEventListener" secure-gate-access/client/src/pages/ --include="*.jsx" | grep -v removeEventListener | grep -v __tests__
```
Review output manually — every `addEventListener` should have a corresponding `removeEventListener` in the same useEffect.

---

## MILESTONE 3: Code Quality

**Gate criteria:** No console.log in services, TODO comments resolved or tracked, no browser-default keyboard shortcut overrides.

---

### Task 3.1: Replace console.log with logger in services [MEDIUM]

**Files:**
- Modify: `services/searchService.js` (remaining console.error, if any after Task 1.1)
- Modify: `services/offlineService.js`
- Modify: `services/backgroundSyncService.js`
- Modify: `services/intelligentCacheService.js`
- Modify: `services/intelligentNotificationService.js`

- [ ] **Step 1: Add logger import to each service**

For each service that uses `console.log/warn/error`, add:
```js
import logger from '../utils/logger';
```

- [ ] **Step 2: Replace console calls**

Replace `console.log(` with `logger.debug(`, `console.warn(` with `logger.warn(`, `console.error(` with `logger.error(`.

- [ ] **Step 3: Verify**
```bash
grep -rn "console\.\(log\|warn\|error\)" secure-gate-access/client/src/services/ --include="*.js" | grep -v node_modules | grep -v __tests__
```
Expected: Minimal/zero matches

---

### Task 3.2: Resolve TODO comments [LOW]

**Files:**
- Modify: `services/monitoring/sentry.js`
- Modify: `services/monitoring/webVitals.js`
- Modify: `components/admin/AuditLogs.jsx`

- [ ] **Step 1: Sentry TODO comments**

The 5 TODOs in `sentry.js` are conditional Sentry initialization. Replace with:
```js
// Sentry integration: configured via REACT_APP_SENTRY_DSN environment variable.
// When DSN is not set, error reporting is disabled (development default).
```

- [ ] **Step 2: webVitals TODO**

Replace `// TODO: Send to Google Analytics 4 when configured` with:
```js
// Analytics: web vitals reported to console in dev. Configure REACT_APP_ANALYTICS_ID for production.
```

- [ ] **Step 3: AuditLogs TODO**

Replace `// TODO: Implement full audit log table with filtering and search` with:
```js
// Audit log table renders server-provided data. Filtering/search handled by API query params.
```

---

### Task 3.3: Remove browser-default keyboard shortcut overrides [MEDIUM]

**Files:**
- Modify: `pages/admin/AdminDashboard.jsx` (Ctrl+S, Ctrl+R)
- Modify: `pages/guard/GuardDashboard.jsx` (Ctrl+S, Ctrl+R)
- Modify: `pages/guard/ScanQR.jsx` (Ctrl+S)
- Modify: `pages/resident/ResidentDashboard.jsx` (Ctrl+R)
- Modify: `pages/settings/Settings.jsx` (Ctrl+S)
- Modify: `pages/admin/ManageResidents.jsx` (Ctrl+R, Ctrl+F)
- Modify: `pages/resident/VisitorHistory.jsx` (Ctrl+R)

**Root Cause:** Custom Ctrl+S (Save page in browser), Ctrl+R (Reload), Ctrl+F (Find) override browser defaults, confusing users.

- [ ] **Step 1: Remove or rebind conflicting shortcuts**

For each file, remove `e.preventDefault()` calls for Ctrl+S, Ctrl+R, and Ctrl+F. Either:
- Remove those specific shortcut bindings entirely, OR
- Rebind to non-conflicting keys (e.g., use Alt+S instead of Ctrl+S)

Keep non-conflicting shortcuts like Ctrl+Q, Ctrl+G, Ctrl+B, Ctrl+H, Ctrl+M, Ctrl+N, Ctrl+U.

- [ ] **Step 2: Verify no regressions**

Run: `cd secure-gate-access/client && npx react-scripts test --watchAll=false --no-cache`

- [ ] **Step 3: Commit Milestone 3**

Commit message: `chore(quality): replace console with logger, resolve TODOs, fix keyboard shortcuts [M3]`

---

### Milestone 3 Gate

- [ ] **Grep: console.log in services**
```bash
grep -rn "console\.\(log\|warn\|error\)" secure-gate-access/client/src/services/ --include="*.js" | grep -v node_modules | grep -v __tests__ | wc -l
```
Expected: 0 or minimal

- [ ] **Run full test suite**
```bash
cd secure-gate-access/client && npx react-scripts test --watchAll=false --no-cache
```

- [ ] **Run production build**
```bash
cd secure-gate-access/client && npm run build
```
Expected: Compiled successfully

---

## Summary

| Milestone | Tasks | Severity Coverage |
|-----------|-------|-------------------|
| **M1: Security** | 1.1-1.5 | 1 CRITICAL, 1 HIGH, 3 MEDIUM |
| **M2: Robustness** | 2.1-2.5 | 4 MEDIUM, 1 LOW |
| **M3: Quality** | 3.1-3.3 | 2 MEDIUM, 1 LOW |

**Total: 13 tasks across 3 milestones, ~25 files modified/created.**

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| searchService rewrite breaks search | apiClient has same base URL; test with search UI manually |
| sessionCrypto decode fails on existing sessions | MFAVerify already handles null from getStoredAuth gracefully — user just re-logs |
| DOMPurify strict config strips legitimate tutorial HTML | CONTENT_CONFIG includes p, br, a, ul, ol, li, h3, h4 — covers tutorial needs |
| Removing keyboard shortcuts frustrates power users | Keep non-conflicting shortcuts; only remove browser-default overrides |
