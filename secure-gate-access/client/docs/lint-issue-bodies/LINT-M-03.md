## Summary
Fix hook dependency declarations to clear `react-hooks/exhaustive-deps` findings while preserving runtime behavior.

## Backlog ID
- LINT-M-03

## Effort
- Medium (5 points)

## Rule Scope
- `react-hooks/exhaustive-deps`

## Estimated Violations
- 26

## In Scope
- Correct effect/callback dependency arrays.
- Refactor unstable closures/callbacks where needed.

## Out of Scope
- Broad state-management redesign.

## Risk Notes
- Behavior can change if dependencies are added blindly.
- Must validate dashboards and critical role flows after each batch.

## Definition of Done
- All `exhaustive-deps` findings resolved without disable comments.
- No regressions in key role dashboards.

## Validation
- Run resident and guard/admin smoke checks after each touched batch.