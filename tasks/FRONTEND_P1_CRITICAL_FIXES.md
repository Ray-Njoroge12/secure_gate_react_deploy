# 🔧 FRONTEND P1 CRITICAL FIXES

**Priority:** HIGH  
**Effort:** 14-20 hours  
**Status:** Ready for Implementation

---

## P1.1: DELETE UNUSED COMPONENTS (~1,631 lines)

### Files to Remove
1. **`pages/resident/AddVisitorEnhanced.jsx`** (329 lines) - Not imported
2. **`pages/resident/VisitorHistoryEnhanced.jsx`** (587 lines) - Not imported  
3. **`pages/admin/SettingsWizard.jsx`** (715 lines) - Future feature, archive

### Action
```bash
# Archive unused files
mkdir -p src/pages/_archived
git mv src/pages/resident/AddVisitorEnhanced.jsx src/pages/_archived/
git mv src/pages/resident/VisitorHistoryEnhanced.jsx src/pages/_archived/
git mv src/pages/admin/SettingsWizard.jsx src/pages/_archived/
```

---

## P1.2: STANDARDIZE LAYOUTS

### Problem
6+ admin pages manually duplicate layout instead of using `Layout.jsx`

### Files to Fix
- `pages/admin/VisitorLog.jsx`
- `pages/admin/Settings.jsx`
- `pages/admin/ManageResidents.jsx`
- `pages/admin/ManageGuards.jsx`
- `pages/admin/AccessControl.jsx`
- `pages/admin/IncidentManagement.jsx`

### Solution
Replace manual layouts with standard `Layout` component

---

## P1.3: FIX localStorage LOGOUT PATTERN

### Problem
6+ files use `localStorage.clear()` + redirect instead of `AuthContext.logout()`

### Fix Pattern
```jsx
// BAD
const onLogout = () => {
  localStorage.clear();
  window.location.href = "/login";
};

// GOOD
const { logout } = useAuth();
const onLogout = async () => {
  await logout();
  navigate("/login");
};
```

---

## P1.4: REPLACE console.log WITH logger

### Stats
- 122 console calls across 36 files
- Top: performanceMonitoring.js (13), apiClient.js (12)

### Fix
```jsx
// BAD
console.log('[DEBUG] Data:', data);

// GOOD
import logger from 'utils/logger';
logger.debug('Data:', data);
```

---

## P1.5: DOCUMENT CANONICAL ROUTES

### Action
Create route documentation clarifying which components are canonical vs legacy

---

## P1.6: COMPLETE GUARD PAGE STUBS

### Problem
`guard/VisitorHistory.jsx` is 424 byte stub

### Fix
Implement full page or redirect to working alternative

---

## IMPLEMENTATION SEQUENCE

1. P1.1 (2-3h) - Archive unused → Build test
2. P1.3 (2-3h) - Fix logout → Auth flow test
3. P1.4 (3-4h) - Logger migration → Lint check
4. P1.2 (4-6h) - Layout refactor → Visual test
5. P1.6 (2h) - Complete stubs → E2E test
6. P1.5 (1h) - Documentation

**Total: 14-19 hours**
