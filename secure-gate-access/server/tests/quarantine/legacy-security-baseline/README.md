# Legacy Security Baseline Quarantine

See quarantine policy and metadata:

- `tests/quarantine/README.md`
- `tests/quarantine/quarantine-manifest.json`

Repository-level index: [README.md](../../../../../README.md)

Status: reactivation completed.

The legacy CommonJS suites were modernized to ESM and restored under active security discovery:

- `tests/security/qr-tokenization.test.js`
- `tests/security/data-retention.test.js`
- `tests/security/data-minimization.test.js`
- `tests/security/security-integration.test.js`
- `tests/security/id-encryption.test.js`

Historical rationale for the previous quarantine:

1. They failed before assertions executed with `ReferenceError: require is not defined`.
2. They depended on legacy module paths/contracts incompatible with the current runtime harness.
