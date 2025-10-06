# Environment Setup Guide
# Secure Gate Access Control System

This guide provides comprehensive instructions for setting up the environment configuration for the Secure Gate Access Control System.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables Reference](#environment-variables-reference)
- [Backend Configuration](#backend-configuration)
- [Frontend Configuration](#frontend-configuration)
- [Production Setup](#production-setup)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Backend Setup

```bash
# Navigate to server directory
cd secure-gate-access/server

# Copy environment template
cp env.example .env

# Run interactive setup (recommended)
node scripts/setup-env.js

# Or generate with defaults
node scripts/setup-env.js --generate

# Validate configuration
npm run validate:env
```

### 2. Frontend Setup

```bash
# Navigate to client directory
cd secure-gate-access/client

# Copy environment template
cp env.example .env

# Edit .env file with your configuration
nano .env
```

### 3. Start the Application

```bash
# Start backend (from server directory)
npm run dev

# Start frontend (from client directory)
npm start
```

## Environment Variables Reference

### Backend Variables

#### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `development`, `test`, `production` | ✅ |
| `PORT` | Server port | `3001` | ✅ |
| `PGHOST` | Database host | `localhost` | ✅ |
| `PGDATABASE` | Database name | `secure_gate` | ✅ |
| `PGUSER` | Database user | `secure_gate_user` | ✅ |
| `PGPASSWORD` | Database password | `secure_gate_password` | ✅ |
| `JWT_SECRET` | JWT signing secret | `your-secret-64-chars-min` | ✅ |

#### Security Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_REFRESH_SECRET` | JWT refresh token secret | `your-refresh-secret-64-chars` | ⚠️ |
| `SESSION_SECRET` | Session secret | `your-session-secret-64-chars` | ⚠️ |
| `CLIENT_ORIGIN` | CORS origin | `http://localhost:3000` | ⚠️ |
| `ENFORCE_HTTPS` | Force HTTPS | `true`, `false` | ⚠️ |
| `SECURE_COOKIES` | Secure cookie flag | `true`, `false` | ⚠️ |

#### Optional Service Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` | ❌ |
| `SMTP_USER` | SMTP username | `your-email@gmail.com` | ❌ |
| `SMTP_PASS` | SMTP password | `your-app-password` | ❌ |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `ACxxxxxxxxxxxxxxxx` | ❌ |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `your-twilio-token` | ❌ |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | ❌ |

### Frontend Variables

#### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `REACT_APP_ENVIRONMENT` | Application environment | `development`, `production` | ✅ |
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:3001` | ⚠️ |

#### Optional Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `REACT_APP_TITLE` | Application title | `Secure Gate Access Control` | ❌ |
| `REACT_APP_DEBUG_MODE` | Enable debug mode | `true`, `false` | ❌ |
| `REACT_APP_ENABLE_NOTIFICATIONS` | Enable notifications | `true`, `false` | ❌ |

## Backend Configuration

### Database Setup

1. **Install PostgreSQL**
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Create Database and User**
   ```sql
   -- Connect to PostgreSQL
   psql -U postgres
   
   -- Create database
   CREATE DATABASE secure_gate;
   
   -- Create user
   CREATE USER secure_gate_user WITH PASSWORD 'secure_gate_password';
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE secure_gate TO secure_gate_user;
   
   -- Exit
   \q
   ```

3. **Run Database Migrations**
   ```bash
   cd secure-gate-access/server
   npm run db:migrate
   ```

### Environment Validation

The system includes comprehensive environment validation:

```bash
# Validate current configuration
npm run validate:env

# Check specific environment
NODE_ENV=production npm run validate:env
```

### Security Configuration

#### JWT Secrets

Generate strong JWT secrets:

```bash
# Generate 64-character base64url secret
openssl rand -base64 64 | tr -d "=+/" | cut -c1-64

# Or use the built-in generator
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

#### CORS Configuration

Configure CORS origins for your frontend:

```bash
# Single origin
CLIENT_ORIGIN=https://yourdomain.com

# Multiple origins
CLIENT_ORIGIN=https://yourdomain.com
ADDITIONAL_ORIGINS=https://admin.yourdomain.com,https://app.yourdomain.com
```

## Frontend Configuration

### API Configuration

The frontend uses environment variables to configure API endpoints:

```bash
# Development (uses proxy)
REACT_APP_API_URL=

# Production
REACT_APP_API_URL=https://api.yourdomain.com
```

### Build Configuration

Configure build settings:

```bash
# Enable source maps in production
REACT_APP_GENERATE_SOURCEMAP=true

# Enable bundle analysis
REACT_APP_ANALYZE_BUNDLE=true
```

## Production Setup

### Environment Checklist

- [ ] All required variables set
- [ ] Strong secrets generated (64+ characters)
- [ ] HTTPS enabled (`ENFORCE_HTTPS=true`)
- [ ] Secure cookies enabled (`SECURE_COOKIES=true`)
- [ ] Trust proxy configured (`TRUST_PROXY=true`)
- [ ] Debug features disabled
- [ ] Database credentials secure
- [ ] CORS origins configured
- [ ] SMTP/SMS services configured
- [ ] Redis configured for scaling

### Production Environment Example

```bash
# Application
NODE_ENV=production
PORT=3001

# Database
PGHOST=your-production-db-host
PGDATABASE=secure_gate_prod
PGUSER=secure_gate_prod_user
PGPASSWORD=your-super-secure-production-password

# Security
JWT_SECRET=your-production-jwt-secret-64-chars-minimum
JWT_REFRESH_SECRET=your-production-refresh-secret-64-chars-minimum
SESSION_SECRET=your-production-session-secret-64-chars-minimum

# CORS
CLIENT_ORIGIN=https://yourdomain.com
ENFORCE_HTTPS=true
SECURE_COOKIES=true
TRUST_PROXY=true

# Services
REDIS_URL=redis://your-redis-host:6379
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### Docker Environment

For Docker deployments, use environment files:

```bash
# Create production environment file
cat > .env.production << EOF
NODE_ENV=production
PORT=3001
PGHOST=postgres
PGDATABASE=secure_gate
PGUSER=secure_gate_user
PGPASSWORD=secure_gate_password
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
SESSION_SECRET=your-production-session-secret
CLIENT_ORIGIN=https://yourdomain.com
ENFORCE_HTTPS=true
SECURE_COOKIES=true
TRUST_PROXY=true
REDIS_URL=redis://redis:6379
EOF
```

## Security Best Practices

### 1. Secret Management

- **Never commit secrets to version control**
- Use strong, unique secrets (64+ characters)
- Rotate secrets regularly
- Use environment-specific secrets
- Consider using secret management services (AWS Secrets Manager, HashiCorp Vault)

### 2. Environment Isolation

- Use separate environments for development, staging, and production
- Never use production secrets in development
- Use different databases for each environment
- Implement proper access controls

### 3. Network Security

- Use HTTPS in production
- Configure proper CORS origins
- Use secure cookies
- Implement rate limiting
- Use trusted proxy settings

### 4. Database Security

- Use strong database passwords
- Limit database user privileges
- Use connection pooling
- Enable SSL for database connections
- Regular security updates

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check database status
pg_isready -h localhost -p 5432

# Check credentials
psql -h localhost -U secure_gate_user -d secure_gate

# Verify environment variables
echo $PGHOST $PGDATABASE $PGUSER
```

#### 2. JWT Secret Too Weak

```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"

# Update .env file
JWT_SECRET=your-new-secret-here
```

#### 3. CORS Issues

```bash
# Check CORS configuration
echo $CLIENT_ORIGIN

# Test CORS
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3001/api/auth/login
```

#### 4. Port Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### Validation Errors

#### Missing Required Variables

```bash
# Check which variables are missing
npm run validate:env

# Set missing variables
export NODE_ENV=development
export PORT=3001
# ... etc
```

#### Weak Secrets

```bash
# Generate strong secrets
node scripts/setup-env.js --generate

# Or manually generate
openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Backend debug
DEBUG=* npm run dev

# Frontend debug
REACT_APP_DEBUG_MODE=true npm start
```

## Support

For additional help:

1. Check the [API Documentation](./API_DOCUMENTATION.md)
2. Review the [Deployment Guide](./DEPLOYMENT_GUIDE.md)
3. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
4. Open an issue in the repository

## Changelog

- **v1.0.0** - Initial environment setup guide
- Added comprehensive variable reference
- Added security best practices
- Added troubleshooting section
- Added production setup guide
