# Technology Stack & Build System

## Architecture

**Full-stack JavaScript application** with separate frontend and backend services:
- **Frontend**: React 18 SPA with React Router
- **Backend**: Node.js Express API server
- **Database**: PostgreSQL with connection pooling
- **Deployment**: Netlify (frontend) + Render (backend + database)

## Tech Stack

### Frontend (React Client)
- **Framework**: React 18.3.1 with functional components and hooks
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Query (@tanstack/react-query) for server state
- **Build Tool**: Create React App (CRA) with custom build optimizations
- **Testing**: Jest + React Testing Library + Playwright for E2E

### Backend (Node.js Server)
- **Runtime**: Node.js 20+ with ES modules (`"type": "module"`)
- **Framework**: Express.js with middleware-based architecture
- **Database**: PostgreSQL with `pg` driver and connection pooling
- **Authentication**: JWT with refresh tokens, session management
- **Security**: Helmet, CORS, rate limiting, CSRF protection
- **Logging**: Winston with daily rotation and structured logging
- **Testing**: Jest with Supertest for API testing

### External Services
- **SMS**: AfricaTalking for SMS notifications
- **Email**: Mailgun for email delivery
- **Monitoring**: Sentry for error tracking
- **Observability**: Grafana Cloud + Loki for log aggregation

## Common Commands

### Development Setup
```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev:server    # Backend on port 3001
npm run dev:client    # Frontend on port 3000
```

### Testing
```bash
# Backend tests
cd secure-gate-access/server
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests

# Frontend tests
cd secure-gate-access/client
npm test                   # Jest unit tests
npm run test:playwright    # Playwright E2E tests
npm run test:a11y         # Accessibility tests
```

### Production Builds
```bash
# Frontend production build
cd secure-gate-access/client
npm run build:production

# Backend (no build step - direct Node.js execution)
cd secure-gate-access/server
npm start
```

### Database Operations
```bash
cd secure-gate-access/server
npm run db:migrate    # Run database migrations
npm run db:seed      # Seed test data
```

## Environment Configuration

- **Development**: `.env.local` (gitignored) for secrets, `.env` for defaults
- **Production**: Environment variables set in deployment platforms
- **Testing**: `NODE_ENV=test` with separate test database

## Code Style & Conventions

- **ES Modules**: Use `import/export` syntax throughout
- **Async/Await**: Preferred over Promise chains
- **Error Handling**: Centralized error middleware with structured logging
- **Security First**: All endpoints protected, input validation with Joi
- **TypeScript**: Not used - pure JavaScript with JSDoc comments for documentation