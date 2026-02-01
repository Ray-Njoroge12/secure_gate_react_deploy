# Project Structure & Organization

## Repository Layout

```
secure-gate-access/                 # Main application directory
├── client/                        # React frontend application
├── server/                        # Node.js backend API
├── mobile/                        # Flutter mobile apps (guard_app, resident_app)
├── docs/                         # Documentation and reports
├── infrastructure/               # AWS CloudFormation templates
├── observability/               # Monitoring and logging configs
└── scripts/                     # Deployment and utility scripts

e2e/                              # Root-level E2E tests (Playwright)
tests/                           # Shared test utilities and fixtures
infra/                          # Terraform infrastructure code
```

## Frontend Structure (`secure-gate-access/client/`)

```
src/
├── components/                   # Reusable UI components
│   ├── common/                  # Shared components (Loading, Modal, etc.)
│   ├── ui/                     # Base UI components (Button, Input, etc.)
│   └── ErrorBoundary/          # Error handling components
├── pages/                       # Route-level page components
├── layouts/                     # Layout components (AppShell, etc.)
├── contexts/                    # React Context providers
├── hooks/                       # Custom React hooks
├── services/                    # API client and external service integrations
├── utils/                       # Utility functions and helpers
├── design-system/               # Design tokens and CSS variables
├── routes/                      # Route configuration and guards
├── constants/                   # Application constants
└── __tests__/                   # Test files co-located with source
```

## Backend Structure (`secure-gate-access/server/`)

```
src/
├── app.js                       # Express app configuration
├── config/                      # Configuration and environment setup
├── controllers/                 # Route handlers and business logic
├── middleware/                  # Express middleware (auth, validation, etc.)
├── models/                      # Database models and queries
├── routes/                      # API route definitions
├── services/                    # Business logic and external integrations
├── database/                    # Database connection and utilities
├── jobs/                        # Background jobs and schedulers
└── utils/                       # Utility functions and helpers

tests/                           # Test suites
├── unit/                        # Unit tests
├── integration/                 # Integration tests
├── e2e/                        # End-to-end API tests
└── fixtures/                    # Test data and mocks
```

## Key Conventions

### File Naming
- **React Components**: PascalCase (e.g., `UserProfile.jsx`)
- **Utilities/Services**: camelCase (e.g., `apiClient.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.js`)
- **Test Files**: `*.test.js` or `*.spec.js`

### Directory Organization
- **Feature-based**: Group related components, hooks, and utilities together
- **Shared Resources**: Common utilities in dedicated folders
- **Test Co-location**: Tests near the code they test when possible

### Import Conventions
- **Absolute Imports**: Use `src/` as base for frontend imports
- **Barrel Exports**: Use `index.js` files to simplify imports
- **External First**: External dependencies before internal imports

### Configuration Files
- **Root Level**: Deployment configs (netlify.toml, render.yaml)
- **Package Level**: Build tools (package.json, playwright.config.js)
- **Environment**: `.env` files in respective service directories

## Testing Structure

### Frontend Tests
- **Unit Tests**: Component testing with React Testing Library
- **Integration Tests**: Multi-component interaction tests
- **E2E Tests**: Full user journey tests with Playwright
- **Accessibility Tests**: Automated a11y testing

### Backend Tests
- **Unit Tests**: Individual function/module testing
- **Integration Tests**: Database and API endpoint testing
- **E2E Tests**: Full API workflow testing
- **Performance Tests**: Load and stress testing with k6

## Documentation Organization

- **API Documentation**: OpenAPI/Swagger specs in `api-documentation.yaml`
- **Deployment Guides**: Step-by-step deployment instructions
- **Testing Reports**: Automated test results and coverage reports
- **Security Audits**: Security assessment and compliance reports