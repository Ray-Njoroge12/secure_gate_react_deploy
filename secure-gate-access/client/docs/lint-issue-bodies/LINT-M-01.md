## Summary
Normalize import ordering and grouping across client source files to clear `import/order` findings.

## Backlog ID
- LINT-M-01

## Effort
- Medium (5 points)

## Rule Scope
- `import/order`

## Estimated Violations
- 268

## In Scope
- Reorder imports and spacing by configured ESLint grouping.
- Execute in reviewable batches (for example: contexts, hooks, pages, services).

## Out of Scope
- Functional refactors.
- Behavior changes unrelated to imports.

## Definition of Done
- `import/order` count reduced to zero.
- Functional diff is limited to import blocks and whitespace.

## Validation
- Run client lint/build check after each batch.
- Run smoke tests after final batch.