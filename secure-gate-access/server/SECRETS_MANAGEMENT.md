# 🔐 Secrets Management Guide

**Version:** 1.0.0  
**Last Updated:** December 19, 2024  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [AWS Secrets Manager Setup](#aws-secrets-manager-setup)
4. [Implementation](#implementation)
5. [Secret Rotation](#secret-rotation)
6. [Local Development](#local-development)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## Overview

The Secure Gate Access Control System implements a robust secrets management solution that:

- ✅ Uses AWS Secrets Manager for production secrets
- ✅ Falls back to environment variables for development
- ✅ Implements in-memory caching (5-minute TTL)
- ✅ Provides automatic secret rotation support
- ✅ Validates secret strength and configuration
- ✅ Logs security warnings and errors

### Secrets Managed

| Secret Name | Purpose | Environment |
|-------------|---------|-------------|
| `secure-gate/jwt-secret` | JWT access token signing | All |
| `secure-gate/jwt-refresh-secret` | JWT refresh token signing | All |
| `secure-gate/session-secret` | Express session encryption | All |
| `secure-gate/database-password` | PostgreSQL password | All |
| `secure-gate/api-key` | API authentication (optional) | Production |

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (server.js, routes, middleware)                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           Environment Configuration Layer                    │
│  (src/config/environment.js)                                │
│  - Validates configuration                                  │
│  - Coordinates secret loading                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          Secrets Manager Service Layer                      │
│  (src/services/secretsManagerService.js)                    │
│  - AWS SDK integration                                      │
│  - Caching (5-min TTL)                                      │
│  - Fallback to env vars                                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS Secrets Manager                            │
│  - Encrypted secret storage                                 │
│  - Automatic rotation support                               │
│  - Audit logging                                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Application Startup**: Server initialization calls `EnvironmentConfig.validateAndReport()`
2. **Secret Loading**: In production, loads secrets from AWS Secrets Manager
3. **Caching**: Secrets are cached in memory for 5 minutes
4. **Validation**: Configuration is validated before application starts
5. **Runtime**: Application uses loaded secrets from environment variables

---

## AWS Secrets Manager Setup

### Prerequisites

- AWS account with appropriate permissions
- AWS CLI configured with credentials
- IAM role or user with Secrets Manager access

### Step 1: Create IAM Policy

Create an IAM policy with the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecrets"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:secure-gate/*"
    }
  ]
}
```

**Policy Name:** `SecureGateSecretsManagerReadPolicy`

### Step 2: Create IAM Role

1. Go to AWS IAM Console
2. Create a new role (type: EC2 or ECS depending on deployment)
3. Attach the `SecureGateSecretsManagerReadPolicy`
4. Name: `SecureGateApplicationRole`

### Step 3: Create Secrets

Use the provided migration script:

```bash
cd /path/to/server
./migrate-secrets-to-aws.sh
```

Or create manually:

```bash
# JWT Secret
aws secretsmanager create-secret \
  --name secure-gate/jwt-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --description "JWT access token signing secret"

# JWT Refresh Secret
aws secretsmanager create-secret \
  --name secure-gate/jwt-refresh-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --description "JWT refresh token signing secret"

# Session Secret
aws secretsmanager create-secret \
  --name secure-gate/session-secret \
  --secret-string "$(openssl rand -base64 32)" \
  --description "Express session encryption secret"

# Database Password
aws secretsmanager create-secret \
  --name secure-gate/database-password \
  --secret-string "YOUR_SECURE_PASSWORD" \
  --description "PostgreSQL database password"
```

### Step 4: Configure Environment

Set the AWS region in your production environment:

```bash
export AWS_REGION=us-east-1
```

For EC2/ECS deployments, attach the IAM role. For local testing, configure AWS credentials:

```bash
aws configure
```

---

## Implementation

### Server Integration

The secrets manager is automatically integrated during server startup:

```javascript
// server.js (simplified)
import EnvironmentConfig from './src/config/environment.js';

async function startServer() {
  // Load and validate configuration (including AWS secrets)
  const config = await EnvironmentConfig.validateAndReport();
  
  if (!config.isValid) {
    console.error('Configuration validation failed');
    process.exit(1);
  }
  
  // Start server with loaded configuration
  // ...
}

startServer();
```

### Direct Usage (Advanced)

For advanced use cases, use the secrets manager directly:

```javascript
import { SecretsManagerService } from './src/services/secretsManagerService.js';

const secretsManager = new SecretsManagerService();

// Get single secret
const jwtSecret = await secretsManager.getSecret('secure-gate/jwt-secret');

// Get multiple secrets
const secrets = await secretsManager.getSecrets([
  'secure-gate/jwt-secret',
  'secure-gate/database-password'
]);

// Clear cache
secretsManager.clearCache();
```

---

## Secret Rotation

### Automatic Rotation (Recommended)

AWS Secrets Manager supports automatic rotation using Lambda functions.

#### Setup Rotation

1. **Create Rotation Lambda**:
   - Use AWS-provided template for PostgreSQL
   - Configure for your database

2. **Enable Rotation**:
   ```bash
   aws secretsmanager rotate-secret \
     --secret-id secure-gate/database-password \
     --rotation-lambda-arn arn:aws:lambda:REGION:ACCOUNT:function:FUNCTION_NAME \
     --rotation-rules AutomaticallyAfterDays=30
   ```

3. **Test Rotation**:
   ```bash
   aws secretsmanager rotate-secret \
     --secret-id secure-gate/database-password \
     --rotate-immediately
   ```

### Manual Rotation

For secrets like JWT keys that don't require external synchronization:

```bash
# Update secret value
aws secretsmanager update-secret \
  --secret-id secure-gate/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"

# Restart application to load new secret
kubectl rollout restart deployment/secure-gate-server
# or
docker-compose restart server
```

### Rotation Schedule

| Secret | Rotation Frequency | Method |
|--------|-------------------|--------|
| JWT secrets | 90 days | Manual |
| Session secret | 90 days | Manual |
| Database password | 30 days | Automatic (Lambda) |
| API keys | 60 days | Manual |

### Zero-Downtime Rotation

For JWT secrets, implement versioning:

1. Add new secret version to AWS Secrets Manager
2. Update application to accept both old and new keys for verification
3. After all tokens expire (24 hours), remove old key
4. Update signing to use only new key

---

## Local Development

### Option 1: Environment Variables (Recommended)

Create a `.env` file (never commit to git):

```bash
# .env
NODE_ENV=development
JWT_SECRET=dev-jwt-secret-change-me-for-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-me
SESSION_SECRET=dev-session-secret-change-me
PGPASSWORD=postgres
```

The secrets manager will automatically fall back to environment variables in development.

### Option 2: AWS LocalStack (Advanced)

For testing AWS integration locally:

```bash
# Install LocalStack
pip install localstack

# Start LocalStack with Secrets Manager
localstack start -d

# Configure AWS CLI for LocalStack
export AWS_ENDPOINT_URL=http://localhost:4566

# Create test secrets
aws --endpoint-url=http://localhost:4566 secretsmanager create-secret \
  --name secure-gate/jwt-secret \
  --secret-string "test-secret"
```

Update `secretsManagerService.js` to use LocalStack endpoint in development:

```javascript
const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL // For LocalStack
});
```

### Option 3: Mock Secrets Manager

For testing without AWS:

```javascript
// test-setup.js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
// ... other test secrets
```

---

## Troubleshooting

### Issue: Secrets Not Loading

**Symptoms:**
- Application falls back to environment variables
- Warning: "Failed to load secrets from AWS"

**Solutions:**

1. **Check AWS Credentials:**
   ```bash
   aws sts get-caller-identity
   ```
   Should return your AWS account info.

2. **Check IAM Permissions:**
   ```bash
   aws secretsmanager list-secrets
   ```
   Should list your secrets.

3. **Check Region Configuration:**
   ```bash
   echo $AWS_REGION
   ```
   Should match where secrets are stored.

4. **Check Secret Names:**
   ```bash
   aws secretsmanager describe-secret --secret-id secure-gate/jwt-secret
   ```

### Issue: Application Won't Start

**Symptoms:**
- Error: "PRODUCTION DEPLOYMENT BLOCKED"
- Configuration validation errors

**Solutions:**

1. **Check Required Secrets:**
   Ensure all required secrets are set (either in AWS or environment variables):
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `PGPASSWORD`

2. **Validate Secret Strength:**
   Secrets must be:
   - At least 32 characters long
   - High entropy (mix of characters)
   - Not common patterns (dev, test, changeme, etc.)

3. **Check Production Settings:**
   ```bash
   echo $NODE_ENV  # Should be "production"
   echo $ENFORCE_HTTPS  # Should be "true"
   echo $SECURE_COOKIES  # Should be "true"
   ```

### Issue: Cache Not Working

**Symptoms:**
- AWS API calls on every secret access
- High Secrets Manager costs

**Solutions:**

1. **Check Cache TTL:**
   Default is 5 minutes. Adjust in `secretsManagerService.js`:
   ```javascript
   this.cacheTTL = 5 * 60 * 1000; // milliseconds
   ```

2. **Monitor Cache Hits:**
   Check application logs for cache hit/miss messages.

3. **Clear Cache Manually:**
   ```javascript
   secretsManager.clearCache();
   ```

### Issue: AWS Costs Too High

**Symptoms:**
- Unexpected AWS Secrets Manager charges

**Solutions:**

1. **Increase Cache TTL:**
   Longer TTL = fewer API calls:
   ```javascript
   this.cacheTTL = 15 * 60 * 1000; // 15 minutes
   ```

2. **Batch Secret Retrieval:**
   Use `getSecrets()` instead of multiple `getSecret()` calls.

3. **Monitor API Calls:**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/SecretsManager \
     --metric-name GetSecretValue \
     --start-time 2024-12-01T00:00:00Z \
     --end-time 2024-12-31T23:59:59Z \
     --period 86400 \
     --statistics Sum
   ```

---

## Security Best Practices

### ✅ DO

1. **Use AWS Secrets Manager in Production:**
   - Never store production secrets in environment variables
   - Never commit secrets to version control

2. **Rotate Secrets Regularly:**
   - JWT secrets: every 90 days
   - Database passwords: every 30 days
   - API keys: every 60 days

3. **Use Strong Secrets:**
   - Minimum 32 characters
   - High entropy (cryptographically random)
   - Use `openssl rand -base64 32` or similar

4. **Implement Least Privilege:**
   - IAM policies should only grant read access
   - Limit access to specific secret paths

5. **Monitor Secret Access:**
   - Enable CloudTrail logging
   - Set up alerts for suspicious access patterns

6. **Use Different Secrets Per Environment:**
   - Development: `secure-gate-dev/*`
   - Staging: `secure-gate-staging/*`
   - Production: `secure-gate/*`

7. **Implement Secret Versioning:**
   - Keep previous versions during rotation
   - Allow gradual rollout of new secrets

### ❌ DON'T

1. **Never Commit Secrets:**
   - Use `.gitignore` for `.env` files
   - Scan commits for accidentally exposed secrets

2. **Never Log Secrets:**
   - Redact secrets from application logs
   - Use `[REDACTED]` in log messages

3. **Never Share Secrets:**
   - Don't send secrets via email/Slack
   - Use secure secret sharing tools if needed

4. **Never Use Weak Secrets:**
   - Avoid: `password123`, `secret`, `changeme`
   - Avoid: sequential or repeated characters

5. **Never Hard-Code Secrets:**
   - Always load from environment or secrets manager
   - No secrets in source code

6. **Never Expose Secrets in Errors:**
   - Sanitize error messages
   - Don't include secret values in stack traces

---

## Testing

### Unit Tests

Test secrets manager functionality:

```bash
node test-secrets-manager.js
```

### Integration Tests

Test with actual AWS Secrets Manager:

```bash
# Set up test secrets
AWS_REGION=us-east-1 node test-secrets-manager.js

# Expected output:
# ✅ AWS Secrets Manager connection successful
# ✅ Individual secret retrieval works
# ✅ Bulk secret retrieval works
# ✅ Cache functionality works
# ✅ Fallback to environment variables works
```

### Load Testing

Test cache performance under load:

```bash
npm run test:performance
```

---

## Monitoring

### Metrics to Track

1. **Secret Retrieval Success Rate:**
   - Target: 99.9%
   - Alert if < 95%

2. **Cache Hit Rate:**
   - Target: > 90%
   - Alert if < 80%

3. **AWS API Call Volume:**
   - Target: < 1000/day
   - Alert if > 5000/day

4. **Secret Rotation Failures:**
   - Target: 0
   - Alert on any failure

### CloudWatch Metrics

```bash
# View Secrets Manager metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/SecretsManager \
  --metric-name GetSecretValue \
  --dimensions Name=SecretId,Value=secure-gate/jwt-secret \
  --start-time 2024-12-19T00:00:00Z \
  --end-time 2024-12-19T23:59:59Z \
  --period 3600 \
  --statistics Sum,Average
```

### Application Logs

Monitor for these log messages:

- ✅ `"Secrets loaded successfully from AWS"` - Normal operation
- ⚠️ `"Failed to load secrets from AWS, falling back"` - AWS issue
- ❌ `"PRODUCTION DEPLOYMENT BLOCKED"` - Configuration error

---

## Support

### Documentation

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

### Internal Resources

- `src/services/secretsManagerService.js` - Service implementation
- `src/config/environment.js` - Configuration integration
- `migrate-secrets-to-aws.sh` - Migration script
- `test-secrets-manager.js` - Test suite

### Getting Help

1. Check troubleshooting section above
2. Review application logs
3. Check AWS CloudWatch logs
4. Contact DevOps team

---

## Appendix

### A. Secret Naming Conventions

- Format: `{app-name}/{environment}/{secret-type}`
- Example: `secure-gate/prod/jwt-secret`
- Use lowercase and hyphens
- Keep names descriptive but concise

### B. AWS Secrets Manager Pricing

- $0.40 per secret per month
- $0.05 per 10,000 API calls
- Free tier: 30-day trial for new secrets

### C. Emergency Secret Rotation Procedure

1. Generate new secret: `openssl rand -base64 32`
2. Update in AWS: `aws secretsmanager update-secret ...`
3. Clear application cache
4. Restart application pods/containers
5. Verify new secret is in use
6. Document in incident log

### D. Compliance Checklist

- [ ] Secrets encrypted at rest (AWS KMS)
- [ ] Secrets encrypted in transit (TLS)
- [ ] Access audited (CloudTrail)
- [ ] Rotation schedule defined
- [ ] Least privilege access (IAM)
- [ ] No secrets in version control
- [ ] No secrets in logs
- [ ] Regular security reviews

---

**Document Version:** 1.0.0  
**Last Review:** December 19, 2024  
**Next Review:** March 19, 2025
