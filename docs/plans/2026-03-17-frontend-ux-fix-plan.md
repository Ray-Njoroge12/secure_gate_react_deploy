# Frontend UX Fix Plan
**Date:** 2026-03-17
**Status:** Planning — Pre-Figma
**Source:** `docs/frontend-ux-analysis.md`

This document translates the full UI/UX analysis into a scoped, actionable fix plan. Each fix is described with: the problem, exact file(s) affected, what to change, and acceptance criteria. Fixes are grouped by tier (P0 through P3) and by role where relevant.

---

## How to Use This Document

1. **P0 items** must be resolved before any Figma design work begins — they are functional/safety issues
2. **P1 items** are the core UX fixes that will inform Figma screen redesigns
3. **P2 items** are design system consistency work — done once in Figma first, then applied in code
4. **P3 items** are enhancements — defer until after P0/P1/P2 pass is complete

Each fix has an `[ ]` checkbox for tracking progress.

---

## P0 — Ship Blockers

These are functional failures that can mislead users or block critical workflows.

---

### [P0-01] Walk-In Resident Lookup Silent Failure

**Problem:** When a guard registers a walk-in visitor and enters a house number that doesn't match any resident, the approval request silently fails. The guard receives no feedback and the resident never receives a notification.

**Affected File:** `secure-gate-access/client/src/pages/guard/WalkIn.jsx`

**What to Change:**
- After the API call to submit a walk-in, check the response for a failed resident lookup case (likely a 404 or a `resident_not_found` error code from the server)
- Display a clear inline error beneath the house number field: *"No resident found at [house number]. Please verify with the visitor and try again."*
- Block the form from submitting if the house number field is empty
- If the approval request is sent but the server returns that no resident was notified, show a warning banner: *"Registration saved. Resident could not be notified — please contact them manually."*

**Acceptance Criteria:**
- Guard sees a field-level error if house number is invalid before submission
- Guard sees a clear post-submission warning if the resident notification failed
- Guard is never left in an ambiguous state about whether the approval was sent

---

### [P0-02] Shift Handover Dead End When No Active Shift

**Problem:** If a guard visits `/dashboard/guard/shift-handover` without an active shift, the page shows an empty state with only a "Go to Dashboard" button. There is no way to start a shift from this page.

**Affected File:** `secure-gate-access/client/src/pages/guard/ShiftHandover.jsx`

**What to Change:**
- In the no-active-shift empty state, replace the single "Go to Dashboard" button with two options:
  - **"Start Shift"** — calls the shift start API and then loads the handover form
  - **"Go to Dashboard"** — existing behavior
- Add a loading state while the shift start API call is in flight
- On shift start success, transition to the active shift view with a toast: *"Shift started successfully."*
- On shift start failure, show an inline error with a retry option

**Acceptance Criteria:**
- Guard can initiate a shift directly from the Shift Handover page
- No dead-end empty states with single navigation options

---

### [P0-03] Visitor QR Code Expiry Not Validated

**Problem:** The visitor-facing invite page (`/v/:token`) displays a QR code without first checking whether the invite has expired. An expired pass produces a QR code that will fail at the gate with no explanation.

**Affected File:** `secure-gate-access/client/src/pages/public/VisitorInvitePage.jsx`

**What to Change:**
- After fetching the invite data, check `invite.expiresAt` (or equivalent field) against `Date.now()`
- If expired, replace the QR code display with an expiry screen:
  - Heading: *"This invitation has expired"*
  - Body: *"This pass was valid until [date]. Please ask your host to send a new invitation."*
  - No QR code rendered
- If the invite is within 30 minutes of expiry, show a dismissible warning banner above the QR code: *"This pass expires in [X] minutes."*

**Acceptance Criteria:**
- Expired invites never display a QR code
- Visitor sees a clear, actionable message on expiry
- Near-expiry invites show a countdown warning

---

### [P0-04] Estate Suspension Consequences Not Shown

**Problem:** When a super admin clicks "Suspend" on an estate, the confirmation dialog shows a generic message without explaining what actually happens to residents, guards, and active sessions.

**Affected File:** `secure-gate-access/client/src/pages/admin/SuperAdminDashboard.jsx`

**What to Change:**
- Replace the generic confirmation dialog for estate suspension with an impact summary modal showing:
  - Number of active users affected (residents + guards)
  - Number of pending visitor invites that will be invalidated
  - Explicit statement: *"All users in this estate will lose access immediately. Active sessions will be terminated."*
  - Two buttons: **"Suspend Estate"** (danger/red) and **"Cancel"**
- If the estate stats cannot be fetched, show a fallback warning: *"Proceeding will immediately suspend all access for this estate."*
- Same treatment for the Decommission action — show an irreversibility warning

**Acceptance Criteria:**
- Super admin sees user/invite impact counts before confirming suspension
- Decommission action explicitly warns it is irreversible
- Cancelling from either modal leaves the estate status unchanged

---

## P1 — High Impact UX Fixes

These fixes eliminate the most common friction points across all roles.

---

### [P1-01] Silent Save — Add Toast Feedback to All Profile/Settings Updates

**Problem:** Profile updates, settings changes, and CRUD operations complete silently across Guard, Resident, and Admin settings pages. Users don't know if anything was saved.

**Affected Files:**
- `secure-gate-access/client/src/pages/guard/Settings.jsx`
- `secure-gate-access/client/src/pages/resident/Settings.jsx` (or equivalent)
- `secure-gate-access/client/src/pages/admin/Settings.jsx`
- `secure-gate-access/client/src/pages/admin/ManageGuards.jsx`
- `secure-gate-access/client/src/pages/admin/ManageResidents.jsx`

**What to Change:**
- After each successful API call (profile update, password change, notification toggle, system setting save), call `toast.success("Saved successfully")` using the existing `ToastContext`
- After each failed API call, call `toast.error("Failed to save. Please try again.")` with the specific error message if available
- For multi-field forms (Settings tabs), show a single save confirmation per tab submit, not per field
- CRUD modals (Add Guard, Edit Resident) should show a success toast and close automatically on success; on error, keep the modal open with the error displayed inline

**Acceptance Criteria:**
- Every save action produces visible feedback within 300ms
- Success toasts auto-dismiss after 3 seconds
- Error toasts persist until dismissed or the action succeeds

---

### [P1-02] Replace All Emoji Icons with Text + Icon Combinations

**Problem:** Emojis are used as primary visual indicators for incident categories (Guard Incidents), relationship types (Resident Favorites), and feature icons. Emojis do not have consistent alt text and fail WCAG 2.1 SC 1.1.1.

**Affected Files:**
- `secure-gate-access/client/src/pages/guard/Incidents.jsx`
- `secure-gate-access/client/src/pages/resident/FavoriteVisitors.jsx`
- `secure-gate-access/client/src/pages/admin/MFASetup.jsx` (🔐 usage)
- Any component using emoji as a functional icon

**What to Change:**
- Replace emoji category icons in Incidents with SVG icons from the existing `Icon` component + a visible text label
  - `🚨` (suspicious) → shield-alert icon + "Suspicious"
  - `📄` (document) → file icon + "Document Issue"
  - Each incident category badge: `<Icon name="shield-alert" aria-hidden="true" /> Suspicious`
- Replace relationship type emojis in FavoriteVisitors with text badges or simple SVG icons
  - Family, Friend, Colleague, etc. — use a color-coded text badge instead
- Add `aria-label` to any remaining icon-only buttons
- Decorate purely visual emojis with `aria-hidden="true"` if they are not the sole indicator of meaning

**Acceptance Criteria:**
- No emoji is the sole indicator of meaning in any UI element
- All icon buttons have `aria-label` or visible text labels
- Screen reader announces meaningful descriptions for all status/category indicators

---

### [P1-03] Add Search to All Large Admin Tables

**Problem:** The guards table, residents table, incidents table, and audit logs table have no search capability. With hundreds of records, users must scroll to find entries.

**Affected Files:**
- `secure-gate-access/client/src/pages/admin/ManageGuards.jsx`
- `secure-gate-access/client/src/pages/admin/ManageResidents.jsx`
- `secure-gate-access/client/src/pages/admin/IncidentManagement.jsx`
- `secure-gate-access/client/src/pages/admin/AuditLogs.jsx`
- `secure-gate-access/client/src/pages/admin/WatchlistManagement.jsx`

**What to Change:**
- Add a search input above each table (already exists as a pattern in ManageResidents — replicate to others)
- Search should filter client-side for small datasets (<500 records) or call a server-side search API for larger ones
- Search input should be debounced (300ms) to avoid excessive API calls
- Show a result count below the search bar: *"Showing X of Y results"*
- When a search is active and returns zero results, show an empty state with a "Clear search" button
- For AuditLogs, add a user email filter in addition to the existing action type and date filters

**Acceptance Criteria:**
- Admin can find any guard/resident/incident by typing a partial name or email
- Search is debounced and doesn't block UI
- Zero-result state is handled gracefully with a clear recovery action

---

### [P1-04] Add Breadcrumb Navigation to All Deep Routes

**Problem:** Deep routes (e.g., `/admin/watchlist`, `/dashboard/guard/shift-handover`, `/resident/bulk-invite-wizard`) have no breadcrumb trail. Users cannot tell where they are in the information hierarchy or navigate up.

**Affected Files:**
- `secure-gate-access/client/src/layouts/AppShell.jsx`
- `secure-gate-access/client/src/contexts/NavigationContext.jsx` (or equivalent)
- All deep page components (set their own breadcrumb data)

**What to Change:**
- The `NavigationContext` already tracks breadcrumbs but the feature is underused — wire it up:
  1. Each page component calls `setBreadcrumbs([...])` on mount via `useNavigation()` hook
  2. `AppShell` renders a `<Breadcrumbs>` component below the Topbar (using the existing `EnhancedBreadcrumbs` UI component)
- Breadcrumb examples:
  - Guard: `Dashboard > Shift Handover`
  - Admin: `Dashboard > Guards > John Doe > Edit`
  - Resident: `Dashboard > Bulk Invite > Event Setup`
- Home/Dashboard link always present as first crumb
- On mobile, collapse to show only the last crumb with a `<` back arrow

**Acceptance Criteria:**
- Every non-dashboard page shows at least two breadcrumb levels
- Breadcrumb links are navigable and reflect actual URL paths
- Mobile shows compact breadcrumb with back arrow

---

### [P1-05] Approval Timeout / Resident Not Responding

**Problem:** When a guard registers a walk-in and requests resident approval, the resident can ignore it indefinitely. The guard and visitor wait with no escalation path.

**Affected Files:**
- `secure-gate-access/client/src/pages/resident/Approvals.jsx` (or `ApprovalsPanel`)
- `secure-gate-access/client/src/pages/guard/WalkIn.jsx`

**What to Change:**
**Resident side:**
- Show a timestamp on each pending approval request: *"Requested 4 minutes ago"*
- After a configurable threshold (suggested: 5 minutes), visually escalate the card (yellow warning border, "Urgent" badge)
- Add a push notification reminder if the resident hasn't responded within 3 minutes (this may require backend config — flag as a backend dependency)

**Guard side:**
- In the Walk-In success/pending state, show the elapsed time since approval was requested
- Add a **"Re-notify Resident"** button that re-sends the approval notification (debounced to once per 2 minutes)
- Add a **"Override & Admit"** button (shown after configurable timeout, e.g., 10 minutes) that requires guard supervisor PIN or elevated permission

**Acceptance Criteria:**
- Resident sees how long a request has been waiting
- Guard can re-notify the resident without starting a new walk-in flow
- System provides an escalation path when no response comes

---

### [P1-06] Dashboard Empty State Wrong CTA (Resident)

**Problem:** When a resident has no visitors, the dashboard empty state links to "Register Walk-In" which is a guard-only feature. Residents clicking this will navigate to an unauthorized route.

**Affected File:** `secure-gate-access/client/src/pages/resident/ResidentDashboard.jsx`

**What to Change:**
- Find the empty state component in ResidentDashboard
- Replace the "Register Walk-In" CTA with **"Invite a Visitor"** → navigates to `/resident/quick-invite`
- Secondary CTA: **"Invite an Event Group"** → navigates to `/resident/bulk-invite`
- Optionally add a third shortcut: **"See your favorites"** → `/resident/favorite-visitors` (if favorites exist)

**Acceptance Criteria:**
- No resident-facing CTA points to a guard-only route
- Empty state CTAs all navigate to valid resident routes

---

### [P1-07] Replace Visitor History Polling with WebSocket

**Problem:** The resident visitor history page polls `/api/visitors` every 10 seconds. With many active residents this will create significant API load and degrade performance at scale.

**Affected File:** `secure-gate-access/client/src/pages/resident/VisitorHistory.jsx` (or service layer)

**What to Change:**
- Remove the `setInterval` polling pattern from the visitor history data fetch
- Subscribe to the existing WebSocket namespace (`/residents`) for visitor status change events
- On `visitor:updated`, `visitor:checked_in`, `visitor:checked_out` events — update the affected row in the existing data without a full page reload
- If WebSocket is unavailable (offline), fall back to a manual "Refresh" button rather than automatic polling
- Add a subtle "Live" indicator badge near the table title when WebSocket is connected

**Acceptance Criteria:**
- Visitor history no longer polls the API on a timer
- Status changes from guard actions appear in the resident history within 2 seconds via WebSocket
- Offline state shows a manual refresh button instead of auto-polling

---

### [P1-08] Add Bulk Operations to Admin Guard/Resident Management

**Problem:** Admin cannot select multiple guards or residents to activate, deactivate, or delete in batch. Every operation is performed one record at a time.

**Affected Files:**
- `secure-gate-access/client/src/pages/admin/ManageGuards.jsx`
- `secure-gate-access/client/src/pages/admin/ManageResidents.jsx`
- `secure-gate-access/client/src/pages/admin/PendingApprovals.jsx`

**What to Change:**
- Add a checkbox column to each table (first column, header checkbox = select all visible)
- When 1+ rows are selected, show a bulk action bar above the table:
  - **ManageGuards:** "Activate Selected", "Deactivate Selected", "Delete Selected"
  - **ManageResidents:** "Activate Selected", "Deactivate Selected", "Send Email to Selected", "Delete Selected"
  - **PendingApprovals:** "Approve All Selected" (requires one estate selection for the batch), "Reject All Selected"
- Bulk actions require a confirmation dialog showing the count: *"Deactivate 7 guards? This will prevent their logins."*
- Show a progress indicator for bulk API calls (some may be done individually in a loop)
- After bulk operation, show a summary toast: *"5 of 7 guards deactivated. 2 failed — see details."*
- If any records fail, provide a "Download Failures" CSV option

**Acceptance Criteria:**
- Admin can select multiple records and apply an action in one step
- Bulk actions have confirmation with impact count
- Partial failures are surfaced clearly

---

### [P1-09] MFA Disable Should Require 2FA Token, Not Just Password

**Problem:** Disabling MFA on any role (Guard, Resident, Admin) only requires the user's password. This allows an attacker with a stolen password to disable the second factor — defeating the purpose of MFA.

**Affected Files:**
- `secure-gate-access/client/src/pages/guard/Settings.jsx`
- `secure-gate-access/client/src/pages/resident/Settings.jsx`
- `secure-gate-access/client/src/pages/admin/Settings.jsx`

**What to Change:**
- In the "Disable MFA" modal, add a second input field for the current TOTP code (6-digit)
- Label it: *"Enter your current authenticator code to confirm"*
- Submit both the password and the TOTP token to the server
- If server returns an error for invalid TOTP, show: *"Authenticator code incorrect. Please try again."*
- Backup code should also be accepted as an alternative (for users who lost their device)

**Acceptance Criteria:**
- Disabling MFA requires both current password AND a valid TOTP code
- Backup codes are accepted in place of TOTP
- Error messaging distinguishes password error from TOTP error

---

### [P1-10] IntegrationsHub Webhook Test Response Must Be User-Facing

**Problem:** When admin clicks "Test Webhook", the response is logged to the browser console only. Admin users are not expected to open DevTools.

**Affected File:** `secure-gate-access/client/src/pages/admin/IntegrationsHub.jsx`

**What to Change:**
- After clicking "Test Webhook", show a response panel inline below the webhook row (or in a modal):
  - HTTP status code (200, 404, 500, etc.)
  - Response time in ms
  - Response body (first 500 chars, truncated)
  - Timestamp of the test
- Color-code the result: green for 2xx, yellow for 3xx/4xx, red for 5xx/timeout
- Keep the last test result visible on the webhook row as a small status badge: *"Last tested: 2 min ago — 200 OK"*

**Acceptance Criteria:**
- Test results displayed in UI without DevTools
- Last test result persisted on the webhook list row
- Non-2xx responses clearly flagged

---

### [P1-11] PolicyManagement JSON Editor — Add Form Builder for Common Types

**Problem:** PolicyManagement requires admins to write raw JSON for policy conditions and actions. This is inaccessible to non-technical admins and error-prone.

**Affected File:** `secure-gate-access/client/src/pages/admin/PolicyManagement.jsx`

**What to Change:**
- For common policy types (`visitor_limit`, `access_restriction`, `alert_rule`), replace the raw JSON editor with a structured form:
  - **visitor_limit:** max count input + time window dropdown
  - **access_restriction:** zone multi-select + time range picker
  - **alert_rule:** event type dropdown + threshold input + notification channel checkboxes
- Keep a "Advanced / Edit JSON" toggle for power users who need raw JSON access
- Validate the form fields before allowing save and show field-level errors
- For `escalation_policy` (most complex type), keep JSON editor but add a schema hint panel

**Acceptance Criteria:**
- Non-technical admin can create a visitor limit or access restriction policy without writing JSON
- JSON toggle still available for advanced use
- Invalid JSON is caught before save with a clear error

---

### [P1-12] Remove Redundant MFA Setup Guide Page

**Problem:** `/dashboard/guard/mfa-setup` is a static text page that duplicates the MFA setup already available in Settings → Security. It adds a navigation item without adding value.

**Affected Files:**
- `secure-gate-access/client/src/App.js` (route definition)
- `secure-gate-access/client/src/components/Sidebar.jsx` (nav item removal)
- `secure-gate-access/client/src/pages/guard/MFASetupGuide.jsx` (can be deleted)

**What to Change:**
- Remove the route `/dashboard/guard/mfa-setup` from App.js
- Remove the corresponding nav item from the Guard sidebar config
- Any link pointing to this route should redirect to `/dashboard/guard/settings` with `?tab=security`
- The `MFASetupGuide.jsx` component can be archived or deleted

**Acceptance Criteria:**
- No sidebar link to `/dashboard/guard/mfa-setup`
- Any existing bookmarks or links redirect gracefully to Settings → Security
- MFA setup itself (the actual wizard) remains accessible via Settings

---

### [P1-13] Admin Incident Assign Requires Staff Dropdown, Not Free-Text ID

**Problem:** Assigning an incident to a staff member requires manually typing their staff ID. This is error-prone and unknown to most admins.

**Affected File:** `secure-gate-access/client/src/pages/admin/IncidentManagement.jsx`

**What to Change:**
- Replace the staff ID text input with a searchable dropdown
- Dropdown should be populated by fetching the list of active guards for the estate: `GET /api/admin/guards?status=active`
- Display each option as: `Full Name (username)` with role badge
- Persist the selected staff member's ID as the assignment value
- Show the assignee's name (not ID) in the incident row after assignment

**Acceptance Criteria:**
- Admin selects assignee from a list, not a free-text field
- Assigned incidents display the assignee's name
- Dropdown is searchable by name or username

---

## P2 — Design Consistency

These fixes establish the visual foundation that Figma designs will be built on.

---

### [P2-01] Migrate All Hardcoded Colors to Design Tokens

**Problem:** Components use hardcoded Tailwind colors (`blue-200`, `red-500`, `green-600`) instead of the semantic token system already defined in `design-system/styles.css`. This makes theme changes require touching every file.

**Affected Files:** Potentially every component in `components/ui/` and every page

**What to Change:**
- Audit all component files for hardcoded Tailwind color classes
- Replace with CSS variable references via the existing token system:
  - `bg-green-500` → `bg-[var(--color-brand-500)]` or a Tailwind `theme.extend` alias like `bg-brand-500`
  - `text-red-600` for errors → `text-[var(--color-error)]`
  - `bg-blue-50` for info cards → `bg-[var(--color-info-bg)]`
- Extend `tailwind.config.js` to map token CSS variables to Tailwind class names so classes like `bg-brand-500`, `text-success`, `border-error` work consistently
- Semantic tokens to define (if not already):
  - `--color-surface-primary`, `--color-surface-secondary`
  - `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
  - `--color-border-default`, `--color-border-focus`
  - `--color-status-success`, `--color-status-warning`, `--color-status-error`, `--color-status-info`
  - `--color-action-primary`, `--color-action-hover`, `--color-action-danger`

**Acceptance Criteria:**
- No hardcoded color in `components/ui/` — all colors via token classes
- Toggling light/dark theme changes all colors consistently
- No color regressions in any role's UI

---

### [P2-02] Consolidate Button Component Variants

**Problem:** Three overlapping button components exist (`Button`, `GradientButton`, `AccessibleButton`). Usage is inconsistent across the codebase.

**Affected Files:**
- `secure-gate-access/client/src/components/ui/Button.jsx`
- `secure-gate-access/client/src/components/ui/GradientButton.jsx`
- `secure-gate-access/client/src/components/ui/AccessibleButton.jsx`
- All pages/components importing any of the above

**What to Change:**
- Merge all three into a single `Button` component with a `variant` prop:
  - `variant="primary"` — solid brand color (replaces GradientButton for CTAs)
  - `variant="secondary"` — outlined/ghost
  - `variant="ghost"` — text-only
  - `variant="danger"` — red destructive actions
  - `variant="warning"` — yellow caution actions
- Add `size` prop: `sm`, `md` (default), `lg`
- Add `loading` prop: shows spinner and disables button
- Add `icon` and `iconPosition` props for icon+text buttons
- AccessibleButton features (aria-label enforcement, focus ring) merged into base Button
- GradientButton style becomes `variant="primary"` with optional `gradient` prop
- Update all imports across the codebase

**Acceptance Criteria:**
- One Button import used everywhere
- All existing button variations achievable via props
- No visual regression on any existing button usage

---

### [P2-03] Organize UI Components into Subdirectories

**Problem:** 86 components in a single flat `/components/ui/` directory makes discoverability and maintenance difficult.

**Affected Directory:** `secure-gate-access/client/src/components/ui/`

**What to Change:**
- Reorganize into subdirectories:
  - `ui/forms/` — Input, Select, Checkbox, Radio, FloatingLabelInput, ValidatedInput, ValidatedForm, EnhancedInput, FormWizard, FormStep, DatePicker
  - `ui/buttons/` — Button (consolidated), FAB, IconButton
  - `ui/feedback/` — Toast, ErrorAlert, ErrorQueue, LoadingSpinner, Skeleton, ProgressIndicator, LiveRegion
  - `ui/layout/` — Card, GradientCard, Modal, BottomSheet, Drawer, PageHeader
  - `ui/navigation/` — Breadcrumbs, EnhancedBreadcrumbs, BottomNav, TabNav, Pagination
  - `ui/data-display/` — Badge, Table, EmptyState, StatusChip, Avatar
  - `ui/overlays/` — Dropdown, Tooltip, HelpTooltip, Popover
- Create an `ui/index.js` barrel export maintaining all current named exports so no import paths break initially
- Update imports gradually — existing `import { Button } from '../../components/ui'` pattern continues to work via barrel file

**Acceptance Criteria:**
- All 86 components reachable via the barrel `ui/index.js`
- No broken imports after reorganization
- New components added to the correct subdirectory

---

### [P2-04] Standardize Status Terminology and Color Coding

**Problem:** Status names are inconsistent across roles (`active/inactive`, `checked_in/checked_out`, `on_premise`, `on-premise`). Colors are also inconsistent — red can mean danger, suspended, error, or delete.

**Affected Files:** Multiple — all pages displaying status badges

**What to Change:**
- Define a canonical status vocabulary in `client/src/constants/statuses.js`:
  ```
  USER_STATUSES:    active | inactive | pending | suspended
  VISITOR_STATUSES: pending | approved | checked_in | checked_out | cancelled
  INCIDENT_STATUSES: open | assigned | in_progress | resolved | escalated
  GUARD_STATUSES:   active | inactive | on_shift | off_shift
  ESTATE_STATUSES:  active | suspended | decommissioned
  ```
- Define a color mapping for each status in the token system:
  - `active`, `approved`, `checked_in`, `resolved` → green (`success`)
  - `pending`, `on_shift` → blue (`info`)
  - `inactive`, `cancelled`, `checked_out` → gray (`neutral`)
  - `suspended`, `escalated` → yellow (`warning`)
  - `decommissioned`, `open` (critical incidents) → red (`error`)
- Update all StatusChip/Badge components to use this mapping
- Ensure all status badges include both a color indicator AND a text label (never color alone)

**Acceptance Criteria:**
- Status terminology is identical across all roles for the same concept
- Every status badge has visible text (color is supplementary)
- Status colors follow the semantic token system

---

### [P2-05] AuditLogs Export Respects Current Filter

**Problem:** Clicking "Export CSV" in AuditLogs exports all log entries, ignoring any active date range or action type filter.

**Affected File:** `secure-gate-access/client/src/pages/admin/AuditLogs.jsx`

**What to Change:**
- Pass the current filter state (date from, date to, action type) as query parameters to the export API call
- Show the current filter context in the export button tooltip: *"Export filtered results (142 records)"*
- Add an "Export All" option separately (or remove it if not needed)

**Acceptance Criteria:**
- Exported CSV matches what is currently displayed in the filtered table
- Record count is shown before export

---

### [P2-06] Theme Change Takes Effect Immediately

**Problem:** Changing the theme in Admin/Guard/Resident Settings requires a page refresh.

**Affected Files:**
- `secure-gate-access/client/src/contexts/ThemeContext.jsx`
- All settings pages that call theme change

**What to Change:**
- Ensure `ThemeContext` applies the theme by toggling a class on `document.documentElement` (e.g., `class="dark"`) immediately on state change
- No page refresh should be needed — the CSS variable system will handle the rest
- If a refresh is currently needed due to a bug in the context implementation, fix the context so it reflects changes reactively

**Acceptance Criteria:**
- Theme switches visually in under 100ms with no reload
- The selected theme persists across page navigation within the session

---

### [P2-07] Reports Date Range Validation

**Problem:** The Reports date range picker allows selecting an end date before the start date, resulting in empty or incorrect results.

**Affected File:** `secure-gate-access/client/src/pages/admin/Reports.jsx`

**What to Change:**
- Set `min` attribute on the "To" date input to equal the current value of the "From" input
- On "From" change, if new "From" is after current "To", reset "To" to the new "From" date
- Show a validation message if the user somehow bypasses the above: *"End date must be after start date"*

**Acceptance Criteria:**
- Cannot submit a date range where end < start
- UI prevents invalid selection through input constraints

---

### [P2-08] Mobile Sidebar Auto-Close on Navigation

**Problem:** On mobile, clicking a sidebar link navigates to the new page but the sidebar overlay remains open, obscuring the page content.

**Affected File:** `secure-gate-access/client/src/components/Sidebar.jsx`

**What to Change:**
- In the sidebar's link click handler, call `onClose()` (or equivalent) after navigation
- Can use `useLocation()` from React Router — on location change, close the sidebar if `isMobile` is true
- Alternatively, wrap each `<NavLink>` in the sidebar with an `onClick` that triggers the close callback

**Acceptance Criteria:**
- Clicking any sidebar link on mobile closes the sidebar automatically
- The page below is visible immediately after navigation
- Does not close on desktop (no functional change to desktop behavior)

---

### [P2-09] Remove Unused Context Providers

**Problem:** `SearchProvider` and `UndoProvider` are wrapped around the entire app in `RootProvider` but are not used by any routes. They add unnecessary re-render surface area.

**Affected File:** `secure-gate-access/client/src/contexts/RootProvider.jsx`

**What to Change:**
- Confirm that no component imports `useSearch()` or `useUndo()` (grep across the codebase)
- If confirmed unused, remove both providers from the `RootProvider` nesting chain
- Remove or archive `SearchContext.jsx` and `UndoContext.jsx` (or leave the files but stop mounting them)
- Also remove the `security` role handling from `ProtectedRoute.jsx` since only `guard` exists in the system

**Acceptance Criteria:**
- `RootProvider` nesting reduced by 2 layers (from 14 to 12)
- No runtime errors after removal
- `guard` role redirects correctly; `security` role string no longer referenced

---

## P3 — Feature Enhancements (Post-Figma)

These are new capabilities to design and implement after the P0/P1/P2 pass is complete.

---

### [P3-01] MFA Session Countdown on MFAVerify Page

**Problem:** The MFA verification page has a 5-minute session window, but no timer is shown. Users are confused when the session expires mid-entry.

**Affected File:** `secure-gate-access/client/src/pages/MFAVerify.jsx`

**What to Change:**
- On page mount, read the `expiresIn` value from location state (default: 300 seconds)
- Display a countdown: *"Session expires in 4:32"*
- When countdown reaches 0, disable the input, show an expiry message, and provide a "Return to Login" button
- Optionally add a progress bar below the header showing time remaining visually

---

### [P3-02] Card Access Log Per Card in AccessControl

**Problem:** There's no way to see which zone a specific access card was used in, making it impossible to audit card usage patterns.

**Affected File:** `secure-gate-access/client/src/pages/admin/AccessControl.jsx`

**What to Change:**
- Add a "View Access Log" action to each card row
- Opens a modal/drawer showing the last N accesses: timestamp, zone, result (granted/denied)
- Filter by date range within the modal
- This requires a corresponding server-side endpoint: `GET /api/admin/access-cards/:cardId/log`

---

### [P3-03] Consolidate BulkInvite and BulkInviteWizard

**Problem:** Two separate pages handle bulk invitations with significant overlap. Users encounter both in the sidebar and are unclear which to use.

**Affected Routes:** `/resident/bulk-invite` and `/resident/bulk-invite-wizard`

**What to Change:**
- Merge both into a single `/resident/bulk-invite` route
- Step 1: Event details form (from current BulkInvite)
- Step 2: Add guests — two tabs: "Manual Entry" and "Paste CSV" (from BulkInviteWizard)
- Step 3: Review and generate
- Remove the standalone `/resident/bulk-invite-wizard` route
- Update sidebar to show one "Bulk Invite" link

---

### [P3-04] Report Scheduling (Email Delivery)

**Problem:** Admins must manually run reports. Common reporting needs (daily visitor summary, weekly incident log) require repeated manual effort.

**Affected File:** `secure-gate-access/client/src/pages/admin/Reports.jsx`

**What to Change:**
- Add a "Schedule Report" button in the Reports page
- Modal: frequency (daily, weekly, monthly), day/time, format (CSV/PDF), recipient email(s)
- Show list of saved schedules with edit/delete
- Requires server-side cron support (likely using existing Bull queue infrastructure)

---

### [P3-05] Watchlist Search and Filter

**Problem:** The watchlist has no search functionality. Admins with large watchlists cannot quickly find entries.

**Affected File:** `secure-gate-access/client/src/pages/admin/WatchlistManagement.jsx`

**What to Change:**
- Add a search bar filtering by name, phone, vehicle plate, or company
- Add a severity filter dropdown
- Add a category filter dropdown
- Show active filter count badge on filter button

---

### [P3-06] Visitor Confirmation Receipt

**Problem:** After a visitor confirms their invitation on `/v/:token`, they receive no receipt or confirmation via SMS/email.

**Affected File:** `secure-gate-access/client/src/pages/public/VisitorInvitePage.jsx` + server route

**What to Change:**
- After visitor successfully confirms visit, trigger a server-side notification (SMS or email) to the visitor's contact containing:
  - Visit date and time
  - Access code / QR code download link
  - Estate address and directions
  - Contact number for the gate guard

---

### [P3-07] SuperAdmin Settings — Promote Critical Configs to Dedicated Pages

**Problem:** Email SMTP configuration and Compliance/DPO settings are buried in Settings tabs that only super_admins can see. These are critical system configurations that need better discoverability.

**What to Change:**
- Create `/admin/system-config` page with tabs for: Email, SMS, Push, Webhooks
- Create `/admin/compliance` page for DPO info, data retention policies, ODPC registration
- Add both as top-level sidebar items in SuperAdmin navigation
- Move corresponding settings from the Settings page to these new dedicated pages

---

## Implementation Sequence

When executing these fixes, follow this order:

```
Phase 1 — Functional Fixes (P0)
  P0-01  Walk-in silent failure
  P0-02  Shift handover dead end
  P0-03  Visitor QR expiry
  P0-04  Estate suspension consequences

Phase 2 — Core UX (P1)
  P1-12  Remove redundant MFA guide page    ← quickest win
  P1-06  Dashboard empty state wrong CTA    ← quickest win
  P1-07  Replace visitor history polling
  P1-01  Silent save feedback (toasts)
  P1-02  Replace emoji icons
  P1-03  Add search to admin tables
  P1-04  Breadcrumb navigation
  P1-09  MFA disable security fix
  P1-05  Approval timeout/escalation
  P1-08  Bulk operations
  P1-13  Incident assign dropdown
  P1-10  Webhook test response
  P1-11  Policy form builder

Phase 3 — Design Consistency (P2)  [begin after Figma tokens are defined]
  P2-01  Design token migration
  P2-02  Button component consolidation
  P2-09  Remove unused providers
  P2-08  Mobile sidebar auto-close
  P2-06  Theme change immediate
  P2-07  Reports date validation
  P2-05  AuditLogs export filter
  P2-04  Status terminology
  P2-03  Component directory reorganization

Phase 4 — Enhancements (P3)  [post-launch or next sprint]
  P3-01  MFA countdown
  P3-02  Card access log
  P3-03  Bulk invite consolidation
  P3-04  Report scheduling
  P3-05  Watchlist search
  P3-06  Visitor confirmation receipt
  P3-07  SuperAdmin critical config pages
```

---

## Figma Scope (What These Fixes Mean for Design)

Before starting Figma work, P0 and P1-quick-wins (P1-06, P1-12) should be done in code since they don't require new designs. The Figma design session should cover:

| Figma Work Item | Informed by Fix(es) |
|-----------------|---------------------|
| Design token system (colors, typography, spacing) | P2-01, P2-04 |
| Button, Badge, Status component redesign | P2-02, P1-02, P2-04 |
| Toast / feedback pattern | P1-01 |
| Breadcrumb + navigation shell | P1-04 |
| Walk-In guard flow (error states, re-notify) | P0-01, P1-05 |
| Shift Handover (start shift CTA, end-of-shift validation) | P0-02 |
| Visitor token page (expiry state, near-expiry warning) | P0-03 |
| Estate suspension modal (impact summary) | P0-04 |
| Admin tables (search bar, bulk select, row actions) | P1-03, P1-08 |
| Quick Invite success screen (back button, sticky code) | resident analysis |
| Approval card (timeout indicator, re-notify button) | P1-05 |
| Incident management (category icons, assign dropdown) | P1-02, P1-13 |
| Mobile sidebar behavior | P2-08 |
| Policy form builder | P1-11 |
