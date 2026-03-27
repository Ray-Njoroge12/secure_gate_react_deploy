## Summary
Resolve clickable non-interactive element violations by moving to semantic controls or full keyboard-accessible patterns.

## Backlog ID
- LINT-L-02

## Effort
- Large (8 points)

## Rule Scope
- `jsx-a11y/no-noninteractive-element-interactions`
- `jsx-a11y/click-events-have-key-events`

## Estimated Violations
- 16 combined

## In Scope
- Convert non-interactive click targets to semantic interactive elements where correct.
- Where semantic conversion is not feasible, implement full role + keyboard + focus handling.

## Out of Scope
- Unrelated feature additions.

## Risk Notes
- Accessibility interaction changes require careful keyboard-only verification.

## Definition of Done
- Both a11y rule counts reduced to zero.
- Keyboard-only navigation validates affected controls.

## Validation
- Run resident and guard/admin navigation smoke tests.
- Manually verify keyboard interaction on changed controls.