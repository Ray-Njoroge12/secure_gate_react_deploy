# Phase A0: Security Hardening Implementation Guide

**Priority**: CRITICAL - Must complete before any other work  
**Estimated Time**: 8-10 hours  
**Status**: In Progress

---

## A0.1: Configure HTTPS-Only on Load Balancer

### Current Issue
- AWS ALB using HTTP instead of HTTPS
- All traffic in plain text (passwords, tokens, PII exposed)
- URL: `http://secure-gate-alb-148297441.af-south-1.elb.amazonaws.com`
- **Violates**: Kenya DPA Article 44, OWASP A02:2021

### Steps to Fix

#### 1. Obtain SSL Certificate

**Option A: AWS Certificate Manager (Recommended)**
```bash
# Request certificate
aws acm request-certificate \
  --domain-name secure-gate.example.com \
  --subject-alternative-names *.secure-gate.example.com \
  --validation-method DNS \
  --region af-south-1
```

**Option B: Let's Encrypt**
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d secure-gate.example.com
```

#### 2. Configure ALB HTTPS Listener

**AWS Console**:
1. Go to EC2 → Load Balancers
2. Select your ALB
3. Go to "Listeners" tab
4. Click "Add listener"
5. Protocol: HTTPS, Port: 443
6. Add SSL certificate from ACM
7. Forward to target group

**AWS CLI**:
```bash
# Add HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:af-south-1:ACCOUNT:loadbalancer/app/secure-gate-alb/xxx \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:af-south-1:ACCOUNT:certificate/xxx \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:af-south-1:ACCOUNT:targetgroup/xxx
```

#### 3. Redirect HTTP to HTTPS

**AWS Console**:
1. Select HTTP:80 listener
2. Edit
3. Change default action to "Redirect to HTTPS"
4. Status code: 301 (Permanent)

**AWS CLI**:
```bash
# Modify HTTP listener to redirect
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:af-south-1:ACCOUNT:listener/app/secure-gate-alb/xxx \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

#### 4. Update Frontend URLs

**Netlify Configuration** (`netlify.toml`):
```toml
[[redirects]]
  from = "http://*"
  to = "https://:splat"
  status = 301
  force = true

[build.environment]
  REACT_APP_API_URL = "https://api.secure-gate.example.com"
```

**Update `.env` files**:
```bash
# Client .env
REACT_APP_API_URL=https://api.secure-gate.example.com

# Server .env
FRONTEND_URL=https://secure-gate.netlify.app
CORS_ORIGIN=https://secure-gate.netlify.app
```

#### 5. Verify HTTPS

```bash
# Test HTTPS endpoint
curl -I https://api.secure-gate.example.com/api/health

# Should return 200 with security headers
# HTTP/2 200
# strict-transport-security: max-age=31536000; includeSubDomains

# Test HTTP redirect
curl -I http://api.secure-gate.example.com/api/health

# Should return 301 redirect to HTTPS
```

### Validation Checklist
- [ ] SSL certificate obtained and installed
- [ ] HTTPS listener (443) configured
- [ ] HTTP listener (80) redirects to HTTPS
- [ ] Frontend env updated with HTTPS URLs
- [ ] All API calls use HTTPS
- [ ] Test with curl/browser
- [ ] Check SSL Labs rating (A or A+): https://www.ssllabs.com/ssltest/

---

## A0.2: Remove localStorage Token Usage

### Current Issue
- Found 45+ files using `localStorage.getItem('token')`
- XSS vulnerability: Complete account takeover risk
- **Violates**: OWASP A07:2021 (Identification and Authentication Failures)

### Detection Script

Run this script to find all localStorage usage:

```bash
#!/bin/bash
# File: find-localstorage-usage.sh

echo "Scanning for localStorage usage..."
echo "=================================="

echo -e "\n1. localStorage.getItem('token'):"
grep -r "localStorage.getItem('token')" client/src --include="*.js" --include="*.jsx" -n

echo -e "\n2. localStorage.setItem('token'):"
grep -r "localStorage.setItem('token')" client/src --include="*.js" --include="*.jsx" -n

echo -e "\n3. localStorage.removeItem('token'):"
grep -r "localStorage.removeItem('token')" client/src --include="*.js" --include="*.jsx" -n

echo -e "\n4. All localStorage usage:"
grep -r "localStorage\." client/src --include="*.js" --include="*.jsx" -n | wc -l

echo -e "\nDone. Review files above and replace with httpOnly cookie patterns."
```

### Replacement Pattern

**BEFORE (Vulnerable)**:
```javascript
// DON'T DO THIS
const token = localStorage.getItem('token');
fetch('/api/visitors', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**AFTER (Secure)**:
```javascript
// DO THIS INSTEAD
fetch('/api/visitors', {
  credentials: 'include',  // Sends httpOnly cookies automatically
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Files to Update

Based on your codebase, these are the likely files needing updates:

**Authentication Context**:
- `/client/src/contexts/AuthContext.js`
  - Remove all `localStorage` references
  - Rely on httpOnly cookies sent by server

**Protected Routes**:
- `/client/src/components/ProtectedRoute.jsx`
  - Remove token checks
  - Use auth context state instead

**API Calls**:
- All fetch calls need `credentials: 'include'`
- Remove manual Authorization headers

### Implementation Steps

1. **Update AuthContext**:
```javascript
// Remove these lines:
// localStorage.setItem('token', token);
// localStorage.getItem('token');
// localStorage.removeItem('token');

// Keep only user state from API response
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);

// Login function
const login = async (email, password) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include', // Server sets httpOnly cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await res.json();
  setUser(data.user); // Store user, NOT token
};
```

2. **Update all API calls**:
```bash
# Find all fetch calls
grep -r "fetch(" client/src --include="*.js" --include="*.jsx" -n

# Ensure each has credentials: 'include'
```

3. **Test authentication flows**:
- [ ] Login
- [ ] Logout
- [ ] Page refresh (should maintain session)
- [ ] Protected route access
- [ ] Token expiration handling

---

## A0.3: Migrate Secrets to AWS Secrets Manager

### Current Issue
- Plain text secrets in `.env` file
- DB password, JWT secrets, Redis password exposed
- Risk if committed to Git or server compromised

### Setup AWS Secrets Manager

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
```

### Create Secrets

```bash
# 1. Database credentials
aws secretsmanager create-secret \
  --name secure-gate/db/credentials \
  --description "PostgreSQL database credentials" \
  --secret-string '{
    "host":"your-db.af-south-1.rds.amazonaws.com",
    "port":"5432",
    "database":"secure_gate",
    "username":"postgres",
    "password":"your-secure-password"
  }' \
  --region af-south-1

# 2. JWT secrets
aws secretsmanager create-secret \
  --name secure-gate/jwt/secrets \
  --description "JWT signing secrets" \
  --secret-string '{
    "accessTokenSecret":"your-strong-random-secret-here",
    "refreshTokenSecret":"your-other-strong-random-secret"
  }' \
  --region af-south-1

# 3. Redis password
aws secretsmanager create-secret \
  --name secure-gate/redis/password \
  --description "Redis connection password" \
  --secret-string "your-redis-password" \
  --region af-south-1

# 4. API keys (SendGrid, Twilio, etc.)
aws secretsmanager create-secret \
  --name secure-gate/api-keys \
  --description "Third-party API keys" \
  --secret-string '{
    "sendgrid":"SG.xxx",
    "twilio_sid":"ACxxx",
    "twilio_token":"xxx"
  }' \
  --region af-south-1
```

### Update Server Code

**Install SDK**:
```bash
cd server
npm install @aws-sdk/client-secrets-manager
```

**Create secrets service** (`server/src/services/secretsService.js`):
```javascript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'af-south-1' });

const secretCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSecret(secretName) {
  // Check cache first
  const cached = secretCache.get(secretName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);
    
    let secret;
    if (response.SecretString) {
      secret = JSON.parse(response.SecretString);
    } else {
      // Binary secret
      const buff = Buffer.from(response.SecretBinary, 'base64');
      secret = buff.toString('ascii');
    }

    // Cache the secret
    secretCache.set(secretName, {
      value: secret,
      timestamp: Date.now()
    });

    return secret;
  } catch (error) {
    console.error(`Error fetching secret ${secretName}:`, error);
    throw error;
  }
}

export async function getDBCredentials() {
  return await getSecret('secure-gate/db/credentials');
}

export async function getJWTSecrets() {
  return await getSecret('secure-gate/jwt/secrets');
}

export async function getRedisPassword() {
  return await getSecret('secure-gate/redis/password');
}

export async function getAPIKeys() {
  return await getSecret('secure-gate/api-keys');
}
```

**Update database connection** (`server/src/database/db.enhanced.js`):
```javascript
import { getDBCredentials } from '../services/secretsService.js';

// Old way (remove):
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL
// });

// New way:
let pool;

async function initializeDB() {
  const dbCreds = await getDBCredentials();
  
  pool = new Pool({
    host: dbCreds.host,
    port: dbCreds.port,
    database: dbCreds.database,
    user: dbCreds.username,
    password: dbCreds.password,
    ssl: { rejectUnauthorized: false }
  });
  
  return pool;
}

export { initializeDB, pool };
```

**Update server startup** (`server/src/server.js`):
```javascript
import { initializeDB } from './database/db.enhanced.js';

async function startServer() {
  try {
    // Initialize database with secrets
    await initializeDB();
    console.log('Database initialized with secure credentials');

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

### Rotate Secrets

```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update secret
aws secretsmanager update-secret \
  --secret-id secure-gate/jwt/secrets \
  --secret-string '{"accessTokenSecret":"NEW_SECRET","refreshTokenSecret":"NEW_SECRET2"}' \
  --region af-south-1
```

### Validation
- [ ] Secrets created in AWS Secrets Manager
- [ ] Server fetches secrets on startup
- [ ] Database connection works
- [ ] JWT signing/verification works
- [ ] All API keys functional
- [ ] .env file cleaned (only non-sensitive config remains)

---

## A0.4: Remove Production console.log Statements

### Detection

```bash
#!/bin/bash
# find-console-logs.sh

echo "Finding console.log statements..."
echo "=================================="

# Backend
echo -e "\nBackend (server/src):"
grep -r "console\.log" server/src --include="*.js" -n | wc -l

# Frontend
echo -e "\nFrontend (client/src):"
grep -r "console\.log" client/src --include="*.js" --include="*.jsx" -n | wc -l

# List all occurrences
echo -e "\nAll console.log locations:"
grep -r "console\.log" server/src client/src --include="*.js" --include="*.jsx" -n
```

### Replacement Strategy

**Use proper logger instead**:

**Backend** (`server/src/utils/logger.js` - already exists):
```javascript
import logger from '../utils/logger.js';

// Replace console.log with:
logger.info('Message');
logger.warn('Warning');
logger.error('Error', error);
logger.debug('Debug info'); // Only in development
```

**Frontend** - Create logger:
```javascript
// client/src/utils/logger.js
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.WARN 
  : LOG_LEVELS.DEBUG;

export const logger = {
  error: (...args) => {
    if (currentLevel >= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
      // Optionally send to error tracking service (Sentry, etc.)
    }
  },
  
  warn: (...args) => {
    if (currentLevel >= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  },
  
  info: (...args) => {
    if (currentLevel >= LOG_LEVELS.INFO) {
      console.info('[INFO]', ...args);
    }
  },
  
  debug: (...args) => {
    if (currentLevel >= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }
};
```

### Find and Replace

```bash
# Create replacement script
cat > replace-console-logs.sh << 'EOF'
#!/bin/bash

# Backend replacements
find server/src -name "*.js" -type f -exec sed -i.bak 's/console\.log(/logger.info(/g' {} +
find server/src -name "*.js" -type f -exec sed -i.bak 's/console\.error(/logger.error(/g' {} +
find server/src -name "*.js" -type f -exec sed -i.bak 's/console\.warn(/logger.warn(/g' {} +

# Frontend replacements
find client/src -name "*.js" -o -name "*.jsx" -type f -exec sed -i.bak 's/console\.log(/logger.debug(/g' {} +
find client/src -name "*.js" -o -name "*.jsx" -type f -exec sed -i.bak 's/console\.error(/logger.error(/g' {} +

# Remove backup files
find . -name "*.bak" -delete

echo "Console.log replacement complete. Review changes and test."
EOF

chmod +x replace-console-logs.sh
```

### Manual Review Required

Some console.logs may be legitimate (e.g., startup messages). Review and decide:
- Keep: Server startup, version info
- Remove: Debug statements, user data, tokens
- Replace: Error logging, warnings

---

## A0.5: Tighten CORS Policy

### Current Issue
- CORS allows `origin: '*'` or weak configuration
- Potential for CSRF attacks

### Fix

**server/src/app.js**:
```javascript
import cors from 'cors';

// OLD (insecure):
// app.use(cors());

// NEW (secure):
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://secure-gate.netlify.app',
  'https://secure-gate-staging.netlify.app' // Staging if needed
];

// In development only:
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:3000');
  allowedOrigins.push('http://localhost:3001');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
}));
```

---

## A0.6: Add Security Headers

### Install Helmet

```bash
cd server
npm install helmet
```

### Configure

**server/src/app.js**:
```javascript
import helmet from 'helmet';

// Apply security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny' // Prevent clickjacking
  },
  noSniff: true, // Prevent MIME sniffing
  xssFilter: true, // Enable XSS filter
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// Remove X-Powered-By header
app.disable('x-powered-by');
```

### Verify

```bash
# Test headers
curl -I https://api.secure-gate.example.com/api/health

# Should see:
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# x-frame-options: DENY
# x-content-type-options: nosniff
# referrer-policy: strict-origin-when-cross-origin
# (no x-powered-by header)
```

---

## A0.7 & A0.8: Update Dependencies

### Check Vulnerabilities

```bash
cd server
npm audit

cd ../client
npm audit
```

### Fix High/Critical

```bash
# Auto-fix where possible
npm audit fix

# Force major version updates if needed
npm audit fix --force

# Manual updates for breaking changes
npm outdated
npm update package-name@latest
```

### Test After Updates

```bash
# Backend
cd server
npm test
npm start

# Frontend
cd client
npm test
npm start
```

---

## A0.9: Environment Configuration

### Create Environment Files

**`.env.development`**:
```bash
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
DATABASE_URL=postgresql://localhost/secure_gate_dev
REDIS_URL=redis://localhost:6379
```

**`.env.staging`**:
```bash
NODE_ENV=staging
PORT=5000
FRONTEND_URL=https://secure-gate-staging.netlify.app
LOG_LEVEL=info
# Secrets fetched from AWS Secrets Manager
```

**`.env.production`**:
```bash
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://secure-gate.netlify.app
LOG_LEVEL=warn
# Secrets fetched from AWS Secrets Manager
```

### Load Based on NODE_ENV

**server/src/config/index.js**:
```javascript
import dotenv from 'dotenv';

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${env}` });

export default {
  env,
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL,
  logLevel: process.env.LOG_LEVEL || 'info',
  isDevelopment: env === 'development',
  isProduction: env === 'production'
};
```

---

## A0.10: Security Audit & Penetration Testing

### Automated Scanning

**OWASP ZAP**:
```bash
# Install ZAP
docker pull owasp/zap2docker-stable

# Run scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.secure-gate.example.com \
  -r zap-report.html
```

**npm audit**:
```bash
npm audit --production
```

**Snyk** (optional):
```bash
npm install -g snyk
snyk auth
snyk test
```

### Manual Testing

1. **Authentication**:
   - [ ] Test login with weak passwords
   - [ ] Test brute force protection
   - [ ] Test session timeout
   - [ ] Test logout

2. **Authorization**:
   - [ ] Test accessing admin routes as guard
   - [ ] Test accessing guard routes as resident
   - [ ] Test IDOR vulnerabilities

3. **Input Validation**:
   - [ ] Test SQL injection
   - [ ] Test XSS attacks
   - [ ] Test command injection
   - [ ] Test file upload vulnerabilities

4. **Session Management**:
   - [ ] Test cookie security flags
   - [ ] Test CSRF protection
   - [ ] Test session fixation

### Security Checklist

- [ ] All traffic uses HTTPS
- [ ] No localStorage tokens
- [ ] Secrets in vault (not .env)
- [ ] No console.log in production
- [ ] CORS properly configured
- [ ] Security headers present
- [ ] X-Powered-By removed
- [ ] Dependencies up to date
- [ ] npm audit clean
- [ ] OWASP ZAP scan passed
- [ ] Manual penetration testing completed
- [ ] Rate limiting active
- [ ] Audit logging functional
- [ ] Error messages don't leak info
- [ ] API documentation doesn't expose internals

---

## Validation & Sign-Off

### Automated Tests

```bash
# Run all tests
npm run test:security

# Check coverage
npm run test:coverage
```

### Manual Verification

1. **SSL Labs**: https://www.ssllabs.com/ssltest/
   - Target: A or A+ rating

2. **Security Headers**: https://securityheaders.com
   - Target: A rating

3. **Mozilla Observatory**: https://observatory.mozilla.org
   - Target: B+ or higher

### Performance Check

```bash
# Load test
npm run test:load

# Should handle 1000 concurrent requests
# Response time p95 < 500ms
```

### Sign-Off Criteria

- [ ] All A0.1-A0.10 tasks completed
- [ ] All validation tests passed
- [ ] Security audit clean
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Team review completed

---

**Status**: Ready for Implementation  
**Next Phase**: V1 (Visitor Invite Landing) - can only start after A0 complete  
**Blocking**: All other work until A0 is done
