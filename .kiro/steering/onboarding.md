# Developer Onboarding Guide

## Overview

This guide helps new developers get up and running with the Secure Gate Access Control System quickly and efficiently.

## Prerequisites

### Required Software
- **Node.js**: Version 20+ with npm
- **PostgreSQL**: Version 15+ for database
- **Git**: For version control
- **VS Code**: Recommended IDE with extensions

### Recommended VS Code Extensions
- ES6 String HTML
- Prettier - Code formatter
- ESLint
- Thunder Client (for API testing)
- PostgreSQL (for database management)

## Quick Start (5-Minute Setup)

### 1. Repository Setup
```bash
# Clone the repository
git clone <repository-url>
cd secure-gate-access

# Install dependencies for both client and server
npm run install:all
```

### 2. Environment Configuration
```bash
# Server environment
cd server
cp .env.example .env.local
# Edit .env.local with your local database credentials

# Client environment  
cd ../client
cp .env.example .env.local
# Edit .env.local with local API endpoints
```

### 3. Database Setup
```bash
cd server
npm run db:setup    # Creates database and runs migrations
npm run db:seed     # Seeds with test data
```

### 4. Start Development Servers
```bash
# Terminal 1: Start backend (port 3001)
cd server
npm run dev

# Terminal 2: Start frontend (port 3000)
cd client
npm run dev
```

### 5. Verify Setup
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/health
- Test login: admin@test.com / TestAdmin123!

## Development Workflow

### Branch Strategy
- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: Feature development branches
- **hotfix/**: Critical production fixes

### Commit Conventions
```bash
# Format: type(scope): description
feat(auth): add MFA support
fix(api): resolve visitor creation bug
docs(readme): update setup instructions
test(visitor): add integration tests
```

### Code Quality Checks
```bash
# Run before committing
npm run lint        # ESLint checks
npm run test        # Run test suite
npm run type-check  # TypeScript checks (if applicable)
```

## Project Structure Overview

### Backend (`/server`)
```
src/
├── controllers/    # Route handlers
├── middleware/     # Express middleware
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
└── utils/          # Helper functions
```

### Frontend (`/client`)
```
src/
├── components/     # React components
├── pages/          # Route components
├── hooks/          # Custom hooks
├── services/       # API clients
└── utils/          # Helper functions
```

## Key Concepts

### Multi-Tenant Architecture
- All data scoped by `estate_id`
- Users belong to specific estates
- Cross-estate access prevented by middleware

### Authentication Flow
1. User logs in with email/password
2. Server returns JWT access + refresh tokens
3. Tokens stored in httpOnly cookies
4. CSRF protection via session tokens

### Role-Based Access
- **Super Admin**: Platform-wide access
- **Estate Admin**: Estate management
- **Guard**: Visitor processing
- **Resident**: Visitor invitations
- **Visitor**: Self-service access

## Common Development Tasks

### Adding a New API Endpoint
1. Create route in `/routes`
2. Add controller in `/controllers`
3. Add validation schema
4. Add tests in `/tests`
5. Update API documentation

### Adding a New React Component
1. Create component in `/components`
2. Add PropTypes or TypeScript types
3. Add unit tests
4. Add to Storybook (if applicable)
5. Update component documentation

### Database Changes
1. Create migration file
2. Update models if needed
3. Run migration locally
4. Test with seed data
5. Update schema documentation

## Testing Strategy

### Running Tests
```bash
# Backend tests
cd server
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests

# Frontend tests
cd client
npm test                   # Jest unit tests
npm run test:e2e          # Playwright E2E tests
```

### Writing Tests
- **Unit Tests**: Test individual functions/components
- **Integration Tests**: Test API endpoints with database
- **E2E Tests**: Test complete user workflows
- **Property Tests**: Test business logic properties

## Debugging Tips

### Backend Debugging
```bash
# Enable debug logging
DEBUG=app:* npm run dev

# Database query logging
DEBUG=db:* npm run dev

# Use Node.js inspector
node --inspect server.js
```

### Frontend Debugging
- Use React Developer Tools
- Enable Redux DevTools (if using Redux)
- Use browser network tab for API calls
- Console.log strategically (remove before commit)

## Common Issues & Solutions

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Reset database
npm run db:reset
```

### Port Already in Use
```bash
# Find process using port
lsof -ti:3001
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### CORS Issues
- Check FRONTEND_URL in server .env
- Verify client is running on expected port
- Check browser network tab for preflight requests

## Resources & Documentation

### Internal Documentation
- [API Documentation](./api-documentation.md)
- [Database Schema](./database-schema.md)
- [Security Guidelines](./security-analysis.md)
- [Testing Strategies](./testing-strategies.md)

### External Resources
- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/guide/)

## Getting Help

### Team Communication
- **Slack**: #secure-gate-dev channel
- **Email**: dev-team@secure-gate.app
- **Stand-ups**: Daily at 9:00 AM

### Code Reviews
- All PRs require at least one approval
- Focus on security, performance, and maintainability
- Use PR templates for consistency
- Address feedback promptly

### Escalation Path
1. **Peer Developer**: For technical questions
2. **Tech Lead**: For architectural decisions
3. **Product Manager**: For feature clarification
4. **DevOps**: For infrastructure issues

## Next Steps

After completing this onboarding:

1. **Complete First Task**: Pick up a "good first issue" from the backlog
2. **Join Team Meetings**: Attend daily stand-ups and sprint planning
3. **Read Codebase**: Spend time understanding existing patterns
4. **Ask Questions**: Don't hesitate to ask for clarification
5. **Contribute**: Start with small improvements and bug fixes

Welcome to the team! 🚀