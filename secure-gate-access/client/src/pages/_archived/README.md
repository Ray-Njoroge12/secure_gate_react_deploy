# Archived Components

Components moved here are not currently in use but preserved for reference.
Archived on: November 24, 2025

## Files

### AddVisitorEnhanced.jsx
- **Lines:** 329
- **Purpose:** Experimental enhanced visitor form with real-time validation
- **Status:** Superseded by AddVisitorWizard.jsx (multi-step) and AddVisitor.jsx (simple form)
- **Features:** ValidatedForm, real-time validation, immediate pass generation

### VisitorHistoryEnhanced.jsx
- **Lines:** 587
- **Purpose:** Progressive loading demo for visitor history
- **Status:** Features merged into VisitorHistoryWithFilters.jsx
- **Features:** Progressive loading, advanced skeletons, performance monitoring

### SettingsWizard.jsx
- **Lines:** 715
- **Purpose:** Multi-step admin settings configuration
- **Status:** Future feature - not yet implemented
- **Features:** Profile, notifications, security, integrations sections

## Revival Process

To restore a component:
1. Review current alternatives to ensure no duplication
2. Check for API changes since archival
3. Update imports and dependencies
4. Test thoroughly before re-integrating
5. Remove from archive only after successful integration

## Why Archived

These components were archived as part of Sprint 1 frontend cleanup:
- Not imported or used anywhere in the codebase
- Creating maintenance confusion
- Adding unnecessary bundle size
- Duplicating functionality available in other components
