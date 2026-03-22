# Secure Gate Access Control System

This is the master documentation index for the repository.
Use this file as the single starting point, then follow links to scoped READMEs for details.

## What This Repo Contains

- Full-stack Secure Gate platform (React client + Express server)
- Infrastructure as code (Terraform + AWS assets)
- Operational guides, runbooks, and production-readiness tooling
- End-to-end and backend test suites

## Primary Entry Points

- Server docs: [secure-gate-access/server/README.md](secure-gate-access/server/README.md)
- Infrastructure docs: [infra/README.md](infra/README.md)
- AWS infrastructure assets: [secure-gate-access/infrastructure/aws/README.md](secure-gate-access/infrastructure/aws/README.md)
- Canonical documentation guides: [documentation/guides/README.md](documentation/guides/README.md)
- Operational runbooks: [documentation/guides/ops/README.md](documentation/guides/ops/README.md)

## Testing & Verification Docs

- Manual verification scripts: [secure-gate-access/server/tests/manual/README.md](secure-gate-access/server/tests/manual/README.md)
- Test quarantine policy: [secure-gate-access/server/tests/quarantine/README.md](secure-gate-access/server/tests/quarantine/README.md)

Legacy quarantine context:
- [secure-gate-access/server/tests/quarantine/legacy-missing-modules/README.md](secure-gate-access/server/tests/quarantine/legacy-missing-modules/README.md)
- [secure-gate-access/server/tests/quarantine/legacy-security-baseline/README.md](secure-gate-access/server/tests/quarantine/legacy-security-baseline/README.md)

## Archive

- Archive policy: [documentation/archive/README.md](documentation/archive/README.md)

## Quick Start Commands

From repository root:

```bash
npm install
cd secure-gate-access/server && npm run dev
```

Useful test commands:

```bash
cd secure-gate-access/server && npm run test:critical
cd secure-gate-access/client && npm test
npx playwright test
```

## Documentation Rule

- Start here first.
- Keep detailed implementation notes in the nearest scoped README.
- Update this index whenever a new top-level documentation entry point is added or removed.
