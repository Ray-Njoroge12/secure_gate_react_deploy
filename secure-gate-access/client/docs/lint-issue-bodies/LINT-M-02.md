## Summary
Remove or correctly mark unused symbols to clear `no-unused-vars` debt in client code.

## Backlog ID
- LINT-M-02

## Effort
- Medium (3 points)

## Rule Scope
- `no-unused-vars`

## Estimated Violations
- 51

## In Scope
- Remove dead locals/imports/params.
- Rename intentionally unused params using underscore convention where appropriate.

## Out of Scope
- Non-lint code redesign.

## Definition of Done
- `no-unused-vars` count reduced to zero.
- No dead code retained solely to silence lint.

## Validation
- Run client lint/build check.
- Run targeted smoke where touched files impact user flows.