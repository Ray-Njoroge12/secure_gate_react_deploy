# 📐 Phase 1: System Architecture Analysis

**Date:** October 22, 2025  
**Status:** In Progress  
**Objective:** Complete system architecture review and component mapping

---

## 🏗️ System Overview

### Technology Stack

#### Frontend (Client)
- **Framework:** React 18.3.1
- **UI Library:** Lucide React icons
- **Styling:** TailwindCSS 3.4.17
- **State Management:** React Context API
- **Routing:** React Router DOM 6.28.0
- **QR Code:** react-qr-code 2.0.18
- **HTTP Client:** Axios 1.11.0
- **Build Tool:** React Scripts 5.0.1

#### Backend (Server)
- **Runtime:** Node.js 18 (ES Modules)
- **Framework:** Express 4.18.2
- **Database:** PostgreSQL 15 (Alpine)
- **Cache:** Redis 7 (Alpine)
- **Authentication:** JWT (jsonwebtoken 9.0.2)
- **Password Hashing:** Argon2 0.44.0
- **API Documentation:** Swagger (swagger-jsdoc 6.2.8)

#### Communication Services
- **Email Provider 1:** Mailgun.js 12.1.1
- **Email Provider 2:** Nodemailer 7.0.6 (SMTP)
- **SMS Provider 1:** Twilio 5.10.2
- **SMS Provider 2:** Africa's Talking 0.7.7

#### DevOps & Infrastructure
- **Containerization:** Docker + Docker Compose
- **Load Balancer:** HAProxy (configured)
- **Monitoring:** Custom monitoring service
- **Logging:** Winston 3.18.3 with daily rotate

---

## 📁 Directory Structure Analysis

### Backend Structure
```
server/
├── src/
│   ├── controllers/       # Request handlers
│   │   ├── userController.js
│   │   ├── visitorController.js
│   │   ├── visitorInviteController.js
│   │   ├── adminController.js
│   │   └── dashboardController.js
│   ├── services/          # Business logic
│   │   ├── notificationService.js    ← Email/SMS
│   │   ├── userService.js
│   │   ├── tokenService.js
│   │   ├── mfaService.js
│   │   └── realtimeAlertingService.js
│   ├── routes/            # API endpoints
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── visitorRoutes.js
│   │   ├── adminRoutes.js
│   │   └── v1/, v2/       # Versioned APIs
│   ├── middleware/        # Express middleware
│   │   ├── authMiddleware.js
│   │   ├── validationMiddleware.js
│   │   ├── rateLimit.js
│   │   └── auditLogging.js
│   ├── templates/         # Email/SMS templates
│   │   ├── email-templates.js
│   │   └── sms-templates.js
│   ├── config/           # Configuration
│   │   ├── environment.js
│   │   ├── validateEnv.js
│   │   └── swagger.js
│   └── database/         # DB setup
├── tests/               # Test suites
│   ├── integration/
│   ├── unit/
│   ├── e2e/
│   ├── performance/
│   └── security/
└── scripts/            # Utility scripts
```

### Frontend Structure
```
client/
├── src/
│   ├── pages/              # Page components
│   │   ├── Dashboard.js
│   │   ├── admin/
│   │   │   └── AdminDashboard.jsx
│   │   ├── guard/
│   │   │   └── GuardDashboard.jsx
│   │   └── resident/
│   │       └── ResidentDashboard.jsx
│   ├── components/         # Reusable components
│   │   ├── PerformanceDashboard.jsx
│   │   ├── LoadBalancerDashboard.jsx
│   │   └── BackupDrDashboard.jsx
│   ├── contexts/          # React Context
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API service layer
│   ├── utils/            # Utility functions
│   ├── styles/           # CSS/Styling
│   └── routes/           # Route configuration
└── public/              # Static assets
```

---

## 🔌 API Endpoints Identified

### Authentication Endpoints
```
POST   /api/auth/register          - User registration
POST   /api/auth/login             - User login
POST   /api/auth/logout            - User logout
POST   /api/auth/refresh           - Token refresh
POST   /api/auth/forgot-password   - Password recovery
POST   /api/auth/reset-password    - Password reset
POST   /api/auth/verify-email      - Email verification
```

### User Management Endpoints
```
GET    /api/users                  - List all users (admin)
GET    /api/users/:id              - Get user details
POST   /api/users                  - Create user
PUT    /api/users/:id              - Update user
DELETE /api/users/:id              - Delete user
GET    /api/users/profile          - Get current user profile
PUT    /api/users/profile          - Update profile
```

### Visitor Management Endpoints
```
GET    /api/visitors               - List visitors
GET    /api/visitors/:id           - Get visitor details
POST   /api/visitors               - Create visitor invitation
PUT    /api/visitors/:id           - Update visitor
DELETE /api/visitors/:id           - Delete visitor
POST   /api/visitors/bulk          - Bulk visitor creation
POST   /api/visitors/:id/resend    - Resend invitation
```

### Pass & OTP Endpoints
```
GET    /api/passes/:id             - Get pass details
POST   /api/visitors/:id/pass      - Generate pass
GET    /api/passes/:id/verify      - Verify pass
POST   /api/passes/:id/revoke      - Revoke pass
POST   /api/otp/generate           - Generate OTP
POST   /api/otp/verify             - Verify OTP
POST   /api/otp/resend             - Resend OTP
```

### Access Log Endpoints
```
GET    /api/access-logs            - Get access logs
POST   /api/access-logs            - Create log entry
GET    /api/access-logs/:id        - Get specific log
```

### Admin Endpoints
```
GET    /api/admin/dashboard        - Dashboard stats
GET    /api/admin/users            - User management
GET    /api/admin/reports          - Generate reports
GET    /api/admin/settings         - System settings
```

### API Versioning
- **v1:** `/api/v1/*` - Original API version
- **v2:** `/api/v2/*` - Enhanced API version

---

## 🔐 Security Architecture

### Authentication Flow
1. **User Registration:**
   - Input validation (Joi)
   - Password hashing (Argon2)
   - Email verification token generation
   - Welcome email sent via Mailgun/SMTP

2. **Login Process:**
   - Email or username lookup
   - Password verification (Argon2)
   - JWT token generation (15min access, 7day refresh)
   - Session creation in Redis
   - Rate limiting applied

3. **Token Management:**
   - Access token (short-lived)
   - Refresh token (long-lived)
   - Token blacklist in Redis
   - Automatic token refresh

### Authorization System
- **Role-Based Access Control (RBAC)**
  - Admin: Full system access
  - Guard: Visitor verification, access logging
  - Resident: Visitor invitation, management

### Security Middleware Stack
1. **Helmet:** HTTP security headers
2. **CORS:** Cross-origin resource sharing
3. **Rate Limiting:** Express-rate-limit + Redis
4. **Input Validation:** Joi schemas
5. **SQL Injection Protection:** Parameterized queries
6. **XSS Protection:** Input sanitization
7. **CSRF Protection:** Token validation
8. **Audit Logging:** All actions logged

---

## 📧 Email/SMS Integration Architecture

### Email System
**Provider:** Dual setup (Mailgun primary, SMTP fallback)

**Configuration:**
- Mailgun client initialized with API key
- SMTP transporter as backup
- Provider selection via `EMAIL_PROVIDER` env variable

**Email Templates Available:**
1. `visitorInviteTemplate` - Single visitor invitation
2. `bulkInviteTemplate` - Bulk invitations
3. `otpVerificationTemplate` - OTP codes
4. Welcome emails
5. Password reset emails
6. Email verification

**Functions:**
```javascript
sendVisitorInviteEmail(visitorData, residentData, inviteLink, qrCode)
sendBulkInviteEmails(visitors, residentData)
sendOtpEmail(userData, otpCode)
sendWelcomeEmail(userData)
sendPasswordResetEmail(userData, resetToken)
```

### SMS System
**Providers:** Dual setup (Twilio + Africa's Talking)

**Configuration:**
- Twilio client for international SMS
- Africa's Talking for African numbers
- Automatic provider selection based on phone format

**SMS Templates Available:**
1. `visitorInviteSmsTemplate` - Invitation notifications
2. `bulkInviteSmsTemplate` - Bulk notifications
3. `otpVerificationSmsTemplate` - OTP delivery
4. `qrCodeReadySmsTemplate` - Pass ready notification
5. `checkinReminderSmsTemplate` - Check-in reminders

**Functions:**
```javascript
sendVisitorInviteSms(phoneNumber, inviteData)
sendOtpSms(phoneNumber, otpCode)
sendBulkInviteSms(phoneNumbers, message)
sendQrCodeReadySms(phoneNumber, visitorName)
```

### Notification Service Features
- **Retry Logic:** 3 attempts for failed deliveries
- **Fallback:** Email fallback if SMS fails
- **Logging:** All notifications logged
- **Metrics:** Delivery success tracking
- **Queue System:** Bulk operations queued

---

## 💾 Database Architecture

### Primary Database: PostgreSQL 15

**Connection Details:**
- Host: secure-gate-postgres-prod
- Port: 5432
- Status: ✅ Healthy (confirmed)

**Tables Identified:**
1. `users` - User accounts
2. `visitors` - Visitor records
3. `passes` - Access passes
4. `access_logs` - Entry/exit logs
5. `audit_logs` - System audit trail
6. `otp_resend_log` - OTP tracking
7. `bulk_invites` - Bulk operations
8. `security_events` - Security incidents
9. `performance_metrics` - Performance data (needs creation)

### Cache Layer: Redis 7

**Connection Details:**
- Host: secure-gate-redis-prod
- Port: 6379
- Status: ✅ Healthy (confirmed)

**Usage:**
- Session storage
- Rate limiting counters
- Token blacklist
- Cache for frequent queries
- Real-time data

---

## 🐳 Docker Infrastructure

### Services Running
```yaml
secure-gate-backend-prod:
  - Image: secure-gate-access-backend
  - Port: 5001 → 5000
  - Status: ⚠️ Unhealthy (needs investigation)
  - Uptime: 5 days

secure-gate-postgres-prod:
  - Image: postgres:15-alpine
  - Port: 5432
  - Status: ✅ Healthy
  - Uptime: 6 days

secure-gate-redis-prod:
  - Image: redis:7-alpine
  - Port: 6379
  - Status: ✅ Healthy
  - Uptime: 6 days
```

### Additional Infrastructure Files
- `docker-compose.prod.yml` - Production setup
- `docker-compose.ha.yml` - High availability
- `docker-compose.monitoring.yml` - Monitoring stack
- `docker-compose.dr.yml` - Disaster recovery
- `haproxy/` - Load balancer config
- `nginx/` - Reverse proxy config

---

## 🔍 Issues Identified

### Critical Issues
1. **Backend Unhealthy:** Container marked as unhealthy
   - Likely cause: Health check failing
   - Need to investigate logs
   - May affect API availability

2. **Missing Database Table:** `performance_metrics` table not created
   - Causing errors in logs
   - Need to run migration

### Configuration Issues
1. Environment variable access restricted (security - good)
2. Docker Compose version field deprecated

---

## 📊 Component Status Matrix

| Component | Status | Health | Version | Notes |
|-----------|--------|--------|---------|-------|
| Frontend | 🟡 Unknown | N/A | React 18.3 | Need to check if running |
| Backend API | 🔴 Unhealthy | Failing | Node 18 | Container health check failing |
| PostgreSQL | 🟢 Healthy | ✅ | 15-alpine | Running 6 days |
| Redis | 🟢 Healthy | ✅ | 7-alpine | Running 6 days |
| Email (Mailgun) | 🟡 Unknown | N/A | 12.1.1 | Config present, untested |
| Email (SMTP) | 🟡 Unknown | N/A | 7.0.6 | Config present, untested |
| SMS (Twilio) | 🟡 Unknown | N/A | 5.10.2 | Config present, untested |
| SMS (AT) | 🟡 Unknown | N/A | 0.7.7 | Config present, untested |

---

## 🎯 Next Steps

### Immediate Actions:
1. ✅ Investigate backend unhealthy status
2. ⏳ Check backend logs for errors
3. ⏳ Test API endpoints functionality
4. ⏳ Verify email/SMS integration
5. ⏳ Check frontend availability

### Phase 2 Focus:
- Email/SMS integration testing
- Test all user role notifications
- Verify delivery rates

### Phase 3 Focus:
- Frontend UI/UX analysis
- Dashboard testing per role
- Form validation testing

---

**Analysis Status:** Phase 1 - 40% Complete  
**Next:** Backend health investigation and log analysis
