# Legacy Quarantined Tests

See quarantine policy and metadata:

- `tests/quarantine/README.md`
- `tests/quarantine/quarantine-manifest.json`

Repository-level index: [README.md](../../../../../README.md)

These tests were moved from `tests/unit/` during cleanup Batch B because they import legacy modules that no longer exist in active runtime paths.

Quarantined files:
1. `auditLogger.legacy.quarantined.js`
2. `autoScalingService.legacy.quarantined.js`
3. `iso27001CertificationService.legacy.quarantined.js`

Reason for quarantine:
1. `auditLogger` test imports `src/middleware/auditLogger.js` while active middleware is `src/middleware/auditLogging.js`.
2. `autoScalingService` test imports `src/services/autoScalingService.js` (missing in active services).
3. `iso27001CertificationService` test imports `src/services/iso27001CertificationService.js` (missing in active services).

Reactivation options:
1. Migrate each test to active canonical module contracts.
2. Restore missing service modules if feature is intentionally retained.
3. Permanently retire tests after product/security owner approval.

Policy:
- Files use `.legacy.quarantined.js` extension to avoid active Jest discovery.
- Do not move these files back to `tests/unit/` without completing one reactivation option above.
