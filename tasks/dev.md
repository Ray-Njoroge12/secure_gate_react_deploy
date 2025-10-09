# 🔍 PRE-PRODUCTION REMOVAL CHECKLIST

**Purpose**: Track code/functions to remove before production deployment  
**Status**: Active  
**Last Updated**: October 7, 2025

---

## ⚠️ ITEMS TO REMOVE BEFORE PRODUCTION

### 🔴 CRITICAL - Must Remove

#### 1. Debug/Development Code
```
Status: TO BE REVIEWED IN WEEK 2

Files to Check:
├── server.js - Look for debug console.logs
├── src/app.js - Check for development middleware
├── src/controllers/*.js - Remove debug statements
└── src/services/*.js - Remove verbose logging
```

#### 2. TODO/FIXME Comments
```
Current Status: 3 TODO items found

Location: 
├── src/services/securityMonitoringService.js:270
│   └── TODO: Integrate with notification system
├── src/services/enhancedHealthService.js:102
│   └── TODO: Get version from package.json
└── src/controllers/visitorOtpController.js:46
    └── TODO: Send OTP via SMS/Email

Action Required:
- Review and implement or remove before production
```

#### 3. Test/Mock Endpoints
```
Status: TO BE REVIEWED IN WEEK 1

Potential Test Endpoints:
├── /api/test/* - Check if any test routes exist
├── /debug/* - Check for debug endpoints
└── Mock services in production config
```

#### 4. Development Secrets
```
Status: WEEK 4 - SECRET ROTATION

Must Replace:
├── .env - Contains development secrets
├── .env.production - Needs production secrets
├── JWT_SECRET - Must rotate
├── JWT_REFRESH_SECRET - Must rotate
├── SESSION_SECRET - Must rotate
└── PGPASSWORD - Must rotate
```

---

## 🟡 HIGH PRIORITY - Should Remove

#### 5. Commented Out Code
```
Status: TO BE REVIEWED

Files with Commented Code:
├── src/app.js:42-43
│   └── Commented resident/guard routes (intentional)
└── Other files TBD in Week 2 review
```

#### 6. Development-Only Environment Variables
```
Status: WEEK 4 - ENVIRONMENT CONFIG

Development Variables to Remove/Change:
├── OTP_DEBUG_ECHO=false - Verify removed in production
├── Development database URLs
├── Development Redis URLs
└── Development CORS origins
```

#### 7. Verbose Logging Statements
```
Status: TO BE REVIEWED IN WEEK 2

Areas to Check:
├── Database queries - Remove verbose logging
├── Authentication flows - Keep security logs only
├── API requests - Keep error/audit logs only
└── Service operations - Keep critical logs only
```

---

## 🟢 MEDIUM PRIORITY - Nice to Remove

#### 8. Unused Dependencies
```
Status: WEEK 1 - DEPENDENCY REVIEW

Check for:
├── Unused npm packages
├── Development dependencies in production
└── Duplicate packages
```

#### 9. Deprecated Functions
```
Status: TO BE REVIEWED

Check for:
├── Old authentication methods
├── Deprecated API endpoints
├── Legacy middleware
└── Old utility functions
```

#### 10. Sample/Fixture Data
```
Status: WEEK 1 - TEST DATA REVIEW

Ensure Removed:
├── Test user accounts
├── Sample visitor data
├── Test database seeds (in production)
└── Mock service responses
```

---

## 📋 LEGACY CODE REVIEW

### Potential Overlapping Code

#### Authentication:
```
Status: TO BE REVIEWED IN WEEK 2

Check for:
├── Multiple authentication middleware
├── Duplicate token validation
├── Multiple session handlers
└── Redundant RBAC checks

Files to Review:
├── src/middleware/authMiddleware.js
├── src/middleware/roleMiddleware.js
└── src/services/tokenService.js
```

#### Error Handling:
```
Status: TO BE REVIEWED IN WEEK 2

Check for:
├── Multiple error handlers
├── Duplicate error formatters
├── Overlapping error logging

Files to Review:
├── src/middleware/errorHandler.js
├── src/middleware/standardizedErrorHandler.js
└── src/middleware/enhancedErrorHandler.js
```

#### Database Operations:
```
Status: TO BE REVIEWED IN WEEK 2

Check for:
├── Multiple database connection managers
├── Duplicate query helpers
├── Overlapping transaction handlers

Files to Review:
├── src/database/db.enhanced.js
├── src/config/database-wrapper.js
└── src/utils/transactionHelper.js
```

---

## 🔒 SECURITY REVIEW CHECKLIST

### Before Production Deployment:

#### Environment Files:
- [ ] .env removed from git (verify .gitignore)
- [ ] .env.production contains only production values
- [ ] No development secrets in production config
- [ ] All secrets rotated with strong values

#### Sensitive Information:
- [ ] No API keys in frontend code
- [ ] No database passwords in code
- [ ] No JWT secrets in code
- [ ] No email/SMS credentials in code
- [ ] No private keys in repository

#### Debug Features:
- [ ] Debug mode disabled
- [ ] Stack traces hidden in production
- [ ] Verbose logging reduced
- [ ] Development endpoints removed
- [ ] Test routes removed

#### Security Configuration:
- [ ] ENFORCE_HTTPS=true
- [ ] SECURE_COOKIES=true
- [ ] Production CORS origins only
- [ ] Rate limiting enabled
- [ ] Security headers enabled

---

## 📊 REVIEW SCHEDULE

### Week 1 Reviews:
- [ ] Test data and fixtures review
- [ ] Dependency audit
- [ ] Environment variable audit

### Week 2 Reviews:
- [ ] Code comments (TODO/FIXME)
- [ ] Debug statements
- [ ] Overlapping functions
- [ ] Legacy code

### Week 3 Reviews:
- [ ] Performance bottlenecks
- [ ] Security vulnerabilities
- [ ] Error handling

### Week 4 Reviews:
- [ ] Production configuration
- [ ] Secret rotation
- [ ] Final security audit
- [ ] Deployment checklist

---

## 🔍 HOW TO CHECK

### Search for Debug Code:
```bash
# Find console.log statements
grep -r "console.log" src/

# Find TODO comments
grep -r "TODO" src/

# Find FIXME comments
grep -r "FIXME" src/

# Find debug statements
grep -r "debug" src/ -i

# Find test endpoints
grep -r "/test" src/routes/
```

### Check Environment Files:
```bash
# List all .env files
find . -name ".env*" -type f

# Check .gitignore
cat .gitignore | grep .env

# Verify no secrets in git
git log --all --full-history -- "*.env"
```

### Review Dependencies:
```bash
# List all dependencies
npm list --depth=0

# Check for vulnerabilities
npm audit

# Find unused dependencies
npx depcheck
```

---

## ✅ PRODUCTION READINESS GATES

### Gate 1: Code Clean (End of Week 2)
- [ ] All TODO/FIXME reviewed
- [ ] All debug code removed
- [ ] No test endpoints in production code
- [ ] Legacy code identified and documented

### Gate 2: Security Clean (End of Week 3)
- [ ] No sensitive information in code
- [ ] All secrets prepared for rotation
- [ ] Security tests passed
- [ ] Vulnerability scan clean

### Gate 3: Production Config (End of Week 4)
- [ ] All secrets rotated
- [ ] Production environment configured
- [ ] Development-only code removed
- [ ] Final security review passed

---

## 📝 NOTES

### Items Intentionally Kept:
1. Commented resident/guard routes in app.js
   - Reason: Placeholder for future implementation
   - Action: Document as intentional

2. Development configuration files
   - Reason: Needed for local development
   - Action: Ensure not deployed to production

### Items Under Review:
1. Multiple error handler middleware
   - Status: To be reviewed in Week 2
   - Decision: Consolidate or document purpose

2. Database connection files
   - Status: To be reviewed in Week 2
   - Decision: Verify no duplication

---

## 🚨 CRITICAL REMINDERS

1. **NEVER commit .env files to git**
2. **ALWAYS rotate secrets before production**
3. **VERIFY no debug code in production build**
4. **CHECK no test data in production database**
5. **ENSURE no development URLs in production config**

---

## 📞 QUESTIONS TO ASK

Before Production:
1. Are all TODO items resolved or documented?
2. Is legacy code documented or removed?
3. Are all secrets rotated?
4. Is debug code removed?
5. Are test endpoints removed?

---

**Status**: 📋 Active Tracking  
**Review Frequency**: Weekly during Phase 1  
**Final Review**: End of Week 4  
**Owner**: Development Team
