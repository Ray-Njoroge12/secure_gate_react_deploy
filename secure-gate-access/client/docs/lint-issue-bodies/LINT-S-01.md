## Summary
Remove all `no-console` lint violations in client code by replacing console usage with the project logger or removing debug-only statements.

## Backlog ID
- LINT-S-01

## Effort
- Small (1 point)

## Rule Scope
- `no-console`

## Estimated Violations
- 6

## In Scope
- Replace console calls with logger utility where logs are operationally useful.
- Remove temporary debug logs that should not ship.

## Out of Scope
- Broader lint rule cleanup.
- Functional behavior changes.

## Definition of Done
- `no-console` count is zero.
- No behavior change in user-facing flows.
- No lint-disable comments added as workaround.

## Validation
- Run client lint/build check.
- Run resident smoke if any touched file is in resident flow.