# Client Lint Debt Ticket Backlog

Date: 2026-03-24
Source: ESLint output from client build (lint-on mode)

## Rule Frequency Snapshot

- import/order: 268
- no-unused-vars: 51
- react-hooks/exhaustive-deps: 26
- react/forbid-elements: 11
- jsx-a11y/no-noninteractive-element-interactions: 8
- jsx-a11y/click-events-have-key-events: 8
- no-console: 6
- other low-volume rules observed in output formatting: no-extend-native, import/no-anonymous-default-export

## Scheduling Strategy

- Track by rule family, not by page, to allow repeatable fixes and easier review.
- Front-load high-volume mechanical fixes first to quickly reduce failure noise.
- Gate medium and high effort tickets with targeted smoke checks.
- Keep this backlog separate from dead-code cleanup and feature work.

## Ticket List Grouped by Effort

### Small Effort

#### LINT-S-01: Remove Console Statements
- Effort: Small (1 point)
- Rules: no-console
- Estimated Violations: 6
- Scope: Replace console calls with project logger or remove debug statements.
- Definition of Done:
  - no-console count is zero.
  - No behavior change in user-facing flows.

#### LINT-S-02: Clear Low-Volume Rule Tail
- Effort: Small (1 point)
- Rules: no-extend-native, import/no-anonymous-default-export
- Estimated Violations: low-volume tail from lint output
- Scope: Fix remaining one-off lint blockers that are not part of core rule families.
- Definition of Done:
  - All low-volume singletons are cleared.
  - No new suppressions introduced.

### Medium Effort

#### LINT-M-01: Normalize Import Ordering
- Effort: Medium (5 points)
- Rules: import/order
- Estimated Violations: 268
- Scope: Reorder imports and group spacing consistently across client source files.
- Implementation Notes:
  - Do in batches (for example: contexts, hooks, pages, services) to keep PRs reviewable.
  - Keep changes formatting-only for this ticket.
- Definition of Done:
  - import/order count reduced to zero.
  - No functional diffs outside import blocks.

#### LINT-M-02: Remove Unused Symbols
- Effort: Medium (3 points)
- Rules: no-unused-vars
- Estimated Violations: 51
- Scope: Remove dead locals/params/imports or rename intentionally unused params with underscore convention where appropriate.
- Definition of Done:
  - no-unused-vars count reduced to zero.
  - No dead code retained solely to silence lint.

#### LINT-M-03: Fix Hook Dependency Declarations
- Effort: Medium (5 points)
- Rules: react-hooks/exhaustive-deps
- Estimated Violations: 26
- Scope: Correct effect and callback dependency arrays; refactor unstable callbacks when needed.
- Risk Notes:
  - Potential behavior changes if dependencies are added blindly.
  - Validate with resident and guard dashboard smoke tests after each batch.
- Definition of Done:
  - All exhaustive-deps findings resolved without disable comments.
  - No regressions in key role dashboards.

### Large Effort

#### LINT-L-01: Replace Raw Button Usage With Design System Button
- Effort: Large (8 points)
- Rules: react/forbid-elements
- Estimated Violations: 11
- Scope: Replace raw button elements with design-system Button while preserving semantics, disabled state, and keyboard behavior.
- Risk Notes:
  - Potential style and behavior drift in admin and guard pages.
- Definition of Done:
  - react/forbid-elements count reduced to zero.
  - Visual and keyboard interaction parity confirmed in impacted views.

#### LINT-L-02: Resolve Non-Interactive Click Handlers
- Effort: Large (8 points)
- Rules: jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
- Estimated Violations: 16 combined
- Scope: Convert clickable non-interactive elements to semantic controls or add full keyboard interaction patterns and roles when semantically justified.
- Risk Notes:
  - Accessibility behavior changes require careful verification.
- Definition of Done:
  - Both a11y rule counts reduced to zero.
  - Keyboard-only navigation validates affected controls.

## Suggested Execution Order

1. LINT-M-01 import/order
2. LINT-M-02 no-unused-vars
3. LINT-S-01 no-console
4. LINT-M-03 exhaustive-deps
5. LINT-L-01 forbid-elements
6. LINT-L-02 interactive-a11y pair
7. LINT-S-02 low-volume tail cleanup

## Suggested PR Split

- PR A: LINT-M-01 and LINT-S-01 (mechanical, low risk)
- PR B: LINT-M-02 (cleanup, low to medium risk)
- PR C: LINT-M-03 (behavior-sensitive)
- PR D: LINT-L-01 and LINT-L-02 (UI and accessibility-sensitive)
- PR E: LINT-S-02 final sweep

## Acceptance Gate for Backlog Completion

- Client lint run reports zero findings for all listed rule families.
- Resident smoke and guard/admin navigation smoke pass after behavior-sensitive tickets.
- No rule disable comments added as shortcuts.