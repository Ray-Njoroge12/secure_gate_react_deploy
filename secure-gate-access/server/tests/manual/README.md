# Manual Verification Scripts

This directory contains end-to-end verification scripts intended for ad-hoc manual testing of deployed environments (staging or production).

Repository-level index: [README.md](../../../../README.md)

**⚠️ DO NOT RUN THESE IN CI/CD PIPELINES ⚠️**

## Scripts

- `verify-approvals-e2e.js`: Verifies the visitor approval workflow.
- `verify-guard-full-e2e.js`: Verifies the full guard lifecycle (check-in, check-out, incidents).
- `verify-resident-full-e2e.js`: Verifies the resident lifecycle (creating visitors, invites).
- `verify-visitor-full-e2e.js`: Verifies the visitor experience (invite acceptance).

## Usage

Set the `BASE_URL` environment variable to target a specific environment:

```bash
BASE_URL=https://staging-api.securegate.com node verify-resident-full-e2e.js
```
