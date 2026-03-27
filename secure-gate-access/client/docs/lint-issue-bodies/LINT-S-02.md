## Summary
Resolve low-volume singleton lint findings that are outside major rule families.

## Backlog ID
- LINT-S-02

## Effort
- Small (1 point)

## Rule Scope
- `no-extend-native`
- `import/no-anonymous-default-export`

## Estimated Violations
- Low-volume tail from lint output

## In Scope
- One-off fixes for low-volume blockers.

## Out of Scope
- High-volume rule families (import order, unused vars, hooks deps).

## Definition of Done
- All low-volume singleton findings are cleared.
- No new suppressions introduced.

## Validation
- Run client lint/build check.