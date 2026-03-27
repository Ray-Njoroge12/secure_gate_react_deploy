## Summary
Replace raw `<button>` usage with design-system `Button` to satisfy `react/forbid-elements` while preserving semantics and accessibility.

## Backlog ID
- LINT-L-01

## Effort
- Large (8 points)

## Rule Scope
- `react/forbid-elements`

## Estimated Violations
- 11

## In Scope
- Replace raw button elements with design-system `Button` component.
- Preserve disabled state, keyboard behavior, aria attributes, and click semantics.

## Out of Scope
- Unrelated visual redesign.

## Risk Notes
- Potential style or interaction drift in admin/guard pages.

## Definition of Done
- `react/forbid-elements` count reduced to zero.
- Visual and keyboard parity confirmed on impacted views.

## Validation
- Run relevant smoke tests for impacted role pages.