# Secure Gate Frontend Analysis
**Date:** 2026-03-09
**Scope:** React Frontend (`secure-gate-access/client/src/`)
**Method:** Role-by-role, operational criticality order (guard → resident → public visitor → admin → cross-cutting)
**Legend:** `[MISSING]` `[STUBBED]` `[DISCONNECTED]` `[REMOVED]` `[BACKEND-DEP]`

---

## Section 1: System Overview

### 1.1 Frontend Architecture Summary

#### Provider/Context Stack (Outermost → Innermost)

| Order | Provider | Purpose | Key Dependency |
|-------|----------|---------|----------------|
| 1 | **ErrorProvider** | Global error capture and management | None — outermost layer |
| 2 | **QueryClientProvider** | TanStack React Query (staleTime: 30s, gcTime: 5min, retry: 2) | ErrorProvider |
| 3 | **AuthProvider** | Authentication state, JWT/httpOnly cookie management, token refresh | QueryClientProvider |
| 4 | **ThemeProvider** | Dark/light theme, CSS variables | AuthProvider |
| 5 | **PreferenceProvider** | User preferences (locale, layout, notifications) | AuthProvider |
| 6 | **AccessibilityProvider** | WCAG 2.1 AA — screen reader, high-contrast | PreferenceProvider |
| 7 | **BrowserCompatibilityProvider** | Feature detection, polyfills, browser warnings | AccessibilityProvider |
| 8 | **LoadingProvider** | Global loading states, progress tracking | BrowserCompatibilityProvider |
| 9 | **ToastProvider** | Toast notifications (max 4 visible, top-right) | LoadingProvider |
| 10 | **UndoProvider** | Global undo/redo (max history: 10) | ToastProvider |
| 11 | **SearchProvider** | Global search context and state | UndoProvider |
| 12 | **Router (React Router v6)** | Client-side routing with v7 future flags | SearchProvider |
| 13 | **AppNavigationBridge** | Navigation side-effects bridge | Router |
| 14 | **AuthNavigationBridge** | Auth-triggered navigation (login redirects, estate) | Router |
| 15 | **NavigationProvider** | Breadcrumbs, page title, history | Router |

**Critical design note:** ErrorProvider is outermost to catch all child crashes. ThemeProvider is early to prevent flash of unstyled content. AuthStateMachine (`utils/authStateMachine.js`) is NOT a React context — it is a standalone FSM subscribed by AuthContext and apiClient.

#### Layout System

All authenticated routes use **AppShell** (`layouts/AppShell.jsx`):
- `<Sidebar>` — Role-based nav links
- `<Topbar>` — Page title, logout, breadcrumbs, menu toggle
- `<BottomNav>` — Mobile-only bottom navigation
- `<FAB>` — Role-specific floating action button
- `<PanicButton>` — Emergency alert (resident/guard)
- `<SkipLink>` — Keyboard a11y, directs to `#main-content`

Role-specific layout files exist (`AuthLayout.jsx`, `GuardLayout.jsx`, `ResidentLayout.jsx`, `AdminLayout.jsx`) but are **not used** in current routing — all routes wrap manually: `<ProtectedRoute><AppShell role="..."><Page /></AppShell></ProtectedRoute>`. Planned refactor to layout routes noted in App.js line 247.

#### Code-Splitting Strategy
All 68+ page/feature components are lazy-loaded via `React.lazy()`. All routes are wrapped in a single `<Suspense fallback={<Loading />}>` boundary.

#### Key Global Components in App.js

| Component | Purpose | Scope |
|-----------|---------|-------|
| PWAManager | PWA lifecycle, install prompt, service worker | Wraps entire app |
| GlobalStyles + SkipLink | CSS variables, design system, a11y | Always active |
| GlobalKeyboardShortcuts | Ctrl+K/H/L/B shortcuts | All authenticated |
| SessionTimeoutWarning | Auto-logout countdown | All roles |
| OfflineRetryBanner | Network status | Always active |
| RateLimitIndicator | Rate-limit visual feedback (threshold: 15) | Bottom-right |
| ErrorBoundary (level="page") | Page-level render error catch | Around all routes |
| NetworkErrorBoundary | Network-specific errors | Inside ErrorBoundary |
| AuthErrorBoundary | 401/403/MFA errors → redirects | Inside NetworkErrorBoundary |
| Suspense | Code-split loading state | Around routes |
| ToastContainer | Toast notification queue | Global |
| ErrorQueue | Aggregated error display | Global |
| BrowserCompatibilityWarning | Old browser warnings | Dismissible |
| CookieConsentBanner | GDPR/KDPA cookie consent | Always active |

---

### 1.2 Full Route Tree

**Total routes: ~76** (including redirects/aliases)

#### Public Routes (no auth)

| Path | Component | Notes |
|------|-----------|-------|
| `/` | → `/login` | Redirect |
| `/login` | LoginPage | Email/password + MFA handling |
| `/forgot-password` | LoginPage | Same component, password reset logic |
| `/register` | RegistrationPage | Self-registration |
| `/register/:inviteCode` | RegistrationPage | Invite-based registration |
| `/bulk-register/:inviteCode` | RegistrationPage | Bulk resident invite registration |
| `/privacy-policy` | PrivacyPolicy | Static |
| `/terms-of-service` | TermsOfService | Static |
| `/estate-required` | EstateRequired | Missing estate assignment |
| `/estate-selection` | EstateSelection | Select estate before dashboard |
| `/mfa/verify` | MFAVerify | Post-login MFA code entry |
| `/invite/:inviteCode` | GuestInvite | Guest visitor invite acceptance |
| `/v/:token` | VisitorInvitePage | Tokenized visitor invite |
| `*` | → `/login` | Catch-all redirect |

#### Resident Routes (`allowedRoles: ['resident']`)

| Path | Component | Notes |
|------|-----------|-------|
| `/dashboard/resident` | ResidentDashboard | Live stats, quick actions |
| `/resident/visitor-history` | VisitorHistory | Past visitor records |
| `/resident/bulk-invite` | BulkInvite | CSV upload, batch invite |
| `/resident/bulk-invite-wizard` | BulkInviteWizard | Step-by-step (Phase 2.3) |
| `/resident/settings` | Settings | Notifications, prefs |
| `/resident/favorite-visitors` | FavoriteVisitors | Saved guests (Phase 2.3) |
| `/resident/favorites` | FavoriteVisitors | Alias |
| `/resident/deliveries` | DeliveryList | Delivery tracking |
| `/resident/quick-invite` | QuickInvite | One-off pass creation |
| `/resident/recurring-passes` | RecurringPasses | Recurring passes (P4) |
| `/resident/rideshare` | RideshareEntry | Rideshare driver passes (P4) |
| `/resident/approvals` | ResidentApprovalsPanel | Walk-in approvals (Phase 3) |
| `/resident/auto-approval` | AutoApprovalRules | Auto-approve rules (Phase 2.2) |
| `/resident/privacy` | PrivacyDashboard | GDPR data requests |

#### Guard Routes (`allowedRoles: ['guard']`)

| Path | Component | Notes |
|------|-----------|-------|
| `/dashboard/guard` | GuardDashboard | Real-time visitor board |
| `/dashboard/guard/manual-check` | ManualCheck | Manual visitor lookup |
| `/dashboard/guard/scan-qr` | ScanQR | QR code scanner |
| `/dashboard/guard/visitor-history` | GuardVisitorHistory | Guard check-in log |
| `/dashboard/guard/settings` | GuardSettings | MFA, notifications |
| `/dashboard/guard/walk-in` | WalkInRegistration | Spontaneous visitor |
| `/dashboard/guard/incidents` | IncidentList | Security incidents |
| `/dashboard/guard/shift-handover` | ShiftHandover | Shift end handover (Phase 3) |
| `/dashboard/guard/activity-log` | ActivityLog | Activity audit (Phase 3) |
| `/dashboard/guard/bulk-checkout` | BulkCheckout | Bulk checkout / EOD (Phase 3) |
| `/dashboard/guard/help/mfa-setup` | MFASetupGuide | In-app MFA documentation |

#### Admin / Super Admin Routes

| Path | Component | Roles | Notes |
|------|-----------|-------|-------|
| `/dashboard/admin/:tab?` | AdminDashboard | admin, super_admin | Tabbed (overview/approvals/guards/residents/visitors/reports/settings) |
| `/dashboard/admin/approvals` | AdminDashboard (tab) | admin, super_admin | Approval queue |
| `/dashboard/admin/guards` | AdminDashboard (tab) | admin, super_admin | Guard management |
| `/dashboard/admin/residents` | AdminDashboard (tab) | admin, super_admin | Resident management |
| `/dashboard/admin/visitors` | AdminDashboard (tab) | admin, super_admin | Visitor log |
| `/dashboard/admin/reports` | AdminDashboard (tab) | admin, super_admin | Analytics, exports |
| `/dashboard/admin/settings` | AdminDashboard (tab) | admin, super_admin | System config |
| `/dashboard/admin/users` | → `/dashboard/admin/approvals` | admin, super_admin | Redirect |
| `/dashboard/admin/help/security` | MFASetupGuide | admin, super_admin | Security help |
| `/dashboard/super-admin` | SuperAdminDashboard | super_admin only | Multi-estate admin |
| `/admin/bulk-operations` | BulkOperationsPanel | admin, super_admin | Bulk actions |
| `/admin/search` | AdvancedSearchPanel | admin, super_admin | Advanced search |
| `/admin/export` | DataExportPanel | admin, super_admin | Data export |

#### MFA & Privacy (Multi-role)

| Path | Component | Roles | Notes |
|------|-----------|-------|-------|
| `/mfa/setup` | MFASetup | resident, guard, admin | TOTP + backup codes |
| `/privacy` | PrivacyDashboard | resident, guard, admin | GDPR/KDPA |
| `/privacy/settings` | PrivacySettings | resident, guard, admin | Privacy preferences |

#### Feature / Cross-Role Routes

| Path | Component | Roles | Notes |
|------|-----------|-------|-------|
| `/pwa/settings` | PWASettings | resident, guard, admin | PWA install + sync config |
| `/offline/visitors` | OfflineVisitorList | resident, guard, admin | Cached visitors |
| `/notifications/analytics` | NotificationAnalyticsDashboard | resident, guard, admin | Notification stats |
| `/notifications/history` | NotificationHistory | resident, guard, admin | Notification log |
| `/dashboard/customize` | DashboardFoundation | all roles | Widget customization |
| `/settings/preferences` | PreferencePanel | all roles | Global preferences |
| `/collaboration/messaging` | CollaborationMessaging | all roles | Messaging system |
| `/collaboration/handoffs` | WorkflowHandoffs | guard, admin, super_admin | Handover workflows |
| `/collaboration/approvals` | ApprovalWorkflows | all roles | Approval workflows |

#### [REMOVED] Routes (commented out or explicitly removed from App.js)

| Route | Component | Reason |
|-------|-----------|--------|
| `/resident/generate-pass` | GeneratePass | `[REMOVED]` — Replaced by QuickInvite |
| `/dev/messages` | MessageViewer | `[REMOVED]` — Dev tool, file missing |
| `/dashboard/admin/notifications` | NotificationPreferences | `[REMOVED]` — File missing |
| `/dashboard/admin/activity` | ActivityDashboard | `[REMOVED]` — File missing |
| `/kiosk` | SelfCheckInKiosk | `[REMOVED]` — File missing, CSS exists |
| `/dashboard/guard/analytics` | GuardAnalytics | `[REMOVED]` — Guards not needing analytics |

---

### 1.3 Context Layer Inventory

| Context | Provider File | Key State / Methods | Primary Consumers |
|---------|---------------|---------------------|-------------------|
| AuthContext | `contexts/AuthContext.js` | `user`, `loading`, `isAuthenticated`, `login()`, `logout()`, `register()`, `completeMfa()`, `verifyPassword()`, `hasRole()`, `authState` | ProtectedRoute, AppShell, LoginPage, MFAVerify |
| ErrorContext | `contexts/ErrorContext.jsx` | `errors[]`, `addError()`, `removeError()`, `clearErrors()`, `hasError()` | ErrorBoundary, ErrorQueue |
| NavigationContext | `contexts/NavigationContext.jsx` | `pageTitle`, `breadcrumbs[]`, `goBack()`, `navigate()`, `updateBreadcrumbs()` | AppShell, Topbar, pages |
| LoadingContext | `contexts/LoadingContext.jsx` | `isLoading`, `message`, `progress`, `setLoading()`, `clearLoading()` | Global loading states |
| SearchContext | `contexts/SearchContext.jsx` | `searchTerm`, `filters`, `results[]`, `updateSearch()`, `clearSearch()` | Search bars, filter panels |
| BrowserCompatibilityContext | `contexts/BrowserCompatibilityContext.jsx` | `supportedFeatures{}`, `warnings[]`, `checkFeature()` | BrowserCompatibilityWarning |
| ThemeContext | `contexts/ThemeContext.jsx` | `theme` ('light'/'dark'), `toggleTheme()` | GlobalStyles, theme toggle |
| PreferenceContext | `contexts/PreferenceContext.jsx` | `preferences{}` (locale, layout, notifications), `updatePreference()` | Settings pages, PreferencePanel |
| ToastContext | `contexts/ToastContext.jsx` | `toasts[]`, `addToast()`, `removeToast()` | ToastContainer, all pages |
| UndoContext | `contexts/UndoContext.jsx` | `undoStack[]`, `redoStack[]`, `undo()`, `redo()`, `recordAction()` | Form components, editors |
| AccessibilityContext | `components/accessibility/AccessibilityProvider.jsx` | `a11ySettings{}`, `toggleSetting()` | GlobalStyles, forms |
| NotificationContext | `contexts/NotificationContext.jsx` | `notifications[]`, `unread`, `addNotification()`, `markRead()` | NotificationBell, NotificationHistory |
| AuthStateMachine | `utils/authStateMachine.js` *(not a context)* | `status` (UNKNOWN/AUTHENTICATED/UNAUTHENTICATED/ESTATE_REQUIRED/REFRESHING), `transition()`, `subscribe()` | AuthContext, apiClient |

---

### 1.4 Service Layer Map

| Service File | API Base Path | Key Methods | Status |
|---|---|---|---|
| `_http.js` | — | `buildHeaders()`, `parseApiResponse()`, `apiCall()` | COMPLETE |
| `api.js` | — | Re-exports http.js | COMPLETE |
| `http.js` | — | `http.get/post/put/patch/delete()` | COMPLETE |
| `visitorService.js` | `/api/visitors` | `getVisitors()`, `createVisitor()`, `updateVisitor()`, `deleteVisitor()`, `checkIn()`, `checkOut()`, `bulkInvite()`, `verifyOtp()`, `getPublicInvite()` | COMPLETE |
| `passService.js` | `/api/passes` | `createPass()`, `getPass()`, `updatePass()`, `revokePass()`, `listPasses()` | COMPLETE |
| `deliveryService.js` | `/api/deliveries` | `getDeliveries()`, `createDelivery()`, `updateDelivery()`, `deleteDelivery()` | COMPLETE |
| `autoApprovalService.js` | `/api/auto-approval` | `getRules()`, `createRule()`, `updateRule()`, `deleteRule()`, `evaluateApproval()` | COMPLETE |
| `recurringPassService.js` | `/api/recurring-passes` | `getRecurring()`, `createRecurring()`, `updateRecurring()`, `cancelRecurring()` | COMPLETE |
| `rideshareService.js` | `/api/rideshare` | `registerRideshare()`, `getEntries()`, `updateEntry()` | COMPLETE |
| `guardService.js` | `/api/guards` | `getGuards()`, `createGuard()`, `updateGuard()`, `assignGuard()`, `getShifts()` | COMPLETE |
| `adminService.js` | `/api/admin` | `getDashboardStats()`, `getApprovals()`, `approveUser()`, `rejectUser()`, `getReports()`, `getMetrics()`, `getNotificationQueueStats()`, `getHealthDetails()` | COMPLETE |
| `notificationService.js` | `/api/notifications` | `getNotifications()`, `markRead()`, `markAllRead()`, `deleteNotification()` | COMPLETE |
| `pushNotificationService.js` | `/api/push` | `subscribe()`, `unsubscribe()`, `sendPush()`, `getPushStatus()` | COMPLETE |
| `announcementsService.js` | `/api/announcements` | `getAnnouncements()`, `createAnnouncement()`, `updateAnnouncement()` | COMPLETE |
| `collaborationService.js` | `/api/collaboration` | `getMessages()`, `sendMessage()`, `getConflicts()`, `escalateConflict()`, `getApprovals()`, `processApproval()` | COMPLETE |
| `searchService.js` | `/api/search` | `search()`, `getSearchFilters()`, `saveSearch()`, `getHistory()` | COMPLETE |
| `exportService.js` | `/api/export` | `exportData()`, `scheduleExport()`, `getExports()` | COMPLETE |
| `preferenceService.js` | `/api/preferences` | `getPreferences()`, `updatePreference()`, `resetPreferences()` | COMPLETE |
| `privacyService.js` | `/api/privacy` | `getPrivacySettings()`, `updateSettings()`, `requestDataExport()`, `requestDeletion()` | COMPLETE |
| `securityService.js` | `/api/security` | `getSecurityLog()`, `updateMFA()`, `verifySession()` | COMPLETE |
| `offlineService.js` | — | `cacheData()`, `getCachedData()`, `syncWhenOnline()`, `getCacheStatus()` | COMPLETE |
| `syncService.js` | — | `syncQueue()`, `addToQueue()`, `getQueueStatus()` | COMPLETE |
| `backgroundSyncService.js` | — | `registerSync()`, `unregisterSync()`, `getSyncTasks()` | COMPLETE |
| `performanceService.js` | — | `measureMetric()`, `recordTrace()`, `flushMetrics()` | COMPLETE |
| `intelligentCacheService.js` | — | `cache()`, `retrieve()`, `invalidate()`, `prefetch()` | COMPLETE |
| `intelligentNotificationService.js` | — | `shouldNotify()`, `coalesce()`, `defer()`, `schedule()` | COMPLETE |
| `systemHealthService.js` | `/api/system/health` | `getHealth()`, `checkComponents()`, `getDiagnostics()` | COMPLETE |
| `maintenanceNotificationManager.js` | `/api/maintenance` | `getMaintenanceWindows()`, `scheduleNotification()` | COMPLETE |
| `errorManagementService.js` | `/api/errors` | `reportError()`, `getErrorStats()`, `dismissAlert()` | COMPLETE |
| `errorQueueService.js` | — | `enqueue()`, `dequeue()`, `getQueue()`, `flush()` | COMPLETE |
| `scheduledReportService.js` | `/api/reports` | `createSchedule()`, `getSchedules()`, `executeReport()` | COMPLETE |
| `userFeedbackService.js` | `/api/feedback` | `submitFeedback()`, `getFeedback()`, `rateFeature()` | COMPLETE |
| `tourService.js` | `/api/tours` | `getTours()`, `startTour()`, `skipTour()`, `recordTourCompletion()` | COMPLETE |
| `connectivityHandler.js` | — | `onOnline()`, `onOffline()`, `getStatus()`, `subscribe()` | COMPLETE |
| `emergencyService.js` | `/api/emergency` | `triggerEmergency()`, `acknowledgeEmergency()`, `getEmergencyStatus()` | COMPLETE |

**Total: 35 service files. All appear fully implemented.**

---

### 1.5 Technology Integration Map

#### Socket.io (Real-Time)
- **Status:** FULLY WIRED
- **Hook:** `hooks/useWebSocket.js` — socket pool (key: `${url}::${token||'cookie-auth'}`), reconnect (5 attempts, 1–5s backoff), `withCredentials: true`
- **Transports:** WebSocket with polling fallback
- **Event map:** `visitor.check_in`, `visitor.check_out`, `visitor.invited`, `stats.update`, `security.alert`, `emergency:triggered/acknowledged/resolved`, `notification`, `dashboard:update`
- **Specialized hooks:** `useVisitorEvents()`, `useResidentVisitorEvents()`, `useNotifications()`, `useSecurityAlerts()`
- **Dev proxy:** `setupProxy.js` proxies `/socket.io` → `localhost:3001` with WebSocket upgrade
- **Gap:** No explicit namespace scoping in frontend; backend enforces it

#### TanStack React Query v5
- **Status:** FULLY WIRED
- **Config:** staleTime 30s, gcTime 5min, retry 2, refetchOnWindowFocus/Reconnect true
- **Usage:** `useQuery()` for fetching, `useMutation()` + `invalidateQueries()` for writes
- **Gap:** No React Query DevTools in dev; no offline persister configured

#### PWA / Service Worker
- **Status:** FULLY WIRED
- **Init:** `PWAManager.jsx` wraps entire app
- **Services:** `offlineService.js`, `syncService.js`, `backgroundSyncService.js`, `connectivityHandler.js`
- **Routes:** `/pwa/settings`, `/offline/visitors`
- **Gap:** Service worker file likely in `public/` (not reviewed); offline route coverage is limited (only visitor list)

#### Sentry
- **Status:** WIRED (conditionally via DSN env var)
- **Init:** `services/monitoring/sentry.js` — BrowserTracing, Breadcrumbs integrations, 10% sample rate
- **Integration:** ErrorBoundary.jsx calls `captureException()` on componentDidCatch
- **Gap:** Not confirmed initialized in App.js or index.js entry point; optional if no DSN

#### CSRF Protection
- **Status:** FULLY WIRED
- **Flow:** `refreshCSRFToken()` → GET `/api/auth/csrf-token` → stores in `<meta name="csrf-token">` → Axios interceptor adds `X-CSRF-Token` header → auto-refresh on 403 CSRF_VALIDATION_FAILED
- **Dev:** Disabled unless `ENABLE_CSRF=true`
- **Gap:** No explicit CSRF token rotation on logout

#### Internationalization (i18n)
- **Status:** `[UNKNOWN]` — `client/src/i18n/` directory exists but not reviewed
- **Gap:** No i18n provider detected in RootProvider.jsx; PreferenceContext.locale field may handle language selection independently

#### Accessibility (WCAG 2.1 AA)
- **Status:** FULLY WIRED
- **Layers:** AccessibilityProvider, `styles/accessibility.css`, GlobalKeyboardShortcuts, SkipLink, focus management, ARIA live regions
- **Hooks:** `useAccessibility()`, `useModalAccessibility()`, `useResponsive()`
- **Gap:** No automated axe-core runtime audit detected in app (only in E2E tests)

#### Compliance (GDPR / Kenya DPA)
- **Status:** FULLY WIRED
- **Features:** CookieConsentBanner (App.js), PrivacyDashboard, PrivacySettings, `/privacy`, `/privacy/settings`, `privacyService.js` (data export/deletion)
- **Gap:** Consent banner implementation depth not confirmed; deletion confirmation workflow not reviewed

#### Build & Bundling
- **Status:** COMPLETE (standard CRA)
- **Dev:** `npm start` → port 3000, proxies `/api` and `/socket.io` to `localhost:3001`
- **Production:** `npm run build` or `build:fast` (no sourcemaps, CI=true)
- **Code split:** 68+ lazy imports
- **Polyfills:** `polyfills/index.js` on app load
- **Gap:** Webpack config hidden by CRA; no explicit bundle size budget configured

---

*End of Section 1*

---

## Section 2: Guard Role

### 2.1 Route Inventory

| Path | Component file | Auth check | Key state loaded | Notes |
|------|----------------|------------|-----------------|-------|
| `/dashboard/guard` | GuardDashboard.jsx | Yes | Active visitors, KPIs, alerts | Real-time SSE updates |
| `/dashboard/guard/scan-qr` | ScanQR.jsx | Yes | Pending offline check-ins | Camera permission required; offline support |
| `/dashboard/guard/manual-check` | ManualCheck.jsx | Yes | Search results, visitor status | OTP verification support |
| `/dashboard/guard/walk-in` | WalkInRegistration.jsx | Yes | Registered visitor, pending approvals | Approval request flow, offline queueing |
| `/dashboard/guard/incidents` | IncidentList.jsx | Yes | Incident list with filters | Resolution modal, permission-based actions |
| `/dashboard/guard/shift-handover` | ShiftHandover.jsx | Yes | Current shift, incoming notes | Shift lifecycle management |
| `/dashboard/guard/activity-log` | ActivityLog.jsx | Yes | Activity history (7-day window) | CSV export, multiple filter types |
| `/dashboard/guard/bulk-checkout` | BulkCheckout.jsx | Yes (+MFA for 5+) | Active visitors, overdue counts | EOD workflow, selection state |
| `/dashboard/guard/visitor-history` | VisitorHistory.jsx | Yes | Historical visitor records | Read-only history view |
| `/dashboard/guard/settings` | Settings.jsx | Yes | Profile, MFA status, theme | Tab-based UI with URL sync |
| `/dashboard/guard/help/mfa-setup` | MFASetupGuide.jsx | Yes | [None — static guide] | Informational only |

### 2.2 Service Bindings

**GuardDashboard:**
- `fetchActive()` → `GET /api/visitors/active` — loads active visitors
- `onCheckIn()` → `POST /api/visitors/{id}/check-in` — check-in action
- `onCheckOut()` → `POST /api/visitors/{id}/check-out` — check-out action
- `onRevoke()` → `POST /api/visitors/{id}/revoke` — revoke access
- SSE EventSource → `GET /api/ws/guards` — real-time visitor updates

**ScanQR:**
- `processOnlineCheckIn()` → `POST /api/qr/checkin` (token) or `POST /api/visitors/{id}/check-in` (legacy)
- `offlineService.validateQRCodeOffline()` — LocalStorage-based validation (offline mode)
- `offlineService.queueOfflineCheckIn()` — IndexedDB queue (offline mode)
- `offlineService.syncPendingOperations()` — batch sync when online

**ManualCheck:**
- `handleSearch()` → `GET /api/visitors` — fetch all, filter client-side
- `verifyOtp()` → `POST /api/visitors/{id}/verify-otp` — OTP verification
- `handleCheckIn()` → `POST /api/visitors/{id}/check-in`
- `handleCheckOut()` → `POST /api/visitors/{id}/check-out`
- IncidentModal → `POST /api/guard/incidents` — report incident

**WalkInRegistration:**
- `registerOnline()` → `POST /api/visitors/walk-in`
- `registerOffline()` → `offlineService.queueWalkInRegistration()` — offline queue
- `handleRequestApproval()` → `POST /api/visitors/{id}/request-approval`
- `offlineService.syncPendingOperations()` — sync when online

**IncidentList:**
- `fetchIncidents()` → `GET /api/guard/incidents?{filters}`
- ResolveIncidentModal → `POST /api/guard/incidents/{id}/resolve`

**ShiftHandover:**
- `fetchShiftData()` → `GET /api/guards/shifts?start_date=...`
- `fetchShiftData()` → `GET /api/guards/handover/{shiftId}`
- `handleSubmitHandover()` → `POST /api/guards/handover`
- `handleEndShift()` → `POST /api/guards/shifts/{id}/end`

**ActivityLog:**
- `fetchActivities()` → `GET /api/visitors/history?start_date=...`
- `fetchActivities()` → `GET /api/guards/shifts?start_date=...`
- CSV export — client-side from `filteredActivities` (no API call)

**BulkCheckout:**
- `fetchActiveVisitors()` → `GET /api/visitors/active`
- `handleBulkCheckout()` → `POST /api/visitors/{id}/check-out` (loop per visitor)
- `handleEODCheckout()` → `POST /api/visitors/{id}/check-out` (loop, all remaining)
- MFAVerificationModal — triggered when selecting 5+ visitors

**PanicButton (all guard pages):**
- `triggerPanicButton()` → `POST /api/emergency/panic` (with optional GPS coords)
- `handleCancelPanic()` → `POST /api/emergency/{id}/cancel`
- `getActiveEmergencies()` → `GET /api/emergency/active`

### 2.3 User Journey Traces

**Journey G1: QR Code Scan Check-in**
1. Guard opens ScanQR page → clicks "Start Camera" → camera permission requested
2. Guard scans visitor QR → `handleScan(data)` triggered
3. **Online:** `processOnlineCheckIn()` → `POST /api/qr/checkin` with token (or legacy `/check-in`)
4. **Offline:** `processOfflineCheckIn()` validates against local cache → `offlineService.queueOfflineCheckIn()`
5. Result card: Access Granted / OTP required / Expired / Invalid → guard acts accordingly
6. Guard can "Scan Another" or return to dashboard

**Journey G2: Manual Visitor Check-in**
1. Guard opens ManualCheck → enters search term (name / phone / invite code / 6-digit OTP)
2. `handleSearch()` → `GET /api/visitors` — full list fetched, filtered client-side
3. **OTP path:** Loop through PENDING visitors, call `verifyOtp()` until match
4. Results shown as cards; guard clicks "Check In" → `POST /api/visitors/{id}/check-in`
5. Success: status updated locally, notification shown
6. Optional: guard clicks "Report" → IncidentModal opens

**Journey G3: Walk-in Registration**
1. Guard opens WalkInRegistration → fills: name, phone, house number, purpose, vehicle plate
2. **Online:** `registerOnline()` → `POST /api/visitors/walk-in`
3. **Offline fallback:** `registerOffline()` → locally queued, pending badge shown
4. Registration success → ApprovalStatusCard shown
5. Guard clicks "Request Approval" → `POST /api/visitors/{id}/request-approval`
6. Real-time or polling waits for resident response
7. Guard can "Register Another" or return to dashboard

**Journey G4: Incident Reporting**
1. Incident triggered from GuardDashboard (PanicButton/manual) or ManualCheck (Report button)
2. IncidentModal opens: category, severity, description, optional visitor link
3. Submit → `POST /api/guard/incidents`
4. Later: guard opens IncidentList → filters incidents → selects unresolved
5. ResolveIncidentModal → resolution notes → `POST /api/guard/incidents/{id}/resolve`

**Journey G5: Shift Handover**
1. Guard opens ShiftHandover → loads today's shift + incoming handover notes
2. If incoming notes present: card shown, guard can "Acknowledge"
3. Guard fills handover form: recipient guard, notes, incident summary, equipment status
4. Submit → `POST /api/guards/handover`
5. Optional: "End Shift" (with confirmation) → `POST /api/guards/shifts/{id}/end` → redirect to dashboard

**Journey G6: Bulk Checkout / EOD**
1. Guard opens BulkCheckout → `GET /api/visitors/active` → list shown with durations
2. Overdue visitors (8h+) highlighted
3. Guard selects visitors (checkbox / "Select All")
4. If 5+ selected: MFAVerificationModal required
5. "Checkout (N)" → loop `POST /api/visitors/{id}/check-out` → results card (success/fail counts)
6. "EOD" button → EOD Confirmation Modal → optional notes → checkout all remaining

**Journey G7: Emergency Panic Button**
1. Guard presses red PanicButton (visible on all guard pages)
2. Confirmation modal: privacy notice + "SEND ALERT" button
3. Confirm → GPS captured (optional) → `POST /api/emergency/panic`
4. Triggered overlay: "Help is on the way", 30-second cancel countdown
5. Cancel within window: `POST /api/emergency/{id}/cancel` → overlay clears
6. After 30s: "Cancel window expired"
7. **Admin/other guards:** EmergencyAlertBanner appears; "I'm Responding" → `acknowledgeEmergency()`; "Resolve" (admin) → `resolveEmergency()`

### 2.4 Real-Time Integration

| Event name | Component | UI reaction |
|------------|-----------|-------------|
| `visitor.check_in` | GuardDashboard (SSE) | Toast + visitor list refresh |
| `visitor.check_out` | GuardDashboard (SSE) | Toast + visitor list refresh |
| `visitor.revoked` | GuardDashboard (SSE) | Toast + visitor removed |
| `visitor.self_check_in` | GuardDashboard (SSE) | Toast notification |
| `emergency:triggered` | EmergencyAlertBanner (WebSocket) | Alert banner appears |
| `emergency:acknowledged` | EmergencyAlertBanner (WebSocket) | Acknowledgement indicator added |
| `emergency:resolved` | EmergencyAlertBanner (WebSocket) | Success toast, banner disappears |
| `emergency:cancelled` | EmergencyAlertBanner (WebSocket) | Emergency removed from display |

**Note:** GuardDashboard uses SSE (`/api/ws/guards`) for unidirectional visitor updates; EmergencyAlertBanner uses WebSocket for bidirectional emergency coordination. Both have 10–30s polling fallbacks.

### 2.5 Guard-Specific Components

| Component | Description | Status |
|-----------|-------------|--------|
| DashboardKPIs.jsx | 4 KPI cards (on-premise/arriving/pending/denied) with 30s refresh | Fully implemented |
| PanicButton.jsx | Emergency button with confirmation modal, 30s cancel window, state machine (idle/confirming/triggering/triggered/error/acknowledged/resolved) | Fully implemented |
| EmergencyAlertBanner.jsx | Active emergency banner, guard name/time/location, acknowledge/resolve actions, 10s polling + WebSocket | Fully implemented |
| IncidentModal.jsx | Incident report form (category, severity, description, visitor link) | Fully implemented |
| MFAVerificationModal.jsx | TOTP input overlay for sensitive operations (bulk checkout 5+) | Fully implemented |
| PanicHistory.jsx | Guard's own emergency history (privacy-scoped) | Fully implemented |
| VisitorDetailsModal.jsx | Full visitor profile modal with check-in/out/verify/deny actions | Fully implemented |
| RecentVisitors.jsx | 5 most-recent visitors quick-lookup card | Fully implemented |
| ApprovalStatusCard.jsx | Walk-in approval state display with "Request Approval" button | Fully implemented |
| ResolveIncidentModal.jsx | Resolution notes form, `POST /api/guard/incidents/{id}/resolve` | Fully implemented |
| PendingApprovalsQueue.jsx | Pending walk-in approval queue card | Partially implemented |
| PendingDeliveries.jsx | Pending deliveries card (Phase 2.1) | Partially implemented |
| QuickFilters.jsx | Dashboard filter toggles (Phase G3) | Stub |
| RecurringPassValidator.jsx | Recurring pass validator (phase future) | Stub — never rendered |
| RegisterDelivery.jsx | Delivery registration form (Phase 2.1) | Partially implemented |

### 2.6 Gap Flags

| Type | Component/File | Description | Severity |
|------|----------------|-------------|----------|
| `[MISSING]` | GuardAnalytics.jsx | Route removed, file empty (0 bytes) — remove route or implement | Critical |
| `[BACKEND-DEP]` | ShiftHandover.jsx | `/api/guards/shifts` and `/api/guards/handover` endpoints — backend status unconfirmed | High |
| `[BACKEND-DEP]` | WalkInRegistration.jsx | `POST /api/visitors/{id}/request-approval` — backend implementation status unclear | High |
| `[BACKEND-DEP]` | ActivityLog.jsx | Data format from `/api/visitors/history` + `/api/guards/shifts` may not match activity-log shape | High |
| `[BACKEND-DEP]` | BulkCheckout.jsx | Sequential loop checkout — no bulk endpoint; N visitors = N API calls (performance risk) | High |
| `[STUBBED]` | QuickFilters.jsx | Imported in GuardDashboard but minimal implementation — Phase G3 incomplete | Medium |
| `[STUBBED]` | PendingApprovalsQueue.jsx | Placeholder card; data loading logic not confirmed | Medium |
| `[BACKEND-DEP]` | ManualCheck.jsx | OTP search loops through all visitors client-side — does not scale; needs dedicated search endpoint | Medium |
| `[BACKEND-DEP]` | IncidentList.jsx | Filter query params (`fromDate/toDate`) may not match backend param names | Medium |
| `[DISCONNECTED]` | MFASetupGuide.jsx | Not linked in main guard navigation; only reachable via URL or dashboard alert link | Low |
| `[STUBBED]` | RecurringPassValidator.jsx | Imported but never rendered | Low |

### 2.7 Production Readiness Assessment — Guard Role

| Area | Status | Key Finding |
|------|--------|-------------|
| Error handling | Partial | Global error context used well; SSE has no backoff reconnect; bulk ops don't show per-item failures |
| Loading states | Pass | Comprehensive skeletons, spinners, disabled buttons during load |
| Empty states | Pass | All major pages have informative empty states |
| Auth edge cases | Partial | MFA banner only; no explicit 401 redirect; offline mode functional |
| Real-time reliability | Partial | SSE/WebSocket functional; no heartbeat/backoff reconnect strategy |
| Mobile/responsive | Pass | Mobile-first, 44px touch targets, iOS font-size zoom prevention |
| Form validation | Partial | Required field checks only; no format validation or field-level error messages |

**Critical production blockers:**
1. `GuardAnalytics.jsx` is empty — remove route immediately
2. Shift management API endpoints need backend confirmation
3. Walk-in approval endpoint needs backend confirmation
4. SSE needs exponential backoff on disconnect
5. Bulk checkout loops N API calls — needs a bulk endpoint for >5 visitors

---

## Section 3: Resident Role

### 3.1 Route Inventory

| Path | Component file | Auth check | Key state loaded | Notes |
|------|----------------|------------|-----------------|-------|
| `/dashboard/resident` | ResidentDashboard.jsx | ProtectedRoute (resident) | Upcoming invites, recent visitors, MFA status, live events | Keyboard shortcuts: Ctrl+Q/G/B/H/R |
| `/resident/quick-invite` | QuickInvite.jsx | ProtectedRoute (resident) | Form data (name, phone, date, time, duration, unitPin) | Date/time chips; contact picker support |
| `/resident/bulk-invite` | BulkInvite.jsx | ProtectedRoute (resident) | Event details (name, date, time, guests) | 2-step wizard; generates shareable link |
| `/resident/bulk-invite-wizard` | BulkInviteWizard.jsx | ProtectedRoute (resident) | Event info, guest CSV, review state | 3-step wizard with CSV parsing; draft saved to localStorage |
| `/resident/visitor-history` | VisitorHistory.jsx | ProtectedRoute (resident) | Visitor records, search/filter, pagination | Table (desktop) + card (mobile); CSV/JSON export; 10s auto-refresh |
| `/resident/favorite-visitors` | FavoriteVisitors.jsx | ProtectedRoute (resident) | Favorites list, history visitors, form data | Full CRUD for favorites; history tab with search |
| `/resident/approvals` | ResidentApprovalsPanel.jsx | ProtectedRoute (resident) | Pending approvals list, processing states | Real-time WebSocket for walk-in approval requests |
| `/resident/settings` | Settings.jsx | ProtectedRoute (resident) | Profile, password, notifications, security, accessibility, theme | 7 tabs; MFA status check |
| `/resident/deliveries` | DeliveryList.jsx | ProtectedRoute (resident) | Delivery list, filter, handoff preference | Phase 2.1 |
| `/resident/auto-approval` | AutoApprovalRules.jsx | ProtectedRoute (resident) | Auto-approval rules list | Phase 2.2 |
| `/resident/privacy` | PrivacyDashboard.jsx | ProtectedRoute (resident) | Privacy/GDPR controls | Phase 3 |
| `/resident/rideshare` | RideshareEntry.jsx | ProtectedRoute (resident) | Rideshare entries | Phase 5 |

### 3.2 Service Bindings

**Visitor invitations:**
- `visitorService.createVisitor()` → `POST /api/visitors` — single invite, auto-SMS to visitor
- `visitorService.bulkInvite()` → `POST /api/visitors/bulk-invite` — event with optional guest CSV

**Visitor history:**
- `GET /api/visitors` — resident's own visitor records (10s auto-refresh)
- Client-side `useSearchData` — search, filter, pagination
- Client-side CSV/JSON export — no backend call

**Favorite visitors:**
- `GET /api/resident/favorites` — list favorites
- `POST /api/resident/favorites` — add favorite
- `PUT /api/resident/favorites/{id}` — update
- `DELETE /api/resident/favorites/{id}` — delete

**Walk-in approvals:**
- `GET /api/visitors/pending-approvals` — pending requests
- `POST /api/visitors/{id}/approve` — approve
- `POST /api/visitors/{id}/reject` — reject with optional reason

**Auto-approval rules:**
- `autoApprovalService` → `GET/POST/PUT/DELETE /api/auto-approval/rules`
- `POST /api/auto-approval/rules/{id}/toggle` — enable/disable rule

**Deliveries:**
- `deliveryService.getMyDeliveries()` → `GET /api/deliveries`
- `deliveryService.collectDelivery()` → `POST /api/deliveries/{id}/collect`
- `deliveryService.setHandoffPreference()` → `POST /api/deliveries/{id}/handoff`

**Settings & profile:**
- `GET /PUT /api/resident/profile` — profile read/write
- `POST /api/auth/change-password` — password change
- `GET /api/mfa/status` — MFA enablement check

### 3.3 User Journey Traces

**Journey R1: Quick Invite**
1. Resident clicks "Quick Invite" on dashboard or presses Ctrl+Q → `/resident/quick-invite`
2. Fills form: guest name, phone (auto-normalises Kenyan format: 07xx → +254xx), date (Today/Tomorrow/Custom chips), time, duration (1h/6h/12h/24h), optional unit PIN
3. Form validation: name + phone + date required; past dates rejected
4. Submit → `createVisitor()` → `POST /api/visitors`
5. Backend sends SMS to visitor with invite link
6. Success card shows: inviteCode, inviteLink, copy/WhatsApp share actions
7. Resident clicks Done → dashboard, or "Invite Another" → form reset
8. Visitor opens SMS link → `/invite/{inviteCode}` → fills details → gets QR code pass
9. Guard scans QR at gate → check-in logged

**Journey R2: Bulk Invite (two paths)**

*Path A — Simple (BulkInvite):*
1. Navigate to `/resident/bulk-invite`
2. Fill event: name, date, time, max guests (slider 1–100)
3. Submit → `POST /api/visitors/bulk-invite` → returns inviteLink + inviteCode
4. Step 2 shows shareable link; resident distributes manually

*Path B — Wizard (BulkInviteWizard):*
1. Step 1: event info. Step 2: CSV paste (`Name,Email,Phone` rows) with live parse + validation preview. Step 3: review summary
2. Submit → `bulkInvite()` → `POST /api/visitors/bulk-invite` with full guest data
3. Success: shareable link + WhatsApp/SMS/Email/Copy actions; preview opens link in new tab

**Journey R3: Walk-in Approval**
1. Guard registers walk-in → WebSocket `visitor:approval_request` dispatched to resident
2. Resident sees real-time notification + badge on dashboard
3. Navigate to `/resident/approvals` → list shows: visitor name, phone, vehicle plate, purpose, guard name, "time ago"
4. "Allow Entry" → `POST /api/visitors/{id}/approve` → guard notified, visitor removed from list
5. "Decline" → `window.prompt()` for reason → `POST /api/visitors/{id}/reject` → guard notified

**Journey R4: Delivery Management**
1. Navigate to `/resident/deliveries`
2. View delivery list filtered by status (pending_collection, notified, collected, returned, expired)
3. "Collected" button → `collectDelivery()` → `POST /api/deliveries/{id}/collect`
4. "Handoff Preference" dropdown → `setHandoffPreference()` → guard notified of preferred delivery method

**Journey R5: Favorite Visitors — Quick Re-invite**
1. Navigate to `/resident/favorites`
2. "Add Favorite" → modal: Tab 1 (new contact form) or Tab 2 (pick from visitor history with search)
3. Submit → `POST /api/resident/favorites`
4. "Quick Invite" button on favorite card → `/resident/quick-invite?name=X&phone=Y&from_favorite={id}` — form pre-populated, only date/time needed

**Journey R6: Auto-Approval Rules**
1. Navigate to `/resident/auto-approval`
2. "Add Rule" → form: visitor name pattern or category (Family/Friend/Service/Delivery/Business), time restrictions (days/hours), visit frequency
3. Submit → `autoApprovalService.createRule()` → rule appears in list with enable/disable toggle
4. When guard requests approval for a matching visitor → backend auto-approves (no resident action needed)

**Journey R7: Visitor History**
1. Navigate to `/resident/visitor-history`
2. Table (desktop) / card list (mobile) loads via `GET /api/visitors` with 10s auto-refresh
3. Search: client-side via `useSearchData` (name/phone/email/status)
4. Filters: status, check-in date range, check-out date range, visitor type
5. Export: "Export CSV/JSON" → client-side blob download (no API call)
6. Row click → no-op (`[STUBBED]` — visitor detail modal not implemented)
7. Ctrl+R → immediate re-fetch

### 3.4 Real-Time Integration

| Event name | Component | UI reaction |
|------------|-----------|-------------|
| `visitor.check_in` | ResidentDashboard (useResidentVisitorEvents) | Adds to liveStats.todayCheckIns, toast, refreshes recent visitors |
| `visitor.check_out` | ResidentDashboard | Updates liveStats.currentlyOnPremises, refreshes |
| `visitor.approved` | ResidentDashboard | Refreshes invite list, removes from pending |
| `visitor:approval_request` | ResidentApprovalsPanel | Adds to pendingApprovals, shows new card, plays `/sounds/notification.mp3` |

**Event deduplication:** `useVisitorEvents` maintains fingerprint `${type}:${visitorId}:${timestamp}` across a 50-event rolling buffer.

### 3.5 Resident-Specific Components

| Component | Description | Status |
|-----------|-------------|--------|
| AutoApprovalRules.jsx | CRUD for auto-approval rules; toggle; category icons; JSON export | Fully implemented |
| DashboardWidgetCustomizer.jsx | Show/hide dashboard widgets; localStorage persistence | Fully implemented |
| DeliveryList.jsx | Delivery management with status filter, collect button, handoff preference | Fully implemented |
| RecurringPasses.jsx | Manage daily worker/caregiver passes; enable/disable; revoke; history | Fully implemented |
| RideshareEntry.jsx | Create/manage Uber/Bolt quick-entry codes | Fully implemented |
| VisitorInsights.jsx | Visitor trend analytics, peak times, frequent visitors (Phase 4.3) | Fully implemented |
| VisitorFilters.jsx | Reusable filter UI (status, date range, type) | Fully implemented |
| FavoriteVisitors.jsx (widget) | Compact card display of favorites embedded in dashboard | Partial (widget only) |

### 3.6 Gap Flags

| Type | Component/File | Description | Severity |
|------|----------------|-------------|----------|
| `[MISSING]` | ResidentApprovalsPanel.jsx | Walk-in approvals use WebSocket only — no Web Push fallback; resident with browser closed misses approval requests entirely | Critical |
| `[STUBBED]` | ResidentApprovalsPanel.jsx | Uses `window.prompt()` for rejection reason instead of a modal dialog — blocks UI thread | High |
| `[DISCONNECTED]` | ResidentApprovalsPanel.jsx | WebSocket subscriptions partially disabled (`subscribeDashboard: false, subscribeVisitors: false`) but component expects `visitor:approval_request` — subscription path unclear | High |
| `[STUBBED]` | VisitorHistory.jsx | `handleSort()` is a no-op — sorting UI present but not functional | Medium |
| `[STUBBED]` | VisitorHistory.jsx | `handleRowClick()` is a no-op — no visitor detail modal exists | Medium |
| `[MISSING]` | BulkInviteWizard.jsx | No manual guest entry — guests can only be added via CSV paste | Medium |
| `[MISSING]` | Settings.jsx | MFA not enforced before password change — only a status check | Medium |
| `[STUBBED]` | Settings.jsx | Some settings tabs use generic mock success — actual save logic missing | Medium |
| `[MISSING]` | FavoriteVisitors.jsx | No confirmation dialog before delete | Low |
| `[DISCONNECTED]` | Route naming | `/dashboard/resident` for dashboard but `/resident/*` for sub-pages — inconsistent; no centralized route constants | Low |

### 3.7 Production Readiness Assessment — Resident Role

| Area | Status | Key Finding |
|------|--------|-------------|
| Error handling | Partial | `handleApiError()` used well; but raw `fetch` calls in many pages bypass Axios interceptors, miss 401 handling |
| Loading states | Pass | Skeletons, spinners, disabled buttons throughout |
| Empty states | Pass | UpcomingVisitsEmpty, RecentVisitorsEmpty, "All Clear!" in approvals — all informative |
| Auth edge cases | Partial | `credentials: 'include'` used correctly; no auto-logout on 401; session expires silently |
| Notification delivery | **Fail** | Walk-in approvals via WebSocket only — resident with closed browser never sees request; no push fallback |
| Mobile/responsive | Pass | Mobile-first grid layouts, 44px touch targets, card views on mobile |
| Form validation | Pass | Phone normalisation, past-date prevention, CSV row validation in wizard |

**Critical production blockers:**
1. Walk-in approval notification has no Web Push fallback — this is a core use case failure
2. `window.prompt()` for rejection reason must be replaced with a modal
3. Session expiry handled silently — add auto-logout + token refresh on 401

---

## Section 4: Public Visitor Flow

### 4.1 Route Inventory

| Path | Component file | Auth required | Key state loaded | Notes |
|------|----------------|---------------|-----------------|-------|
| `/v/:token` | VisitorInvitePage.jsx | No (token-based) | visitor details, estate info, expiry countdown | Token format: `vst_` prefix + 24 chars. Status polling every 10s for pending_approval |
| `/invite/:inviteCode` | GuestInvite.jsx | No (code-based) | invite template, event metadata | Shows registration form before QR code; calendar integration |
| ~~`/kiosk`~~ | SelfCheckInKiosk.jsx | No | N/A | `[REMOVED]` — CSS exists, component deleted |

### 4.2 Service Bindings

**VisitorInvitePage.jsx (via `useVisitorInvite` hook):**
- GET `/api/public/visitors/by-token/:token` — fetches visitor details + QR code
- GET `/api/public/estate-info?estateId=X` — estate details, directions
- POST `/api/public/visitors/:token/confirm` — confirmation with consent + ID number
- GET `/api/public/visitors/:token/status` — 10s polling when `status === 'pending_approval'`

**GuestInvite.jsx:**
- `getPublicInvite(inviteCode)` → GET `/api/public/invites/:inviteCode` — invite template
- `completeInvite(inviteCode, guestDetails)` → POST `/api/visitors/complete/:inviteCode` → returns `visitor_token` → redirects to `/v/:token`

**VisitorDirections.jsx (embedded):**
- GET `/api/directions/visitor/:visitorId?token=X` — map links, directions text
- POST `/api/directions/visitor/:visitorId/share?token=X` — shareable link

**SavePassModal.jsx (embedded):**
- Client-side only — uses `html2canvas` + `jsPDF` for PNG/PDF export at scale=2

### 4.3 User Journey Traces

**Journey V1: Token-based Invite (/v/:token)**
1. Visitor receives SMS/email with link: `https://app.securegate.com/v/vst_abc123...`
2. `useVisitorInvite` hook fetches visitor details + estate info
3. Status branching:
   - `pending_confirmation` → show confirmation form (purpose, vehicle plate, ID number, consent checkbox)
   - `pending_approval` → show "Awaiting Approval" + 10s polling
   - `approved` → display QR code + visit details
   - `rejected` → show "Visit Denied"
   - `isBulkInvite` → show event registration form (different UX)
4. Visitor confirms → POST `/api/public/visitors/:token/confirm`
5. Visitor saves pass → SavePassModal → PNG/PDF export client-side
6. Visitor views directions → `VisitorDirections` loads Google/Apple/Waze map links
7. OTP shown below QR code (copy button) as alternate gate entry method

**Journey V2: Invite Code (/invite/:inviteCode)**
1. Visitor opens generic invite code link
2. `getPublicInvite()` fetches invite template + event metadata
3. Visitor fills registration form: name, phone/email, ID, vehicle plate (optional), purpose, consent (Kenya DPA 2019)
4. Submit → POST `/api/visitors/complete/:inviteCode` → returns `visitor_token`
5. Redirect to `/v/:new-token` → QR code immediately available
6. "Add to Calendar" dropdown: Google Calendar, Apple .ics, WhatsApp share

**Journey V3: OTP Verification**
- Backend generates OTP alongside QR code
- OTP displayed below QR code in `QRCodeDisplay.jsx` with "Copy OTP" button
- Visitor presents either QR code OR 6–8 digit OTP at guard gate

**Journey V4: Self Check-in Kiosk (gap analysis)**
- **Status:** `[REMOVED]` — component and route deleted; `SelfCheckInKiosk.css` still present
- **What existed (from CSS):** Touch-optimized UI (100px min-height buttons), language selector, resident name search, photo capture via camera, visit code display, landscape/tablet orientation optimization
- **Current gap:** No device-less self-service entry at gate kiosk. All visitor entry requires a pre-arranged invite link. Walk-in visitors must go through guard-assisted flow only.

### 4.4 Gap Flags

| Type | Component/File | Description | Severity |
|------|----------------|-------------|----------|
| `[MISSING]` | Public pages (both) | No i18n integration — hard-coded English only; locale files exist for sw/fr/ar but unused | High |
| `[REMOVED]` | SelfCheckInKiosk.jsx | Kiosk component deleted, CSS remains; no self-service gate entry for walk-in visitors | High |
| `[MISSING]` | Confirmation flow | POST `/api/public/visitors/:token/confirm` has no offline queue — submission lost if offline | Medium |
| `[STUBBED]` | Error messaging | Generic "Invite Not Available" for all errors (expired, invalid, already-used) — no specific codes surfaced | Medium |
| `[MISSING]` | Offline cache | sessionStorage cache has no TTL — could serve stale invite data indefinitely | Medium |
| `[MISSING]` | ARIA / a11y | QR code display has no alt text; status messages lack `role="alert"` for screen readers; form validation errors not announced | Medium |
| `[MISSING]` | Print media | No `@media print` CSS — QR codes will not print at correct size | Low |
| `[MISSING]` | SavePassModal | Exports QR at 140px; `html2canvas` scale=2 helps but no contrast validation on output | Low |

### 4.5 Production Readiness Assessment — Public Visitor Flow

| Area | Status | Key Finding |
|------|--------|-------------|
| Error handling | Partial | Generic error messages; no specific feedback for expired vs invalid vs already-used token |
| Mobile optimisation | Pass | Responsive Tailwind layout, touch targets, proper input types |
| Offline behaviour | Partial | Cached read works; confirmation submission has no offline queue |
| QR code display quality | Pass | Server pre-generated, level="H", white margin, client-side fallback, scale=2 export |
| Accessibility | Partial | Dark mode + reduced motion respected; no ARIA on QR, no live regions for status changes |
| Internationalisation | Fail | Hard-coded English; locale files exist but never used in public pages |

**Critical production blockers:**
1. Internationalisation missing — Kenya estate visitors may speak Swahili, French, Arabic
2. Offline confirmation queue missing — failed submissions silently lost
3. ARIA live regions needed for screen reader announcements of approval status changes

---

## Section 5: Admin / Super Admin

### 5.1 Route Inventory

| Path | Component | Roles | Tab/State loaded | Notes |
|------|-----------|-------|-----------------|-------|
| `/dashboard/admin` | AdminDashboard | admin, super_admin | overview | Metrics, announcements, queue status |
| `/dashboard/admin/:tab?` | AdminDashboard | admin, super_admin | dynamic | Parametric tab routing |
| `/dashboard/admin/approvals` | AdminDashboard (tab) | admin, super_admin | approvals | User account approval workflow |
| `/dashboard/admin/guards` | AdminDashboard (tab) | admin, super_admin | guards | Guard management |
| `/dashboard/admin/residents` | AdminDashboard (tab) | admin, super_admin | residents | Resident CRUD |
| `/dashboard/admin/visitors` | AdminDashboard (tab) | admin, super_admin | visitors | Visitor log, manual check-in/out |
| `/dashboard/admin/reports` | AdminDashboard (tab) | admin, super_admin | reports | Analytics, CSV/JSON export |
| `/dashboard/admin/settings` | AdminDashboard (tab) | admin, super_admin | settings | MFA, integrations, estate config |
| `/dashboard/admin/users` | → `/dashboard/admin/approvals` | admin, super_admin | — | Redirect |
| `/dashboard/admin/help/security` | MFASetupGuide | admin, super_admin | — | Security/MFA docs |
| `/dashboard/super-admin` | SuperAdminDashboard | super_admin only | overview | Global platform management |

### 5.2 AdminDashboard Tab Architecture

| Tab | Component(s) rendered | API calls on load | Refresh |
|-----|----------------------|-------------------|---------|
| overview | AdminMetrics, AdminUserApprovals, AnnouncementsAdmin, notification queue status | `getMetrics()`, `getNotificationQueueStats()`, `getNotificationFailures()`, `getHealthDetails()` | Metrics 30s, Queue/Health 60s |
| approvals | AdminUserApprovals (full) | `GET /api/admin/users/pending` | On action |
| guards | ManageGuards | `getAllGuards()`, `getEquipmentCheckouts()` | On action |
| residents | ManageResidents | `getAllResidents()` | On action |
| visitors | VisitorLog | `GET /api/admin/visitors` (paginated, limit 20) | On action |
| reports | Reports | `GET /api/visitors/reports?format=json`, `GET /api/visitors/reports?mode=aggregates` | On filter change |
| settings | Settings | `GET /api/mfa/status`, estate info | On tab open |

**Estate scoping:** Regular admins → single estate via `getEstateDetails()`. Super admins → multi-estate dropdown via `getAllEstates()`, `?siteId=X` URL parameter, `withEstateParams()` applied to all calls.

### 5.3 Service Bindings

| Component | Service method | API endpoint | Purpose |
|-----------|---------------|--------------|---------|
| AdminMetrics | `getMetrics()` | GET /api/admin/metrics | Estate metrics |
| AdminUserApprovals | `getPendingUsers()` | GET /api/admin/users/pending | Approval queue |
| AdminUserApprovals | `updateUserStatus()` | PUT /api/admin/users/:id/status | Approve/reject |
| ManageGuards | `getAllGuards()` | GET /api/guards | List guards |
| ManageGuards | `addGuard()` | POST /api/guards | Create guard |
| ManageGuards | `updateGuard()` | PUT /api/guards/:id | Edit guard |
| ManageGuards | `deleteGuard()` | DELETE /api/guards/:id | Delete guard |
| ManageGuards | `createGuardShift()` | POST /api/guards/shifts | Assign shift |
| ManageGuards | `recordGuardPerformance()` | POST /api/guards/performance | Log performance |
| ManageGuards | `getEquipmentCheckouts()` | GET /api/guards/equipment | Equipment tracking |
| ManageGuards | `checkoutEquipment()` | POST /api/guards/equipment/checkout | Log out equipment |
| ManageGuards | `returnEquipment()` | POST /api/guards/equipment/:id/return | Log return |
| ManageGuards | `addTrainingRecord()` | POST /api/guards/:id/training | Training certification |
| ManageResidents | `getAllResidents()` | GET /api/admin/residents | List residents |
| ManageResidents | `createResident()` | POST /api/admin/residents | Create account |
| ManageResidents | `updateResident()` | PUT /api/admin/residents/:id | Edit |
| ManageResidents | `deleteResident()` | DELETE /api/admin/residents/:id | Delete |
| VisitorLog | `getVisitorLogs()` | GET /api/admin/visitors | History + pagination |
| VisitorLog | `checkInVisitor()` | POST /api/visitors/:id/check-in | Manual check-in |
| VisitorLog | `checkOutVisitor()` | POST /api/visitors/:id/check-out | Manual check-out |
| Reports | (direct fetch) | GET /api/visitors/reports | Report data |
| SuperAdminDashboard | (direct fetch) | GET /api/admin/super-admin/overview | Platform-wide stats |
| SuperAdminDashboard | (direct fetch) | GET /api/admin/super-admin/estates | All estates |
| SuperAdminDashboard | (direct fetch) | GET /api/admin/super-admin/users/search | Global user search |
| SuperAdminDashboard | (direct fetch) | PATCH /api/admin/super-admin/estates/:id/status | Change estate status |

### 5.4 User Journey Traces

**Journey A1: User Approval Workflow**
1. New resident/guard registers → backend flags as `pending`
2. Admin opens approvals tab → `GET /api/admin/users/pending` → pending users table
3. Admin clicks "Approve" or "Reject" → `PUT /api/admin/users/:id/status`
4. Optimistic update removes user from list; backend sends email notification

**Journey A2: Guard Management**
1. Guards tab → `getAllGuards()` → table with equipment status, performance metrics
2. Create: form → `addGuard()` → `POST /api/guards`
3. Assign shift (7-day default): `createGuardShift()` → `POST /api/guards/shifts`
4. Record performance (punctuality, professionalism, etc.): `recordGuardPerformance()`
5. Log equipment checkout/return: `checkoutEquipment()` / `returnEquipment()`
6. Add training certification: `addTrainingRecord()`

**Journey A3: Visitor Log Audit**
1. Visitors tab → `GET /api/admin/visitors` (paginated, limit 20)
2. Filter by status or search by visitor/host name
3. Manual check-in: `POST /api/visitors/:id/check-in`; checkout: `POST /api/visitors/:id/check-out`
4. Export via Reports tab → CSV (direct `window.location.href`) or JSON (fetch + blob)

**Journey A4: Reports & Analytics**
1. Reports tab → set date range, status, host filters → "Preview"
2. `GET /api/visitors/reports?format=json` + `?mode=aggregates`
3. Displays: CONFIRMED/ON_PREMISE/EXITED/REVOKED counts, daily totals bar chart, top hosts table, full visitor table
4. Export: CSV (direct download) or JSON (fetch + download)

**Journey A5: Integrations Hub**
1. Settings tab → IntegrationsHub subsection → 3 tabs: Webhooks, Automation, API Keys
2. **Webhooks:** Create/edit/delete webhooks (URL, secret, headers, event triggers); test button
3. **Automation:** Define rules: trigger event (incident.created, visitor.approved) + JSON conditions + actions; priority + enable/disable
4. **API Keys:** Generate key (name, permissions read/write/admin, rate limit); one-time display; revoke

**Journey A6: Super Admin — Multi-Estate**
1. `/dashboard/super-admin` → platform-wide stats (estates, users, visitors, incidents)
2. Platform Overview tab: global user search (min 3 chars), estates table with status management
3. "Manage" button → impersonate estate → `/dashboard/admin?siteId=X`
4. Suspend/activate/decommission estates (decommission opens GDPR compliance modal)
5. System Health tab: P95/P99 latency, error rate %, DB utilisation, queue depth — auto-refresh 30s
6. Estate switcher dropdown: seamless cross-estate navigation

### 5.5 Admin-Specific Components

| Component | Description | Status |
|-----------|-------------|--------|
| AdminMetrics | 4-column metric cards (users, visitors, verified, admins) | Complete |
| AdminUserApprovals | Pending users table with approve/reject; optimistic updates | Complete |
| AnnouncementsAdmin | Create/edit/delete estate announcements; priority, audience, expiry, pinning | Complete |
| AnalyticsDashboard | Visitor traffic charts, hourly check-ins, purpose distribution, heatmap; PDF/CSV export | Complete |
| VisitorDetailsModal | Visitor info modal: name, phone, email, purpose, host, dates, check-in/out times | Complete |
| ResidentDetailsModal | Resident details modal (minimal usage in current pages) | Partial |
| AuditLogs | **STUB** — shows "📝 Audit logs will appear here" placeholder only | Stub |

### 5.6 Files Present but Not Routed

| File | Exists? | Classification | Description |
|------|---------|----------------|-------------|
| BulkOperationsPanel.jsx | Yes | `[DISCONNECTED]` | Imported in App.js; route at `/admin/bulk-operations` — but NOT linked in admin navigation |
| AdvancedSearchPanel.jsx | Yes | `[DISCONNECTED]` | Imported in App.js; route at `/admin/search` — not linked in navigation |
| DataExportPanel.jsx | Yes | `[DISCONNECTED]` | Imported in App.js; route at `/admin/export` — not linked in navigation |
| MessagingSystem.jsx | Yes | `[DISCONNECTED]` | Imported in App.js; route at `/collaboration/messaging` — not in admin nav |
| WorkflowHandoffs.jsx | Yes | `[DISCONNECTED]` | Imported in App.js; route at `/collaboration/handoffs` — not in admin nav |
| ApprovalWorkflows.jsx | Yes | `[DISCONNECTED]` | Imported in App.js; route at `/collaboration/approvals` — not in admin nav |
| NotificationPreferences.jsx | Yes (1-line stub) | `[REMOVED]` | Removed from routing; file is empty |
| ActivityDashboard.jsx | Yes (1-line stub) | `[REMOVED]` | Removed from routing; file is empty |
| PendingApprovals.jsx | Yes | `[DISCONNECTED]` | Standalone page; functionality consolidated into AdminUserApprovals |
| WatchlistManagement.jsx | Yes | `[DISCONNECTED]` | File exists; no route in App.js |
| RoleManagement.jsx | Yes | `[DISCONNECTED]` | File exists; no route in App.js |
| PolicyManagement.jsx | Yes | `[DISCONNECTED]` | File exists; no route in App.js |
| AccessControl.jsx | Yes | `[DISCONNECTED]` | File exists; no route in App.js |
| SiteManagement.jsx | Yes | `[DISCONNECTED]` | File exists; no route in App.js |
| GuardAnalytics.jsx | Yes | `[DISCONNECTED]` | File exists; no route in App.js |
| IncidentManagement.jsx | Yes | `[DISCONNECTED]` | File exists; no route in App.js |
| AdminOperationsDashboard.jsx | Yes | `[DISCONNECTED]` | File exists; no route in App.js |

### 5.7 Gap Flags

| Type | Component/File | Description | Severity |
|------|----------------|-------------|----------|
| `[STUBBED]` | AuditLogs.jsx | Placeholder only — no audit trail UI | High |
| `[DISCONNECTED]` | WatchlistManagement.jsx | File exists, fully built, zero routes | High |
| `[DISCONNECTED]` | RoleManagement.jsx | Fine-grained role management built but not accessible | High |
| `[DISCONNECTED]` | AccessControl.jsx, PolicyManagement.jsx | Access policy UI built but not routed | High |
| `[DISCONNECTED]` | MessagingSystem, WorkflowHandoffs, ApprovalWorkflows | Collaboration system built but no navigation entry point | High |
| `[DISCONNECTED]` | BulkOperationsPanel, AdvancedSearchPanel, DataExportPanel | Routes exist in App.js but no navigation links in admin sidebar | Medium |
| `[MISSING]` | Admin UI | No fine-grained UI permission checks — all admins see all functions regardless of sub-role | Medium |
| `[REMOVED]` | NotificationPreferences.jsx, ActivityDashboard.jsx | Stub files remain; not cleaned up | Low |
| `[BACKEND-DEP]` | IntegrationsHub | Uses `alert()` for errors; assumes integration endpoints exist | Medium |

### 5.8 Production Readiness Assessment — Admin Role

| Area | Status | Key Finding |
|------|--------|-------------|
| Error handling | Partial | `handleApiError()` used well in most pages; IntegrationsHub uses `alert()` instead of toast; SuperAdminDashboard uses bare `console.error` |
| Loading states | Pass | Spinners and skeletons implemented consistently across all admin pages |
| Permission enforcement (UI) | Partial | Route-level role gating is correct; no fine-grained UI checks (all admins see all functions) |
| Super admin multi-estate | Pass | Estate dropdown, `withEstateParams()`, impersonation, `?siteId=X` all functional |
| Export functionality | Pass | CSV + JSON export from Reports; client-side CSV from ManageResidents; no async/scheduled export |
| Collaboration tools | **Fail** | MessagingSystem, WorkflowHandoffs, ApprovalWorkflows all built but completely disconnected — no nav links |

**Critical production blockers:**
1. 10+ page components built but disconnected — WatchlistManagement, RoleManagement, AccessControl, PolicyManagement, SiteManagement, IncidentManagement are invisible to admins
2. AuditLogs is a stub — no audit trail is a compliance risk
3. Collaboration tools (messaging, handoffs, approvals) are complete but unreachable
4. IntegrationsHub error handling uses `alert()` — must replace with toast/error context

---

## Section 6: Cross-Cutting Concerns

### 6.1 Authentication Flow

#### Auth State Machine (5 states)
`utils/authStateMachine.js` — standalone FSM, subscribed to by both AuthContext and apiClient.

| State | Trigger | Meaning |
|-------|---------|---------|
| UNKNOWN | Initial | Before any auth check completes |
| AUTHENTICATED | Login success / token refresh success | Valid session |
| UNAUTHENTICATED | Logout / refresh failure / no session | Not logged in |
| REFRESHING | Access token expired, refresh in progress | Transitional |
| ESTATE_REQUIRED | Authenticated but `estate_id` is null | Must select estate |

#### Complete Login Flow
1. User enters email + password on Login page (Ctrl+Enter shortcut)
2. `AuthContext.login()` → `POST /api/auth/login` — httpOnly cookies issued (NO localStorage)
3. Response checks:
   - `data.requiresMFA` → redirect to `/mfa/verify`, store `{mfaSessionId, userId, expiresIn: 300s}` in sessionStorage
   - `data.mfaRequired` → legacy MFA format support
   - Success → extract user, transition to AUTHENTICATED
4. MFA verify: `POST /api/mfa/verify` with `{mfaSessionId, token}` or 8-char backup code → `completeMfa(userData)`
5. MFA setup (required for admin/guard/super_admin if not yet enabled): 3-step (generate QR → verify → download backup codes)
6. Estate selection (if `estate_id === null`): `GET /api/estates/available` → user selects → `POST /api/estates/select` → redirect to `/login` to refresh session
7. Role-based redirect: resident → `/dashboard/resident`, guard → `/dashboard/guard`, admin → `/dashboard/admin`, super_admin → `/dashboard/super-admin`
8. Respects `location.state.from` for return-to-previous-path

#### Token Refresh (apiClient.js)
- Intercepts 401 responses
- `refreshPromise` global deduplicates concurrent refreshes
- `refreshAccessTokenWithRetry()` — 3 retries, exponential backoff, waits for online if offline
- On success: retry original request; on failure: transition to UNAUTHENTICATED, navigate to login

#### CSRF Protection
- Token in `<meta name="csrf-token">` — refreshed from `GET /api/auth/csrf-token`
- Axios request interceptor adds `X-CSRF-Token` header
- Axios response interceptor updates meta tag on new `x-csrf-token` header
- Auto-refresh on 403 CSRF_VALIDATION_FAILED, then retry

#### Logout Flow
- Optimistic: clear `user` state + transition to UNAUTHENTICATED immediately
- Background: `POST /api/auth/logout` clears httpOnly cookies + invalidates refresh token
- Logout API errors are logged but do not block the UI state change

#### ProtectedRoute Logic
1. Show spinner while `AuthContext.loading`
2. If not authenticated → `/login` with return path
3. If wrong role → redirect to role's own dashboard
4. Otherwise render children

---

### 6.2 WebSocket / Real-Time Layer

#### Socket Pool
- Key: `${socketUrl}::${authToken || 'cookie-auth'}`
- Ref-counted: multiple components share one socket connection
- Cleanup: `refCount → 0` → disconnect + remove from pool
- **Gap:** Token change creates new socket but old one may not be released immediately

#### Connection Config
```javascript
io(WS_URL, {
  auth: { token },
  transports: ['websocket', 'polling'],  // polling fallback
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000
})
```

#### Event Normalisation (2-stage)
**Stage 1 — EVENT_TYPE_MAP:** `VISITOR_CHECK_IN → visitor.check_in`, `SECURITY_ALERT → security.alert`, etc.
**Stage 2 — Payload flatten:** nested `data` object merged into root; `rawType` preserved; `timestamp` defaulted.
**Legacy mapping:** `visitor.check_in → visitor:checkin` for backward compatibility with older components.

#### Subscriptions (on `connection_established`)
- `dashboard:subscribe` if `subscribeDashboard: true`
- `visitors:subscribe` if `subscribeVisitors: true` AND role in `['admin', 'guard', 'super_admin']`
- `admin:subscribe` if `subscribeAdmin: true` AND role in `['admin', 'super_admin']`

#### `useVisitorEvents` Specialisation
- Auto-subscribes, wires callbacks: `onCheckIn`, `onCheckOut`, `onNewVisitor`, `onApproval`, `onDenial`
- Deduplication fingerprint: `${type}:${visitorId}:${timestamp}` across 50-event buffer
- Live stats tracking: `todayCheckIns`, `currentlyOnPremises`, `pendingApprovals`
- Audio: plays `/sounds/notification.mp3` at 50% volume on important events

#### Reliability Gaps
- No message queuing — events missed while disconnected are lost
- No application-level ACK — event delivery unconfirmed
- Memory leak risk if component unmounts without calling cleanup
- `ESTATE_REQUIRED` state not handled in socket connection retry logic

---

### 6.3 PWA & Offline Support

#### Service Worker
- `serviceWorkerRegistration.js` registers `/public/service-worker.js` on window load
- Detects localhost vs production; validates SW exists in dev before registering
- Callbacks: `onSuccess` (first install), `onUpdate` (new version available → shows reload banner)

#### Offline Data (IndexedDB, `offlineService.js`)
Database version 3 with 8 stores:

| Store | Data | Retention |
|-------|------|-----------|
| visitors | Visitor records | 8 hours |
| qrCodes | Cached QR codes | 12 hours |
| walkInRegistrations | Guard walk-in data | 24 hours |
| invites | Visitor invites | 24 hours (inferred) |
| syncQueue | Failed API calls | 72 hours |
| apiCache | Generic API responses | 24 hours |
| residents | Resident data | 24 hours (inferred) |
| settings | App settings | Persistent |

Max 200 cached visitors per estate. All stores auto-purge on retention expiry.

**Available offline:** view cached visitor list (read-only), view cached QR codes, register walk-in visitors (queued), view cached settings.
**NOT available offline:** real-time stats, approval/denial actions, file uploads (except walk-in photos queued).

#### Background Sync
- Queues failed POST/PUT/DELETE calls in `syncQueue` store
- Triggers on: `online` event, `visibilitychange`, manual `checkPendingSyncs()`
- Batches 10 requests at a time with exponential backoff
- Events: `sync_registered`, `sync_completed`, `sync_failed`

#### PWAManager Responsibilities
- **Install banner:** shows 5s after load (unless dismissed in localStorage), tracks `pwa_installed` GA event
- **Offline detection:** shows red offline banner, auto-hides after 5s
- **Update notifications:** listens for `CACHE_UPDATED` SW message → "Update" button → `window.location.reload()`
- **Push permission prompt:** prompts once if not dismissed; subscribes via `pushNotificationService`
- **Sync status:** shows loading spinner while background sync runs

#### PWA Gaps
- Cached data has no "last updated" timestamp — users unaware of data staleness
- Offline approval/denial actions queued but no clear UX feedback
- Conflict resolution absent: visitor approved offline AND online simultaneously — no dedup
- Service worker file in `public/` not reviewed — actual caching strategy unknown

---

### 6.4 Notification System

#### Three Layers

| Layer | Service | What it does |
|-------|---------|-------------|
| Toast (in-app) | `notificationService.js` | Pub/sub singleton; `success()`, `error()`, `warning()`, `info()`; auto-dismiss (5s/8s) |
| Push (Web Push) | `pushNotificationService.js` | VAPID-based; subscribe/unsubscribe; quiet hours (22:00–08:00); action buttons (approve/deny) |
| Intelligent | `intelligentNotificationService.js` | Batching, coalescing, relevance scoring, quiet hours enforcement, channel recommendation |

#### Event → Display Flow
1. Backend emits WebSocket event
2. `useWebSocket` normalises and dispatches to `addEventListener` subscribers
3. Component passes to `intelligentNotificationService.handleIncomingNotification()`
4. Service checks: type pref, quiet hours, relevance score (hide if < 0.2)
5. If approved: show browser push notification (via SW) + toast

#### Push Subscription Flow
1. Fetch VAPID key: `GET /api/notifications/push/vapid-key`
2. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
3. Send subscription: `POST /api/notifications/push/subscribe`
4. Verify stored subscription: `POST /api/notifications/push/verify`
5. Unsubscribe: `subscription.unsubscribe()` + `DELETE /api/notifications/push/unsubscribe`

#### NotificationContext vs notificationService
- **NotificationContext:** lightweight adapter wrapping ToastContext — used by components via `useNotification()` hook
- **notificationService:** singleton with `handleBackendEvent()` mapping — used by ErrorContext for error bubbling

#### Notification Gaps
- WebSocket + SSE (`/api/ws/guards`) both active simultaneously → potential duplicate notifications
- No notification deduplication between channels
- Intelligent service relevance scores not persisted to backend
- No notification preferences UI for users to configure
- Parallel systems (`notificationService` vs `intelligentNotificationService`) — unclear precedence

---

### 6.5 Accessibility (WCAG 2.1 AA)

#### Implemented
| Feature | Implementation | Status |
|---------|---------------|--------|
| Keyboard navigation | Focus trap, tab cycling, Alt+H/N/1 shortcuts | Implemented |
| Screen reader | ARIA live regions (`polite`/`assertive`), dynamic ARIA attributes | Implemented |
| High contrast | CSS `prefers-contrast` + manual toggle via AccessibilityContext | Implemented |
| Reduced motion | CSS `prefers-reduced-motion` respected | Implemented |
| Text scaling | Up to 200% font scaling via AccessibilityContext | Implemented |
| Touch targets | Min 44×44px check function exists | Framework only |
| Skip links | `<SkipLink>` component in AppShell → `#main-content` | Implemented |
| Timeout extension | 1×/2×/5×/unlimited multiplier via AccessibilityContext | Implemented |

#### Gaps vs Full WCAG 2.1 AA
- Dwell clicking and switch scanning: framework exists but **disabled**
- No automated axe-core runtime testing in production build
- Focus restoration after modal close: not explicitly coded
- `<html lang="...">` attribute: not found in reviewed files
- Form error suggestions: not implemented (only "required" flags)
- Alternative input methods: not functional
- No documented WCAG audit report or conformance claim

---

### 6.6 Compliance (GDPR / Kenya Data Protection Act)

#### Cookie Consent (`CookieConsentBanner.jsx`)
Four categories: Necessary (always on), Analytics, Marketing, Preferences. Actions: Accept All, Reject All, Customize. Saved to localStorage + `POST /api/compliance/consent` (if authenticated). Dispatches `cookieConsentChanged` custom event. Hidden on auth entry routes.

#### Privacy Service — Rights Implemented

| Right | API call | GDPR Article |
|-------|----------|-------------|
| Data access | `POST /api/privacy/data-export` | Art. 15 |
| Data portability | `GET /api/privacy/data-export/{id}/download` | Art. 20 |
| Erasure | `POST /api/privacy/data-deletion` | Art. 17 |
| Consent management | `GET/POST/DELETE /api/privacy/consent` | Art. 6/7 |
| Audit log | `GET /api/privacy/audit-log` | Art. 5 |
| Breach reporting | `POST /api/privacy/data-breach` | Art. 33 |
| Retention policies | `GET/PUT /api/privacy/retention-policies` | Art. 5(e) |

#### Compliance Gaps
- No KDPA-specific rights surfaced (Kenya Data Protection Act 2019 requirements distinct from GDPR)
- Age gating absent (16+ GDPR / 18+ Kenya DPA)
- Cookie consent categories hardcoded, no versioning of consent text
- No subprocessor/third-party vendor transparency list
- Breach 72-hour notification timeline not tracked in UI
- Consent history lacks version tracking when consent text changes
- No automated deletion scheduling (GDPR 30-day compliance window)

---

### 6.7 Build & Configuration

#### Required Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `REACT_APP_API_URL` | Yes | — | Backend base URL |
| `REACT_APP_WS_URL` | No | Derived from API_URL | WebSocket URL |
| `REACT_APP_VAPID_PUBLIC_KEY` | No | — | Web Push |
| `REACT_APP_SENTRY_DSN` | No | — | Error monitoring |
| `REACT_APP_VERSION` | No | "1.0.0" | App version string |

#### Dev Proxy (`setupProxy.js`)
- Proxies `/api/*` and `/socket.io/*` → `http://localhost:3001`
- WebSocket upgrade enabled (`ws: true`)
- Cookie rewrite: removes `Secure` flag, downgrades `SameSite=Strict` → `Lax` for localhost
- **Gap:** Target hardcoded to `localhost:3001`, does not read env vars

#### Build Commands
- `npm start` — dev (port 3000, proxy to 3001)
- `npm run build` — production
- `npm run build:fast` — no sourcemaps, CI=true
- `npm run build:production` — all fast flags + disables ESLint
- `npm run analyze` — bundle analysis via source-map-explorer

### 6.8 Gap Flags — Cross-Cutting

| Type | Component/File | Description | Severity |
|------|----------------|-------------|----------|
| `[MISSING]` | notificationService.js + intelligentNotificationService.js | Two parallel notification systems with no documented precedence — potential duplicate notifications | High |
| `[MISSING]` | offlineService.js | No "last updated" timestamp on cached data — users unaware of staleness | High |
| `[MISSING]` | offlineService.js | Offline + online simultaneous approval conflict not detected or resolved | High |
| `[MISSING]` | privacyService.js | No KDPA-specific features (Kenya Data Protection Act — distinct requirements) | High |
| `[MISSING]` | All pages | No `.env.example` template — developers must guess required environment variables | High |
| `[MISSING]` | AccessibilityProvider.jsx | No automated axe-core accessibility testing at runtime or in CI | High |
| `[MISSING]` | useWebSocket.js | Events missed while disconnected are lost — no message queue | High |
| `[STUBBED]` | AccessibilityProvider.jsx | Dwell clicking + switch input framework built but disabled — alternative input methods non-functional | Medium |
| `[MISSING]` | setupProxy.js | Proxy target hardcoded to `localhost:3001` — not configurable via env vars | Medium |
| `[MISSING]` | CookieConsentBanner.jsx | Cookie categories hardcoded; no consent text versioning | Medium |
| `[MISSING]` | CSRF flow | CSRF token not explicitly invalidated on logout | Medium |
| `[MISSING]` | i18n | `/i18n/` directory exists, locale files for sw/fr/ar present, but zero usage in any page | Medium |

---

## Section 7: Consolidated Gap Register

All gaps from Sections 2–6, deduplicated and sorted by severity.

**Summary counts:**

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 22 |
| Medium | 21 |
| Low | 8 |
| **Total** | **53** |

**By type:**

| Flag type | Count |
|-----------|-------|
| `[MISSING]` | 20 |
| `[DISCONNECTED]` | 16 |
| `[STUBBED]` | 11 |
| `[BACKEND-DEP]` | 5 |
| `[REMOVED]` | 3 |
| **Total** | **53** |

---

### 7.1 Critical Gaps

| # | Gap | Flag | Role | File/Feature | Backend dep? |
|---|-----|------|------|-------------|-------------|
| C1 | `GuardAnalytics.jsx` is 0 bytes — route in `App.js` renders blank page | `[MISSING]` | Guard | `pages/guard/GuardAnalytics.jsx` | No |
| C2 | Walk-in approval notification delivered only via WebSocket — resident with closed browser **never receives the request** | `[MISSING]` | Resident | `ResidentApprovalsPanel.jsx`, `pushNotificationService.js` | No — Web Push infrastructure exists |

---

### 7.2 High Severity Gaps

| # | Gap | Flag | Role | File/Feature | Backend dep? |
|---|-----|------|------|-------------|-------------|
| H1 | `POST /api/guards/shifts` and `POST /api/guards/handover` endpoint existence unconfirmed | `[BACKEND-DEP]` | Guard | `ShiftHandover.jsx` | **Yes** |
| H2 | `POST /api/visitors/{id}/request-approval` endpoint existence unconfirmed | `[BACKEND-DEP]` | Guard | `WalkInRegistration.jsx` | **Yes** |
| H3 | `GET /api/visitors/history` response shape may not match ActivityLog component expectations | `[BACKEND-DEP]` | Guard | `ActivityLog.jsx` | **Yes** |
| H4 | Bulk checkout loops N separate `POST /api/visitors/{id}/check-out` calls — no bulk endpoint (scalability risk at EOD) | `[BACKEND-DEP]` | Guard | `BulkCheckout.jsx` | **Yes** — needs `POST /api/visitors/bulk-checkout` |
| H5 | `window.prompt()` for rejection reason blocks UI thread; unacceptable production UX | `[STUBBED]` | Resident | `ResidentApprovalsPanel.jsx` | No |
| H6 | WebSocket subscriptions partially disabled (`subscribeDashboard: false, subscribeVisitors: false`) but `visitor:approval_request` expected | `[DISCONNECTED]` | Resident | `ResidentApprovalsPanel.jsx` | No |
| H7 | Public visitor pages hard-coded in English — locale files (sw/fr/ar) exist but unused; Kenya estates need Swahili at minimum | `[MISSING]` | Public | `VisitorInvitePage.jsx`, `GuestInvite.jsx` | No |
| H8 | `SelfCheckInKiosk.jsx` deleted — no self-service gate entry; walk-ins require guard-assisted flow only; CSS still present | `[REMOVED]` | Public | `SelfCheckInKiosk.jsx` | No |
| H9 | `AuditLogs.jsx` renders placeholder emoji text only — no actual audit trail UI | `[STUBBED]` | Admin | `AuditLogs.jsx` | No |
| H10 | `WatchlistManagement.jsx` fully built but has zero routes and no navigation link | `[DISCONNECTED]` | Admin | `WatchlistManagement.jsx` | No |
| H11 | `RoleManagement.jsx` built but inaccessible — no route or navigation entry | `[DISCONNECTED]` | Admin | `RoleManagement.jsx` | No |
| H12 | `AccessControl.jsx` and `PolicyManagement.jsx` built but not routed | `[DISCONNECTED]` | Admin | `AccessControl.jsx`, `PolicyManagement.jsx` | No |
| H13 | Collaboration suite (`MessagingSystem`, `WorkflowHandoffs`, `ApprovalWorkflows`) built but completely unreachable — no nav, no route links in admin sidebar | `[DISCONNECTED]` | Admin | `MessagingSystem.jsx`, `WorkflowHandoffs.jsx`, `ApprovalWorkflows.jsx` | No |
| H14 | Two parallel notification services (`notificationService.js` + `intelligentNotificationService.js`) with no documented routing precedence — potential duplicate notifications | `[MISSING]` | Cross-cutting | Both notification services | No |
| H15 | Cached offline data has no "last updated" timestamp — users cannot tell if they are viewing stale data | `[MISSING]` | Cross-cutting | `offlineService.js` | No |
| H16 | Visitor approved offline AND online simultaneously — no conflict detection or deduplication | `[MISSING]` | Cross-cutting | `offlineService.js`, `syncService.js` | No |
| H17 | No KDPA-specific features (Kenya Data Protection Act 2019 is distinct from GDPR — different timelines, age gating, resident data rights) | `[MISSING]` | Cross-cutting | `privacyService.js`, `PrivacyDashboard.jsx` | No |
| H18 | No `.env.example` template — developers must guess or read docs to discover all required/optional env vars | `[MISSING]` | Cross-cutting | `client/` root | No |
| H19 | No axe-core automated accessibility testing in CI or runtime — WCAG compliance unverified beyond manual checks | `[MISSING]` | Cross-cutting | CI pipeline, `AccessibilityProvider.jsx` | No |
| H20 | WebSocket events emitted while client is disconnected are lost — no message queue on reconnect | `[MISSING]` | Cross-cutting | `useWebSocket.js` | No — backend would need SSE/queue |
| H21 | `SiteManagement.jsx`, `IncidentManagement.jsx`, `AdminOperationsDashboard.jsx` fully built but have no routes or navigation links | `[DISCONNECTED]` | Admin | Three files | No |
| H22 | Session expiry on 401 handled silently in Resident and Guard flows — no auto-logout or user-visible prompt | `[MISSING]` | Cross-cutting | `apiClient.js`, all dashboard pages | No |

---

### 7.3 Medium Severity Gaps

| # | Gap | Flag | Role | File/Feature | Backend dep? |
|---|-----|------|------|-------------|-------------|
| M1 | `QuickFilters.jsx` dashboard filter tabs imported and rendered but Phase G3 not implemented | `[STUBBED]` | Guard | `QuickFilters.jsx` | No |
| M2 | `PendingApprovalsQueue.jsx` placeholder card — data loading logic unconfirmed | `[STUBBED]` | Guard | `PendingApprovalsQueue.jsx` | Maybe |
| M3 | OTP verification in ManualCheck loops through ALL visitors client-side — does not scale; needs server-side OTP lookup | `[BACKEND-DEP]` | Guard | `ManualCheck.jsx` | **Yes** — needs `GET /api/visitors?otp=xxx` |
| M4 | Incident list filter query params (`fromDate/toDate`) may not match actual backend param names | `[BACKEND-DEP]` | Guard | `IncidentList.jsx` | **Yes** |
| M5 | Visitor history `handleSort()` is a no-op — sorting UI present but non-functional | `[STUBBED]` | Resident | `VisitorHistory.jsx` | No |
| M6 | Visitor history `handleRowClick()` is a no-op — no visitor detail modal exists | `[STUBBED]` | Resident | `VisitorHistory.jsx` | No |
| M7 | BulkInviteWizard only accepts CSV guest input — no manual single-guest entry option | `[MISSING]` | Resident | `BulkInviteWizard.jsx` | No |
| M8 | Password change not protected by MFA re-verification — only checks MFA status | `[MISSING]` | Resident | `Settings.jsx` (security tab) | No |
| M9 | Settings tabs (notifications, accessibility) use generic mock success — actual `PUT /api/preferences` call not confirmed | `[STUBBED]` | Resident | `Settings.jsx` | Maybe |
| M10 | Visitor confirmation POST has no offline queue — submission silently lost if offline at confirmation step | `[MISSING]` | Public | `VisitorInvitePage.jsx` | No |
| M11 | Generic "Invite Not Available" shown for all error cases (expired, already-used, invalid token) — no specific feedback | `[STUBBED]` | Public | `VisitorInvitePage.jsx` | No |
| M12 | sessionStorage invite cache has no TTL — stale invite data can be served indefinitely | `[MISSING]` | Public | `VisitorInvitePage.jsx` | No |
| M13 | QR code display has no `alt` text; status changes have no `role="alert"` ARIA live region | `[MISSING]` | Public | `QRCodeDisplay.jsx`, `VisitorInvitePage.jsx` | No |
| M14 | `BulkOperationsPanel`, `AdvancedSearchPanel`, `DataExportPanel` have routes in `App.js` but no admin sidebar links | `[DISCONNECTED]` | Admin | Three admin panel files | No |
| M15 | No fine-grained UI permission checks — all admins see all admin functions regardless of sub-role | `[MISSING]` | Admin | `AdminDashboard.jsx` | No |
| M16 | `IntegrationsHub.jsx` uses `alert()` and `console.error()` for errors instead of toast context | `[STUBBED]` | Admin | `IntegrationsHub.jsx` | No |
| M17 | Dwell clicking and switch scanning frameworks built in `AccessibilityProvider` but disabled | `[STUBBED]` | Cross-cutting | `AccessibilityProvider.jsx` | No |
| M18 | Dev proxy target hardcoded to `localhost:3001` in `setupProxy.js` — not configurable via env var | `[MISSING]` | Cross-cutting | `setupProxy.js` | No |
| M19 | Cookie consent categories hardcoded — no versioning of consent text (legal risk if text changes) | `[MISSING]` | Cross-cutting | `CookieConsentBanner.jsx` | No |
| M20 | CSRF token not explicitly invalidated on logout | `[MISSING]` | Cross-cutting | Auth flow / `apiClient.js` | No |
| M21 | i18n directory and locale files (sw/fr/ar) exist but are used in **zero** pages or components | `[MISSING]` | Cross-cutting | `client/src/i18n/` | No |

---

### 7.4 Low Severity Gaps

| # | Gap | Flag | Role | File/Feature | Backend dep? |
|---|-----|------|------|-------------|-------------|
| L1 | `MFASetupGuide.jsx` not linked in main guard navigation — only reachable by direct URL | `[DISCONNECTED]` | Guard | `MFASetupGuide.jsx` | No |
| L2 | `RecurringPassValidator.jsx` imported in guard pages but never rendered | `[STUBBED]` | Guard | `RecurringPassValidator.jsx` | No |
| L3 | `FavoriteVisitors` delete action has no confirmation dialog | `[MISSING]` | Resident | `FavoriteVisitors.jsx` | No |
| L4 | Route pattern inconsistency: `/dashboard/resident` for dashboard vs `/resident/*` for sub-pages; no centralized route constants file | `[DISCONNECTED]` | Resident | `App.js`, all resident routes | No |
| L5 | No `@media print` CSS — QR code pass will not print at correct size | `[MISSING]` | Public | Global styles | No |
| L6 | `SavePassModal` exports QR at 140px base size — no contrast validation on output PDF/PNG | `[MISSING]` | Public | `SavePassModal.jsx` | No |
| L7 | `NotificationPreferences.jsx` and `ActivityDashboard.jsx` are 1-line stubs left in codebase | `[REMOVED]` | Admin | Two stub files | No |
| L8 | Role-specific layout files (`GuardLayout.jsx`, `ResidentLayout.jsx`, `AdminLayout.jsx`) exist but are bypassed — all routes use manual AppShell wrapping | `[DISCONNECTED]` | Cross-cutting | Layout files | No |

---

### 7.5 Top 10 Immediate Actions (Priority Order)

1. **Fix `GuardAnalytics.jsx`** — delete empty file and remove route from App.js (or implement) [C1]
2. **Add Web Push fallback for walk-in approval requests** — resident with closed browser must receive push notification [C2]
3. **Replace `window.prompt()` in ResidentApprovalsPanel** with modal dialog [H5]
4. **Wire disconnected admin pages to navigation**: WatchlistManagement, RoleManagement, AccessControl, PolicyManagement, SiteManagement, IncidentManagement, and collaboration suite [H10–H13, H21]
5. **Implement AuditLogs.jsx** — stub placeholder is a compliance gap [H9]
6. **Fix WebSocket subscriptions in ResidentApprovalsPanel** (`subscribeVisitors` must be enabled for walk-in approval events) [H6]
7. **Confirm backend endpoints** for ShiftHandover, WalkInRegistration approval, and ActivityLog data formats [H1–H3]
8. **Replace IntegrationsHub `alert()` calls** with toast/error context [M16]
9. **Add `.env.example`** template to client directory [H18]
10. **Enable i18n in public visitor pages** — at minimum English + Swahili for Kenya market [H7, M21]

---

## Section 8: Production Readiness Summary

### 8.1 Area-by-Area Readiness Table

| Area | Status | Key Finding |
|------|--------|-------------|
| **Guard role — core operations** | Partial | QR scan, manual check-in, walk-in, incident, shift handover all implemented; SSE has no reconnect backoff; bulk checkout loops N API calls |
| **Guard role — analytics** | **Fail** | GuardAnalytics.jsx is empty (0 bytes); route renders blank page |
| **Resident role — invitations** | Pass | Quick invite, bulk invite, bulk wizard fully functional; phone normalisation and validation present |
| **Resident role — approvals** | **Fail** | Walk-in approval notification is WebSocket-only; resident with closed browser never receives requests; `window.prompt()` rejection UX is unacceptable |
| **Resident role — history & settings** | Partial | Visitor sort/row-click are stubs; some settings tabs use mock success |
| **Public visitor flow** | Partial | Token/invite journeys functional; QR generation working; confirmation offline queue absent; Swahili/Arabic/French absent |
| **Admin dashboard — core** | Partial | Metrics, approvals, guard/resident CRUD, visitor log, reports all functional; audit log is a stub |
| **Admin dashboard — advanced tools** | **Fail** | 10+ completed pages (WatchlistManagement, RoleManagement, AccessControl, PolicyManagement, MessagingSystem, etc.) completely unreachable — built but never wired into navigation |
| **Super admin** | Pass | Multi-estate, global user search, estate status management, impersonation all functional |
| **Authentication** | Pass | httpOnly cookies, FSM state machine, MFA (TOTP + backup codes), CSRF, token refresh with dedup — production grade |
| **Real-time / WebSocket** | Partial | Socket pool, event normalisation, reconnect logic implemented; events lost while disconnected; no ACK; SSE and WebSocket active simultaneously on guard dashboard |
| **PWA / Offline** | Partial | IndexedDB stores, background sync queue, PWAManager all functional; no data staleness indicator; conflict resolution absent |
| **Notifications** | Partial | Three-layer system implemented; Web Push functional; dual parallel systems create duplication risk; no user preferences UI |
| **Accessibility (WCAG 2.1 AA)** | Partial | Strong foundation (focus trap, ARIA, high contrast, skip links, keyboard shortcuts); dwell/switch input disabled; no axe-core CI testing |
| **Compliance (GDPR)** | Partial | Cookie consent, privacy rights (export, deletion, audit, breach), consent banner implemented; no consent text versioning |
| **Compliance (KDPA)** | **Fail** | Kenya Data Protection Act 2019 requirements entirely absent; age gating, KDPA-specific rights, and timelines not implemented |
| **i18n / Internationalisation** | **Fail** | Locale files for sw/fr/ar exist but are used in zero pages; entire app is English-only despite Kenya market target |
| **Error handling** | Partial | Global error context and `handleApiError()` used broadly; IntegrationsHub uses `alert()`; SuperAdminDashboard uses bare `console.error` |
| **Build & configuration** | Partial | Standard CRA build functional; no `.env.example`; dev proxy target hardcoded; no bundle size budgets |
| **Security** | Pass | httpOnly cookies (XSS-resistant), CSRF headers, Helmet.js, rate limiting configurable, MFA enforced for admin/guard/super_admin |

---

### 8.2 Role-by-Role Readiness Score

| Role | Score | Blocking issues |
|------|-------|----------------|
| **Guard** | 7/10 | GuardAnalytics blank page; SSE no backoff; bulk checkout N calls |
| **Resident** | 6/10 | Walk-in approval notification failure; `window.prompt()` UX; sort stub |
| **Public Visitor** | 6/10 | No i18n; offline confirmation queue absent; ARIA gaps |
| **Admin** | 5/10 | 10+ pages disconnected; AuditLogs stub; collaboration system unreachable |
| **Super Admin** | 8/10 | Functional; minor: bare `console.error` in error paths |
| **Cross-cutting** | 6/10 | Dual notification systems; KDPA absent; i18n unused; offline conflict |

**Overall system readiness: 6/10 — Not production-ready**

---

### 8.3 Recommended Fix Order

#### P1 — Blockers (must fix before any production traffic)

| # | Fix | Effort |
|---|-----|--------|
| P1.1 | Delete/implement `GuardAnalytics.jsx`; remove empty route | 1h |
| P1.2 | Add Web Push fallback to walk-in approval notification flow | 1 day |
| P1.3 | Replace `window.prompt()` with modal in ResidentApprovalsPanel | 2h |
| P1.4 | Fix `subscribeVisitors` flag in ResidentApprovalsPanel WebSocket config | 1h |
| P1.5 | Wire disconnected admin pages to navigation (WatchlistManagement, RoleManagement, AccessControl, PolicyManagement, SiteManagement, IncidentManagement, Collaboration suite) | 1 day |
| P1.6 | Confirm and test backend endpoints: `/api/guards/shifts`, `/api/guards/handover`, `/api/visitors/{id}/request-approval` | 2h |
| P1.7 | Replace `alert()` / `console.error` error handling in IntegrationsHub and SuperAdminDashboard | 2h |

#### P2 — High priority (fix before beta launch)

| # | Fix | Effort |
|---|-----|--------|
| P2.1 | Implement AuditLogs.jsx (reads from `GET /api/audit-logs`) | 1 day |
| P2.2 | Enable SSE exponential backoff reconnect in GuardDashboard | 3h |
| P2.3 | Add `POST /api/visitors/bulk-checkout` backend endpoint + update BulkCheckout.jsx | 1 day |
| P2.4 | Implement OTP visitor search via dedicated backend endpoint instead of client-side loop | 4h |
| P2.5 | Add offline confirmation queue to `VisitorInvitePage.jsx` | 4h |
| P2.6 | Add i18n to public visitor pages (minimum: English + Swahili) | 2 days |
| P2.7 | Enforce MFA re-verification before password change in Settings | 2h |
| P2.8 | Add `.env.example` to client and document all env vars | 1h |
| P2.9 | Add session-expiry auto-logout on persistent 401 errors | 3h |
| P2.10 | Add data staleness timestamp to all offline-cached screens | 2h |

#### P3 — Production polish (fix before GA release)

| # | Fix | Effort |
|---|-----|--------|
| P3.1 | Implement KDPA-specific compliance features (age gating, DPA-specific rights) | 3 days |
| P3.2 | Wire i18n provider to PreferenceContext and apply to all pages | 3 days |
| P3.3 | Add WebSocket message queue for events missed during disconnection | 2 days |
| P3.4 | Consolidate dual notification services; define and document routing precedence | 1 day |
| P3.5 | Add axe-core to CI pipeline for automated accessibility regression testing | 4h |
| P3.6 | Add ARIA live regions and `alt` text to public QR code flow | 3h |
| P3.7 | Implement visitor sort + detail modal in VisitorHistory (both roles) | 1 day |
| P3.8 | Add consent text versioning to CookieConsentBanner | 3h |
| P3.9 | Add offline conflict resolution logic to syncService | 1 day |
| P3.10 | Make dev proxy configurable via env var in setupProxy.js | 1h |
| P3.11 | Implement `@media print` CSS for QR pass pages | 2h |

---

### 8.4 Executive Summary

The Secure Gate frontend is **architecturally sound** — the provider stack, auth FSM, WebSocket layer, offline stores, and PWA infrastructure are well-designed and largely production-grade. The Guard and Resident core workflows (QR scan, manual check-in, walk-in registration, quick invite, bulk invite, approvals) are functionally complete.

**The primary production blockers are integration gaps, not architectural failures:**

1. **10+ admin pages** are fully built but completely unreachable because they were never wired into the navigation sidebar. These represent weeks of completed work that users cannot access.
2. **Walk-in approval notification** relies solely on WebSocket — the core resident approval use case fails entirely when the browser is closed.
3. **i18n infrastructure exists but is unused** — a Kenya-market product with English-only public pages is a significant UX gap.
4. **KDPA compliance is absent** — the backend has GDPR controls but Kenya's distinct data protection requirements are unimplemented.

With the P1 blockers resolved, the system can handle production traffic. Full GA readiness requires P2 completion. P3 items represent the difference between a functional product and a polished, legally compliant one.
