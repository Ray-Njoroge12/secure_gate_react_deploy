# Day 3 Utilities Testing Guide

This guide documents the Day 3 test utilities introduced to support advanced backend testing.

## Purpose

The Day 3 utilities provide:

- Enhanced mock data generators for realistic Kenyan user and visitor data.
- Bulk data generators for performance, load, and CSV import testing.
- Edge-case data helpers for strings, dates, numbers, and payloads.
- Specialized helpers for performance, security, validation, and error assertions.
- Fixture modules that compose these helpers into reusable test-ready objects.

## Files Covered

- `tests/helpers/mockData.enhanced.js`
- `tests/helpers/bulkDataGenerator.js`
- `tests/helpers/edgeCaseData.js`
- `tests/helpers/performanceHelpers.js`
- `tests/helpers/securityHelpers.js`
- `tests/helpers/validationHelpers.js`
- `tests/helpers/errorHelpers.js`
- `tests/fixtures/users.enhanced.js`
- `tests/fixtures/visitors.enhanced.js`
- `tests/fixtures/passes.enhanced.js`
- `tests/fixtures/relationships.js`
- `tests/fixtures/index.js`

## How to Run

From `secure-gate-access/server` run:

```bash
npm run test:unit -- --runTestsByPath tests/unit/day3-validation.test.js
```

All tests in `day3-validation.test.js` should pass once the utilities and fixtures are wired correctly.

## Notes

- These utilities are **test-only** and live entirely under `secure-gate-access/server/tests/**`.
- They do not affect production runtime code or APIs.
- They are designed to be deterministic enough for CI while still generating realistic data.
