# Test Quarantine Policy

This directory contains test files intentionally excluded from blocking lanes.

Repository-level index: [README.md](../../../../README.md)

## Scope

- Quarantine is allowed only for suites that are currently incompatible with the active harness, imports, or contracts.
- Quarantine does not change blocking coverage requirements for critical lanes.

## Source Of Truth

- Machine-readable metadata: `tests/quarantine/quarantine-manifest.json`
- Required metadata fields for each quarantined entry:
  - `id`
  - `path`
  - `status`
  - `reason`
  - `owner`
  - `exit_criteria`
  - `gating_impact`
  - `introduced_on`

## Governance

- Every quarantined suite must have a clear owner and explicit exit criteria.
- Reactivated suites stay in the manifest with `status: "reactivated"` for audit history.
- Quarantined files must not be silently moved back into blocking paths.

## Low-Risk Verification

Run these checks to prove critical gating remains in active paths:

1. `npm run test:quarantine:verify`
2. `npm run test:critical -- --listTests`

The first command validates script/path invariants and required quarantine metadata. The second command shows the effective critical lane test files without executing the full suite.