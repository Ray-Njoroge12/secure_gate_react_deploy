# Component Documentation: UI Foundation

## Purpose
This document is a concise reference for the core UI foundation components in the client app. It replaces older status-heavy notes with a maintainable map of what exists, where it lives, and how to verify changes.

Last updated: 2026-03-23

## Scope
Primary components covered:
- `src/components/ui/AdaptiveComponent.jsx`
- `src/components/ui/LayoutManager.jsx`
- `src/components/dashboard/DashboardControls.jsx`
- `src/components/dashboard/DashboardWidget.jsx`
- `src/components/dashboard/DashboardFoundation.jsx`

Related test areas:
- `src/__tests__/properties/`
- `src/__tests__/properties/offline-functionality-preservation.test.js`
- `src/__tests__/properties/dashboard-customization-persistence.test.js`
- `src/__tests__/properties/role-content-display.test.js`

## Architecture Snapshot
The UI foundation is organized in layers:
1. Base adaptive behavior: `AdaptiveComponent`
2. Layout and grid behavior: `LayoutManager`
3. Widget building blocks: `DashboardWidget`
4. Dashboard-level orchestration: `DashboardFoundation`
5. User controls and actions: `DashboardControls`

## Component Reference

### AdaptiveComponent
Location: `src/components/ui/AdaptiveComponent.jsx`

Purpose:
- Selects appropriate render variants by role, device, and accessibility context.

Typical inputs:
- Role-based variants
- Responsive variants
- Accessibility variants
- Permission guards

Typical dependencies:
- `useAuth()`
- `useResponsive()`
- Accessibility/theme context hooks used by the caller

When to use:
- You need one entry component to fan out into role, device, and accessibility-specific views.

### LayoutManager
Location: `src/components/ui/LayoutManager.jsx`

Purpose:
- Manages dashboard grid behavior, including drag/resize and persistence hooks.

Typical inputs:
- `layout`
- `onLayoutChange`
- Drag and resize toggles

When to use:
- You need user-customizable dashboard layout behavior.

### DashboardControls
Location: `src/components/dashboard/DashboardControls.jsx`

Purpose:
- Exposes dashboard actions (add, reset, import, export) and save-state cues.

Typical inputs:
- `onAddWidget`
- `onResetLayout`
- `onExportDashboard`
- `onImportDashboard`
- `lastSaved`
- `role`
- `simplified`

When to use:
- You need consistent top-level dashboard action controls across roles.

### DashboardWidget
Location: `src/components/dashboard/DashboardWidget.jsx`

Purpose:
- Reusable widget shell with shared loading, error, and action affordances.

Typical inputs:
- Widget title and content
- Optional actions
- Loading and error state props

When to use:
- You are building a panel that should conform to dashboard widget standards.

### DashboardFoundation
Location: `src/components/dashboard/DashboardFoundation.jsx`

Purpose:
- Composes layout manager, widget rendering, and control surfaces into a role-aware dashboard container.

Typical inputs:
- Dashboard data by widget
- Widget action handlers
- Optional custom widget components

When to use:
- You need a full dashboard scaffold with role-aware defaults and persistence.

## Usage Notes
- Prefer extending existing widget patterns before introducing new dashboard scaffolding.
- Keep role-specific differences in data and props first; duplicate structure only when required.
- Preserve accessibility semantics already present in foundation components when adding custom content.

## Testing Guidance
Run targeted suites when changing foundation components:

```bash
# Property and behavior-focused checks
npm test -- --watchAll=false --testPathPattern=properties

# Focused integration checks
npm test -- --watchAll=false --runTestsByPath \
  src/__tests__/pages/LoginPage.test.jsx \
  src/__tests__/pages/RegistrationPage.test.jsx \
  src/__tests__/pages/SuperAdminDashboard.test.jsx \
  src/__tests__/pages/IntegrationsHub.test.jsx \
  src/__tests__/integration/WalkInRegistration.integration.test.jsx
```

## Maintenance Checklist
When editing these components:
1. Keep props backward-compatible unless migration is intentional.
2. Validate role behavior for admin, guard, and resident paths.
3. Re-run targeted tests and at least one broader suite.
4. Update this document only when component surface area or file locations change.

## Changelog
- 2026-03-23: Trimmed the legacy long-form document, removed outdated status prose, and retained verified file references plus practical guidance.
