# Production Deployment Guide

## Environment Configuration

Create a `.env.production` file with the following configuration:

```bash
# Application
NODE_ENV=production
PORT=5000

# Database Configuration
PGHOST=database
PGPORT=5432
PGDATABASE=secure_gate
PGUSER=secure_gate_user
PGPASSWORD=your-secure-password

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_URL=redis://:your-redis-password@redis:6379

# Security Secrets (Generate strong secrets for production)
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here
SESSION_SECRET=your-session-secret-here

# Security Settings
ENFORCE_HTTPS=false
SECURE_COOKIES=true
TRUST_PROXY=true

# CORS Configuration
CLIENT_ORIGIN=http://localhost

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
SITE_NAME=Secure Gate Access
SITE_URL=http://localhost
ENABLE_EMAIL_NOTIFICATIONS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
OTP_RATE_LIMIT_WINDOW_MS=60000
OTP_RATE_LIMIT_MAX=3

# Feature Flags
OTP_DEBUG_ECHO=false
OTP_TTL_MINUTES=15
ALERT_ON_OTP_FAILS=true

# Logging
LOG_LEVEL=warn
ENABLE_MONITORING=true
```

## Deployment Commands

1. **Build and start all services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. **Check service status:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

3. **View logs:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

4. **Stop services:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

## Security Considerations

1. **Change default passwords** in production
2. **Use strong JWT secrets** (32+ characters)
3. **Enable HTTPS** when deploying to production
4. **Configure proper CORS origins** for your domain
5. **Set up SSL certificates** for HTTPS
6. **Use environment variables** for sensitive data

## Monitoring

- Health checks are configured for all services
- Logs are available via Docker Compose
- Database and Redis have persistent volumes
- Services restart automatically on failure
