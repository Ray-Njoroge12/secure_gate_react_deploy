# API Contract & Error Compliance Report

Date: 2025-10-07

## Summary
This report validates the presence of an OpenAPI/Swagger definition, standardized error/success response shapes, async error handling, and response helpers usage across routes, including versioned APIs (v1/v2).

## Evidence

### 1) Swagger/OpenAPI
- File: `secure-gate-access/server/src/config/swagger.js`
  - OpenAPI 3.0 configured with tags for Authentication, Admin, Visitors, Residents, Guards, Security, Cache, Health.
  - Components define `Success` and `Error` schemas matching standardized shapes.
  - `apis` points to routes, controllers, middleware for JSDoc extraction.

### 2) Standardized Error & Success
- Error handler: `secure-gate-access/server/src/middleware/standardizedErrorHandler.js`
  - Error response shape: `{ success:false, message, error:{ code, details? }, timestamp }`.
  - Maps DB and JWT errors to consistent codes (e.g., DUPLICATE_ENTRY, INVALID_TOKEN, TOKEN_EXPIRED, VALIDATION_ERROR).
  - Adds `requestId` when present; hides details unless `NODE_ENV=development`.
- Response formatter: `secure-gate-access/server/src/utils/responseFormatter.js`
  - `successResponse`, `createdResponse`, `noContentResponse`, and error helpers for common codes.

### 3) Versioned Routers
- v1: `server/src/routes/v1/index.js` mounts `/auth`, `/admin`, `/visitors`, `/guards`, `/residents`, `/incidents`; adds version headers.
- v2: `server/src/routes/v2/index.js` mirrors v1 with additional version metadata headers.

### 4) Async Error Handling and Response Helpers (grep samples)
- `asyncHandler(` present across v1/v2 and core routes (auth, admin, visitors, guards, incidents, health).
- `successResponse(` and `createdResponse(` used consistently for success cases across domain routes.
- Swagger JSDoc `@swagger` blocks found in multiple routes (Visitors and others), ensuring documentation coverage.

## Compliance Matrix

- **Standardized error format**: Present (centralized) and applied via global error handler.
- **Success format**: Present via response formatter and used in routes (`successResponse`, `createdResponse`).
- **Async error handling**: Present (`asyncHandler`) across most routes; reduces try/catch boilerplate.
- **Swagger coverage**: Configured; JSDoc examples present (e.g., Visitors). Broader coverage recommended to document all endpoints.
- **Versioning**: v1 and v2 routers established with headers; parity to be verified endpoint-by-endpoint.

## Gaps & Recommendations
1. Ensure all routes exclusively use `successResponse`/`createdResponse` (audit remaining files to eliminate direct `res.json`).
2. Expand `@swagger` JSDoc to all domain routes (admin/resident/guard/incident/auth) for full contract coverage.
3. Add automated contract tests derived from OpenAPI (Dredd or Postman/newman in CI).
4. Enforce standardized error codes via `AppError`/`errorResponse` in controllers where throwing operational errors.
5. Include example responses in Swagger for all endpoints to align frontend expectations.

## Next Steps
- Generate Postman collection from Swagger; run against a local stack for contract conformance.
- Add CI job to validate contract drift and standardized error compliance.




