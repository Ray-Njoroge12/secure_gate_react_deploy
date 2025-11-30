# System Architecture & Component Analysis
**Secure Gate Access Control System - Complete Inventory**

**Date:** November 25, 2025  
**Version:** 1.0

---

## Executive Overview

### System Summary
```
Type: Full-stack Web Application
Architecture: Client-Server (SPA + REST API)
Frontend: React 18 + Tailwind CSS
Backend: Node.js 18 + Express 4
Database: PostgreSQL 15
Cache: Redis
Authentication: JWT (httpOnly cookies) + TOTP MFA
Deployment: AWS/DigitalOcean + Netlify CDN
```

### Component Count
- **Frontend Pages:** 39 total (9 public, 7 resident, 7 guard, 15 admin, 1 shared)
- **Backend Routes:** 40+ route modules
- **Database Tables:** 30+ tables (includes MFA, compliance, audit)
- **API Endpoints:** 150+ endpoints across all routes
- **Test Files:** 37 backend tests, 20+ frontend tests

---

## Frontend Architecture

### Technology Stack
```javascript
{
  "framework": "React 18.2.0",
  "routing": "React Router v6",
  "styling": "Tailwind CSS 3.x",
  "state": "Context API (Auth, Error, Loading)",
  "http": "Axios + Fetch API",
  "build": "Create React App / Webpack",
  "testing": "Jest + React Testing Library",
  "e2e": "Puppeteer (custom runner)"
}
```

### Page Inventory (39 Pages)

#### Public/Visitor Pages (9)
```
1. /login                     - Login with MFA support
2. /register                  - RegistrationWizard (multi-step)
3. /mfa/setup                 - MFA Setup (TOTP + backup codes)
4. /mfa/verify                - MFA Verification during login
5. /invite/:token             - VisitorInvitePage (QR + details)
6. /kiosk                     - SelfCheckInKiosk (walk-in)
7. /guest-invite              - GuestInvite
8. /privacy-policy            - PrivacyPolicy
9. /terms                     - TermsOfService
```

#### Resident Pages (7)
```
10. /dashboard/resident       - ResidentDashboard (overview)
11. /resident/add-visitor     - AddVisitor (single form)
12. /resident/add-visitor-wizard - AddVisitorWizard (3-step)
13. /resident/bulk-invite     - BulkInvite (CSV wizard)
14. /resident/visitor-history - VisitorHistory (table/cards)
15. /resident/privacy         - PrivacyDashboard (Kenya DPA)
16. /resident/settings        - Settings
```

#### Guard Pages (7)
```
17. /dashboard/guard          - GuardDashboard
18. /guard/scan-qr            - ScanQR (QR scanner + test mode)
19. /guard/manual-check       - ManualCheck (search + actions)
20. /guard/walk-in            - WalkInRegistration
21. /guard/visitor-history    - VisitorHistory
22. /guard/incidents          - IncidentList
23. /guard/analytics          - GuardAnalytics
24. /guard/settings           - Settings
```

#### Admin Pages (15)
```
25. /dashboard/admin          - AdminDashboard
26. /admin/operations         - AdminOperationsDashboard
27. /admin/manage-residents   - ManageResidents (CRUD)
28. /admin/manage-guards      - ManageGuards (CRUD)
29. /admin/visitor-log        - VisitorLog (all visitors)
30. /admin/reports            - Reports (analytics)
31. /admin/site-management    - SiteManagement
32. /admin/access-control     - AccessControl
33. /admin/role-management    - RoleManagement
34. /admin/policy-management  - PolicyManagement
35. /admin/incidents          - IncidentManagement
36. /admin/incident-workflow  - IncidentWorkflowDashboard
37. /admin/watchlist          - WatchlistManagement
38. /admin/integrations       - IntegrationsHub
39. /admin/settings           - Settings
```

### Component Structure
```
client/src/
├── components/
│   ├── common/              - Shared UI (buttons, cards, modals)
│   ├── ui/                  - Base components (input, select, etc.)
│   ├── guard/               - Guard-specific components
│   ├── resident/            - Resident-specific components
│   ├── ErrorBoundary/       - Error boundary wrapper
│   └── icons/               - Icon components
├── contexts/
│   ├── AuthContext.jsx      - Authentication state & functions
│   ├── ErrorContext.jsx     - Global error handling
│   └── LoadingContext.jsx   - Loading state management
├── hooks/
│   ├── useAuth.js           - Auth hook
│   ├── useApi.js            - API call wrapper
│   └── useDebounce.js       - Debouncing utility
├── pages/                   - 39 page components (listed above)
├── routes/
│   └── AppRoutes.jsx        - Route definitions & protection
├── services/
│   ├── api.js               - Axios instance & interceptors
│   └── authService.js       - Auth API calls
├── utils/
│   ├── statusColors.js      - Status color mapping
│   ├── validation.js        - Form validation helpers
│   └── logger.js            - Frontend logging utility
└── styles/
    └── index.css            - Tailwind imports & custom styles
```

---

## Backend Architecture

### Technology Stack
```javascript
{
  "runtime": "Node.js 18.x",
  "framework": "Express 4.x",
  "database": "PostgreSQL 15",
  "orm": "node-postgres (pg)",
  "cache": "Redis",
  "auth": "JWT (jsonwebtoken) + bcrypt",
  "mfa": "speakeasy (TOTP)",
  "validation": "joi + validator",
  "testing": "Jest + Supertest",
  "email": "nodemailer",
  "logging": "winston"
}
```

### API Route Modules (40+)

#### Authentication & Users (5 modules)
```
1. authRoutes.js             - Login, logout, register, forgot-password
2. mfaRoutes.js              - MFA setup, verify, backup codes
3. consentRoutes.js          - Consent management (Kenya DPA)
4. dataPrivacyRoutes.js      - Data export, erasure, portability
5. dsrRoutes.js              - Data subject requests
```

#### Resident APIs (3 modules)
```
6. residentRoutes.js         - Visitor CRUD, invites, dashboard
7. approvalRoutes.js         - Visitor approval workflows
8. notificationRoutes.js     - Notification preferences
```

#### Guard APIs (5 modules)
```
9. guardRoutes.js            - Guard-specific operations
10. guardAnalyticsRoutes.js  - Guard performance metrics
11. guardIncidentRoutes.js   - Incident reporting
12. checkInRoutes.js         - Check-in operations
13. checkOutRoutes.js        - Check-out operations
```

#### Visitor/Pass APIs (3 modules)
```
14. qrCodeRoutes.js          - QR generation & validation
15. integrationsRoutes.js    - External integrations
16. dashboardRoutes.js       - Dashboard data aggregation
```

#### Admin APIs (8 modules)
```
17. adminRoutes.js           - User management, system config
18. adminAnalyticsRoutes.js  - System-wide analytics
19. incidentRoutes.js        - Incident management
20. incidentWorkflowRoutes.js - Incident workflow automation
21. complianceRoutes.js      - Compliance monitoring
22. loggingRoutes.js         - Log management
23. monitoringRoutes.js      - System health monitoring
24. performanceRoutes.js     - Performance metrics
```

#### System & Infrastructure (16+ modules)
```
25. healthRoutes.js          - Health checks
26. cacheRoutes.js           - Cache management
27. rateLimitRoutes.js       - Rate limiting config
28. backupRoutes.js          - Backup operations
29. backupDrRoutes.js        - Disaster recovery
30. rollbackRoutes.js        - Version rollback
31. secretManagementRoutes.js - Secret rotation
32. databaseHealthRoutes.js  - DB health monitoring
33. databaseUpdateRoutes.js  - DB updates
34. loadBalancerRoutes.js    - Load balancer health
35. disasterRecoveryValidationRoutes.js
36. preDeploymentValidationRoutes.js
37. chaosRoutes.js           - Chaos engineering (testing)
38. penetrationRoutes.js     - Security testing endpoints
39. sessionRoutes.js         - Session management
40. upgradeRoutes.js         - System upgrades
```

### Service Layer
```
server/src/services/
├── authService.js           - Authentication logic
├── mfaService.js            - MFA operations
├── tokenService.js          - JWT generation/validation
├── emailService.js          - Email sending (stub)
├── smsService.js            - SMS sending (stub)
├── visitorService.js        - Visitor business logic
├── passService.js           - Pass generation
├── qrService.js             - QR code generation
├── encryptionService.js     - Data encryption (AES-256-GCM)
├── auditService.js          - Audit trail logging
├── databaseService.js       - DB connection management
├── databaseHealthService.js - DB health monitoring
└── optimizedDatabaseService.js - Optimized queries
```

### Middleware Stack
```
server/src/middleware/
├── auth.js                  - JWT validation
├── authorize.js             - Role-based access control
├── errorHandler.js          - Global error handling
├── rateLimiter.js           - Rate limiting
├── validator.js             - Input validation
├── sanitizer.js             - Input sanitization
├── logger.js                - Request logging
├── cors.js                  - CORS configuration
└── securityHeaders.js       - Security headers (Helmet)
```

---

## Database Architecture

### Schema Overview
```
Total Tables: 30+
Core Tables: 15
MFA Tables: 3
Compliance Tables: 5
Audit Tables: 4
System Tables: 3+
```

### Core Tables
```sql
1. users                    - All system users (residents, guards, admin)
2. residents                - Resident-specific data
3. guards                   - Guard-specific data
4. visitors                 - Visitor records
5. passes                   - Generated passes (QR codes)
6. invitations              - Invitation records
7. check_ins                - Check-in events
8. check_outs               - Check-out events
9. visitor_history          - Historical visitor data
10. incidents               - Incident reports
11. notifications           - Notification queue
12. settings                - System settings
13. roles                   - User roles & permissions
14. permissions             - Permission definitions
15. houses                  - Residence/unit information
```

### MFA Tables (Added Nov 2025)
```sql
16. mfa_secrets             - TOTP secrets per user
17. mfa_backup_codes        - Emergency backup codes
18. mfa_attempts            - Failed MFA attempts (lockout)
```

### Compliance Tables (Kenya DPA)
```sql
19. consent_records         - User consent history
20. data_export_requests    - Data portability requests
21. data_erasure_requests   - Right to erasure requests
22. audit_logs              - Compliance audit trail
23. breach_notifications    - Data breach tracking
```

### System Tables
```sql
24. sessions                - Active sessions (Redis backup)
25. token_blacklist         - Revoked tokens (Redis primary)
26. system_logs             - Application logs
27. performance_metrics     - Performance data
28. health_checks           - System health history
```

### Key Relationships
```
users (1) ──→ (∞) residents
users (1) ──→ (∞) guards
residents (1) ──→ (∞) visitors
visitors (1) ──→ (1) passes
visitors (∞) ──→ (1) guards (checked_by)
visitors (1) ──→ (∞) check_ins
visitors (1) ──→ (∞) check_outs
users (1) ──→ (∞) mfa_secrets
users (1) ──→ (∞) consent_records
```

---

## Security Architecture

### Authentication Flow
```
1. User enters credentials
   ↓
2. POST /api/auth/login
   ↓
3. Backend validates username/password (bcrypt)
   ↓
4. If MFA enabled:
   a. Return mfaRequired: true
   b. User redirected to /mfa/verify
   c. User enters TOTP code
   d. POST /api/mfa/verify
   e. Validate TOTP (30s window)
   ↓
5. Generate JWT
   ↓
6. Set httpOnly cookie (accessToken)
   ↓
7. Return user object (no token in JSON)
   ↓
8. Frontend stores user in memory (Context)
   ↓
9. All API calls include cookie automatically
```

### Authorization Model
```javascript
// Role hierarchy
const ROLE_HIERARCHY = {
  admin: ['admin', 'guard', 'resident'],
  guard: ['guard'],
  resident: ['resident']
};

// Permission check
if (!user.role || !ROLE_HIERARCHY[requiredRole].includes(user.role)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

### Session Management
```
Primary: Redis (token blacklist, session data)
Backup: PostgreSQL (sessions table)

Token Lifecycle:
1. Login → JWT generated (15min - 1hr expiry)
2. Token sent via httpOnly cookie
3. Each request → Middleware validates JWT
4. Logout → Token added to Redis blacklist
5. Expired tokens → Automatic cleanup (Redis TTL)
```

### Data Protection
```
Encryption: AES-256-GCM (at rest for PII)
Transport: HTTPS (TLS 1.3) in production
Passwords: bcrypt (10+ rounds)
Secrets: AWS Secrets Manager / .env.local (development)
Input Sanitization: joi + validator.js
SQL Injection Prevention: Parameterized queries (pg)
XSS Prevention: React auto-escaping + CSP headers
CSRF Protection: SameSite cookies + token validation
```

---

## Integration Points

### External Services (Current State)
```
Email: nodemailer (SMTP stub - needs configuration)
SMS: Twilio SDK (stub - needs API keys)
QR Codes: qrcode library (internal generation)
File Storage: Local filesystem (production: AWS S3)
Monitoring: Custom dashboard (future: Datadog/New Relic)
Logging: Winston → files (future: ELK stack)
```

### API Contracts
```
Request Format:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>" // OR httpOnly cookie
}

Response Format (Success):
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}

Response Format (Error):
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... } // Optional
}
```

---

## Test Infrastructure

### Existing Tests (Backend)
```
server/tests/
├── integration/             - 15 test files (API integration)
├── e2e/                     - 6 test files (end-to-end flows)
├── performance/k6/          - 5 test files (load testing)
├── security/                - OWASP validation tests
├── unit/                    - Service & utility tests
└── helpers/                 - Test utilities & mocks
```

### Existing Tests (Frontend)
```
client/src/__tests__/
├── accessibility/           - Accessibility tests
├── compatibility/           - Browser compatibility
├── contexts/                - Context API tests
├── integration/             - Component integration
├── performance/             - Performance tests
├── services/                - Service layer tests
├── utils/                   - Utility function tests
└── validation/              - Validation logic tests
```

### Custom Test Runner
```
tasks/TEST_EXECUTION_RUNNER.js
- Puppeteer-based E2E runner
- 11 automated test scenarios
- Covers Resident, Guard, Visitor, Admin flows
- Generates JSON test reports
```

---

## Deployment Architecture

### Current Setup
```
Frontend:
- Hosted: Netlify CDN
- URL: https://ephemeral-malasada-49b47b.netlify.app
- Build: React production build
- Deploy: Automated on git push

Backend:
- Hosted: AWS ALB (af-south-1)
- URL: http://secure-gate-alb-148297441... (HTTP - needs HTTPS)
- Server: Node.js + PM2 process manager
- Reverse Proxy: Nginx

Database:
- PostgreSQL RDS (assumed)
- Backups: Automated daily
- Replication: Single instance (needs HA setup)

Cache:
- Redis standalone
- Persistence: RDB snapshots
```

### Environment Configuration
```
Development:
- Frontend: localhost:3000
- Backend: localhost:3001
- Database: localhost:5432
- Redis: localhost:6379

Staging (needed):
- Mirror production architecture
- Test data seeded
- Separate database

Production:
- CDN: Netlify
- API: AWS/DigitalOcean
- DB: RDS/Managed PostgreSQL
- Cache: Redis managed service
```

---

## Performance Characteristics

### Current Metrics (Estimated)
```
Frontend Load Time: 2-4s (3G)
API Response Time: 100-500ms
Database Query Time: 10-100ms
Concurrent Users: ~50 tested
Peak Throughput: Unknown (needs load testing)
```

### Optimization Strategies
```
Frontend:
- Code splitting (route-based)
- Lazy loading components
- Image optimization
- CDN caching

Backend:
- Database query optimization (indexes)
- Redis caching (frequent queries)
- Connection pooling (pg)
- Rate limiting (protection)

Database:
- Indexes on foreign keys
- Indexes on frequently queried columns
- Regular VACUUM and ANALYZE
- Query plan analysis
```

---

## Known Technical Debt

### High Priority
1. localStorage cleanup (45+ references need removal)
2. console.log replacement (239 instances → logger)
3. HTTPS enforcement (production ALB)
4. Secrets management (migrate to AWS Secrets Manager)
5. npm vulnerabilities (5 moderate issues)

### Medium Priority
1. Test coverage gaps (need more unit tests)
2. Real-time updates (WebSocket implementation)
3. Email/SMS service configuration (remove stubs)
4. Monitoring dashboard (production-grade)
5. Error boundary coverage (all major components)

### Low Priority
1. Code comments cleanup
2. Legacy file removal
3. Documentation updates
4. Performance profiling
5. Accessibility audit (WCAG 2.1 AA)

---

## System Readiness Summary

### Component Readiness
```
✅ Frontend:           95% (UI complete, minor fixes needed)
✅ Backend:            90% (API complete, security hardening needed)
✅ Database:           95% (Schema complete, performance tuning needed)
⚠️  Security:          85% (MFA done, HTTPS/secrets migration needed)
⚠️  Testing:           75% (Framework ready, coverage gaps)
⚠️  Deployment:        70% (Staging needed, HTTPS required)
⚠️  Documentation:     80% (Good coverage, API docs needed)

OVERALL: 85% READY
```

### Critical Blockers
1. Backend server not running (blocks all tests)
2. HTTPS not configured (security risk)
3. Secrets in plain text (security risk)
4. Staging environment missing (deployment risk)

### Next Steps
1. Start backend server → Run automated tests
2. Analyze test results → Fix failures
3. Execute comprehensive manual tests → Validate all flows
4. Security hardening → Fix 3 critical blockers
5. Staging deployment → Pre-production validation
6. Production deployment → Go-live checklist

---

**Document Status:** Complete  
**Last Updated:** November 25, 2025  
**Next Review:** After Phase 1 testing complete
