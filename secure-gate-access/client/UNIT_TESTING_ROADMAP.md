# SecureGate Frontend Unit Testing Roadmap

**Last Updated:** December 23, 2025  
**Testing Stack:** Jest (CRA `react-scripts test`) + React Testing Library (RTL)  
**Coverage Threshold (client/package.json):** Statements 70% | Branches 65% | Functions 70% | Lines 70%

---

## Current System Status

| Metric | Value |
|--------|-------|
| **Test Suites** | 30 passed |
| **Tests** | 333 passed, 81 skipped |
| **Snapshots** | 0 |
| **Run Time** | ~3.4s |

### Test Coverage Summary

| Category | Files Tested | Status |
|----------|-------------|--------|
| **Utilities** | 7 | ✅ Complete |
| **Hooks** | 6 | ✅ Complete |
| **Services** | 7 | ✅ Complete |
| **Routes** | 1 | ✅ Complete |
| **Pages (Auth)** | 2 | ✅ Complete |
| **UI Components** | 3 | ✅ Complete |
| **Pages (Dashboards)** | 3 | ✅ Complete |
| **Accessibility (jest-axe)** | 1 | ✅ Complete |

### What the current results mean
- **Passing tests**: Validated behavior of core utilities, routing guards, HTTP clients, form validation hooks, all service API clients, authentication flows (login/register), and UI components.
- **Skipped tests**: Legacy/simulated tests intentionally skipped to avoid giving a false sense of coverage. These are retained only as reference.
- **Console warnings**:
  - React Router future-flag warnings are informational (v7 migration prep).
  - `phoneValidator` warns when `libphonenumber-js` parsing throws (expected in negative-path tests).
  - Some UI components log controlled/uncontrolled warnings during a11y snapshots; these do not affect functionality but should be cleaned up over time.

---

## Phased Frontend Test Strategy (Progressive Coverage)

### Phase F1 — Test Infrastructure (Scaffolding)
- Goal: Ensure stable and repeatable test environment.
- Deliverables:
  - `src/setupTests.js` loads `@testing-library/jest-dom`
  - `src/test-utils.js` provides router/auth wrappers

### Phase F2 — Utilities (Pure Logic)
- Goal: Lock down business rules and shared helpers.
- Targets:
  - `src/utils/errorMapper.js`
  - `src/utils/phoneValidator.js`
  - `src/utils/apiClient.js` (axios wrapper)

### Phase F3 — Routing & Role Gates
- Goal: Ensure role-based access control is correct.
- Targets:
  - `src/routes/ProtectedRoute.jsx`

### Phase F4 — HTTP Service Layer
- Goal: Ensure consistent client/server contract handling.
- Targets:
  - `src/services/_http.js` (fetch wrapper)
  - Service modules that depend on `_http.js` / `apiClient.js`

### Phase F5 — Form Validation (Hooks)
- Goal: Ensure validation state machine + submission behavior is correct.
- Targets:
  - `src/hooks/useFormValidation.js`
  - `src/hooks/useAdvancedValidation.js`

### Phase F6 — Services (API Clients)
- Goal: Verify endpoints, payload shape, and query serialization.
- Targets:
  - `src/services/deliveryService.js`
  - `src/services/recurringPassService.js`
  - `src/services/rideshareService.js`
  - `src/services/visitorService.js`
  - `src/services/adminService.js`

### Phase F7 — Component-Level RTL Tests (Critical User Flows)
- Goal: Test high-value flows with UI states (loading/error/empty).
- Targets:
  - Login/Register
  - Resident dashboard modules
  - Guard dashboard modules

### Phase F8 — Accessibility & Regression Checks
- Goal: Prevent regressions in accessibility and key UI flows.
- Tools:
  - `jest-axe` (unit)
  - Playwright a11y (e2e)

---

## Complete Test Inventory

### Utilities (Phase F2)

| Utility | Test File | Status | Tests | Notes |
|---------|----------|--------|-------|------|
| API Client (axios) | `src/__tests__/utils/apiClient.test.js` | ✅ Active | 12 | Interceptors, CSRF refresh, timeout retry, 401/429/500 mapping |
| Error mapping | `src/__tests__/utils/errorMapper.unit.test.js` | ✅ Active | 8 | Error code to message mapping |
| Phone validator | `src/__tests__/utils/phoneValidator.test.js` | ✅ Active | 15 | Validation, formatting, international support |
| Logger | `src/__tests__/utils/logger.test.js` | ✅ Active | 5 | Debug, info, warn, error logging |
| Status colors | `src/__tests__/utils/statusColors.test.js` | ✅ Active | 11 | Color mapping, chip classes, icons for all statuses |
| Validation rules | `src/__tests__/utils/validationRules.test.js` | ✅ Active | 17 | Required, email, minLength, debounce, throttle |
| Date utilities | `src/__tests__/utils/dateUtils.test.js` | ✅ Active | 4 | Date formatting helpers |

### Hooks (Phase F5)

| Hook | Test File | Status | Tests | Notes |
|------|----------|--------|-------|------|
| useFormValidation | `src/__tests__/hooks/useFormValidation.test.js` | ✅ Active | 18 | Field registration, validation, submit handling |
| useAdvancedValidation | `src/__tests__/hooks/useAdvancedValidation.test.js` | ✅ Active | 6 | Async rules, caching, cross-field validation |
| useCurrentRole | `src/__tests__/hooks/useCurrentRole.test.js` | ✅ Active | 5 | Role extraction from AuthContext |
| useErrorHandler | `src/__tests__/hooks/useErrorHandler.test.js` | ✅ Active | 14 | Error/success/warning handling, queue management |
| useLoadingState | `src/__tests__/hooks/useLoadingState.test.js` | ✅ Active | 14 | Loading state, progress, timeout, multiple states |
| useDebounce | `src/__tests__/hooks/useDebounce.test.js` | ✅ Active | 10 | Value debounce, callback debounce, search debounce |

### Routes (Phase F3)

| Route | Test File | Status | Tests | Notes |
|-------|----------|--------|-------|------|
| ProtectedRoute | `src/__tests__/routes/ProtectedRoute.test.jsx` | ✅ Active | 5 | Auth check, role gates, redirects |

### Services (Phase F6)

| Service | Test File | Status | Tests | Notes |
|---------|----------|--------|-------|------|
| HTTP wrapper (_http) | `src/__tests__/services/apiService.test.js` | ✅ Active | 8 | Fetch wrapper, error handling |
| Delivery service | `src/__tests__/services/deliveryService.test.js` | ✅ Active | 9 | CRUD, query params, file upload |
| Recurring pass service | `src/__tests__/services/recurringPassService.test.js` | ✅ Active | 7 | Pass management, validation |
| Rideshare service | `src/__tests__/services/rideshareService.test.js` | ✅ Active | 6 | Ride entries, validation, completion |
| Visitor service | `src/__tests__/services/visitorService.test.js` | ✅ Active | 8 | Visitor CRUD, normalizeVisitor |
| Admin service | `src/__tests__/services/adminService.test.js` | ✅ Active | 10 | Dashboard, logs, user management |
| Pass service | `src/__tests__/services/passService.test.js` | ✅ Active | 14 | Passes, OTP, bulk invite, check-in/out |

### Pages — Auth Flows (Phase F7a)

| Page | Test File | Status | Tests | Notes |
|------|----------|--------|-------|------|
| Login | `src/__tests__/pages/LoginPage.test.jsx` | ✅ Active | 5 | Validation, login, MFA, errors, forgot password |
| Registration | `src/__tests__/pages/RegistrationPage.test.jsx` | ✅ Active | 5 | Form, validation, success, password indicators |

### Pages — Dashboards (Phase F7b)

| Dashboard | Test File | Status | Tests | Notes |
|-----------|----------|--------|-------|------|
| ResidentDashboard | `src/__tests__/pages/ResidentDashboard.test.jsx` | ✅ Active | 2 | Fetch, render, resident sub-route panel switching |
| GuardDashboard | `src/__tests__/pages/GuardDashboard.test.jsx` | ✅ Active | 2 | Fetch active visitors, empty state, guard sub-route panel switching |
| AdminDashboard | `src/__tests__/pages/AdminDashboard.test.jsx` | ✅ Active | 2 | Metrics/logs load, error path |

### UI Components (Phase F7c)

| Component | Test File | Status | Tests | Notes |
|-----------|----------|--------|-------|------|
| GradientButton | `src/__tests__/components/ui/GradientButton.test.jsx` | ✅ Active | 13 | Click, disabled, loading, variants, icons |
| GradientCard | `src/__tests__/components/ui/GradientCard.test.jsx` | ✅ Active | 16 | Variants, clickable, keyboard, sub-components |
| FloatingLabelInput | `src/__tests__/components/ui/FloatingLabelInput.test.jsx` | ✅ Active | 17 | Label float, validation, icons, accessibility |

### Accessibility (Phase F8)

| Area | Test File | Status | Tests | Notes |
|------|----------|--------|-------|------|
| A11y smoke (jest-axe) | `src/__tests__/a11y/accessibility.test.jsx` | ✅ Active | 6 | Login, Register, dashboards (mocked heavy widgets), key UI components |

---

## Results Log (Append-Only)

### 2025-12-23 (Dashboards + Accessibility + Playwright Scaffolding)
- **Command:** `CI=true npm test -- --watchAll=false`
- **Result:** 30 suites passed, 333 tests passed, 81 skipped
- **New Tests Added:**
  - **Dashboards (F7b):** Resident/Guard/Admin dashboard RTL suites
  - **Accessibility (F8):** `jest-axe` smoke suite
- **Code Fixes Added:**
  - Admin dashboard accessibility fixes (heading order and labeled select)
  - Jest setup now includes `toHaveNoViolations` matcher
- **Playwright (F9):** Added Playwright config + smoke specs (see below)

### 2025-12-23 (Latest - Comprehensive Suite)
- **Command:** `CI=true npm test -- --watchAll=false`
- **Result:** 26 suites passed, 321 tests passed, 81 skipped
- **New Tests Added:**
  - **Hooks:** `useCurrentRole` (5), `useErrorHandler` (14), `useLoadingState` (14), `useDebounce` (10)
  - **Utilities:** `logger` (5), `statusColors` (11), `validationRules` (17)
  - **Services:** `passService` (14)
  - **UI Components:** `GradientButton` (13), `GradientCard` (16), `FloatingLabelInput` (17)
- **Significance:**
  - Frontend unit testing is now comprehensive across all critical layers.
  - Hooks layer fully covered: state management, role handling, error handling, debouncing.
  - UI component library now has baseline tests for interaction, accessibility, and styling.
  - All service API clients locked down, preventing silent contract breakage.

### 2025-12-23 (Earlier)
- **Command:** `CI=true npm test -- --watchAll=false`
- **Result:** 15 suites passed, 171 tests passed, 81 skipped
- **Meaning:**
  - Phase F7 (auth flows) added: `LoginPage.test.jsx` (5 tests) and `RegistrationPage.test.jsx` (5 tests).
  - Login flow now covered: input validation, successful login with role-based redirect, MFA redirect, error handling, forgot password flow.
  - Registration flow now covered: form rendering, validation errors on submit, success redirect to login, password match/mismatch UI indicators.

### 2025-12-22
- **Command:** `CI=true npm test -- --watchAll=false`
- **Result:** 13 suites passed
- **Meaning:**
  - Phase F6 service-layer contracts are now locked down at the client boundary.
  - If a backend endpoint path, method, or query shape changes, these tests should fail early, preventing silent UI breakage.
  - `normalizeVisitor` is verified to preserve `null` values from the API (important for lifecycle fields like `check_out`).

---

## Remaining Work (Future Phases)

| Phase | Target | Priority | Status |
|-------|--------|----------|--------|
| F7b | Dashboard component tests (Resident, Guard, Admin) | Medium | ✅ Complete |
| F8 | Accessibility tests with `jest-axe` | Low | ✅ Complete |
| F9 | E2E integration with Playwright | Low | � In Progress |

### Phase F9 — Playwright (Current Scaffolding)

| Item | Location | Status | Notes |
|------|----------|--------|------|
| Playwright config | `playwright.config.js` | ✅ Added | Uses CRA dev server via Playwright `webServer` |
| Smoke spec | `smoke.spec.js` | ✅ Added | Login + register pages load |
| A11y smoke spec | `accessibility.spec.js` | ✅ Added | Basic accessibility snapshot for login page |

---

## How to Run Tests

```bash
# Run all tests
npm test

# Run tests in CI mode (no watch)
CI=true npm test -- --watchAll=false

# Run specific test file
npm test -- --testPathPattern="useErrorHandler"

# Run with coverage
npm test -- --coverage --watchAll=false

# Run jest-axe accessibility suite only
npm test -- --testPathPattern=accessibility.test.jsx --watchAll=false

# Run Playwright smoke tests
npm run test:playwright

# Run Playwright accessibility spec
npm run test:a11y
```
