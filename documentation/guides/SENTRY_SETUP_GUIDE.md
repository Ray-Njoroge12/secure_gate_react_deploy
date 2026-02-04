# Sentry Error Monitoring Setup Guide
**Phase 4.3: Production Error Tracking and Performance Monitoring**

## Overview

Sentry has been integrated into both the server (Node.js/Express) and client (React) applications to provide:

- **Real-time Error Tracking**: Automatic capture of server and client errors
- **Performance Monitoring**: Track slow requests, database queries, and API calls
- **User Context**: Associate errors with specific users and sessions
- **Release Tracking**: Track errors by deployment version
- **Source Maps**: View original source code in production errors
- **Breadcrumbs**: See the events leading up to an error
- **Profiling**: Performance profiling for critical endpoints

## Table of Contents

1. [Sentry Account Setup](#sentry-account-setup)
2. [Environment Configuration](#environment-configuration)
3. [Testing the Integration](#testing-the-integration)
4. [Advanced Features](#advanced-features)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Sentry Account Setup

### Step 1: Create Sentry Account

1. Go to [https://sentry.io/signup/](https://sentry.io/signup/)
2. Sign up for a free account (includes 5,000 errors/month)
3. Create a new organization (e.g., "SecureGate")

### Step 2: Create Projects

Create **two separate projects** in Sentry:

#### Server Project (Node.js)
1. Click "Create Project"
2. Select platform: **Node.js** or **Express**
3. Project name: `secure-gate-server`
4. Alert frequency: **On every new issue**
5. Copy the **DSN** (Data Source Name)

#### Client Project (React)
1. Click "Create Project"
2. Select platform: **React**
3. Project name: `secure-gate-client`
4. Alert frequency: **On every new issue**
5. Copy the **DSN** (Data Source Name)

### Step 3: Configure Alerts (Optional)

1. Go to **Settings** → **Alerts**
2. Set up email/Slack notifications for:
   - New errors
   - Error spikes (>100 errors in 1 hour)
   - High severity errors

---

## Environment Configuration

### Server Environment Variables

Add these to your **server `.env`** file:

```bash
# Sentry Error Monitoring (Phase 4.3)
SENTRY_DSN=https://your-server-dsn@sentry.io/12345678
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=secure-gate@1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

#### Variable Descriptions:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SENTRY_DSN` | Data Source Name from Sentry project | (none) | `https://abc123@o123.ingest.sentry.io/456` |
| `SENTRY_ENVIRONMENT` | Environment name | `NODE_ENV` | `production`, `staging`, `development` |
| `SENTRY_RELEASE` | Release version for tracking | `secure-gate@unknown` | `secure-gate@1.2.3` or `git-abc123` |
| `SENTRY_TRACES_SAMPLE_RATE` | Performance monitoring sample rate (0.0-1.0) | `0.1` | `0.1` = 10% of requests |
| `SENTRY_PROFILES_SAMPLE_RATE` | Profiling sample rate (0.0-1.0) | `0.1` | `0.1` = 10% of requests |

**Note**: If `SENTRY_DSN` is not set, Sentry will be disabled (warnings only).

---

### Client Environment Variables

Add these to your **client `.env`** file:

```bash
# Sentry Error Monitoring (Phase 4.3)
REACT_APP_SENTRY_DSN=https://your-client-dsn@sentry.io/87654321
REACT_APP_SENTRY_ENVIRONMENT=production
REACT_APP_SENTRY_RELEASE=secure-gate-client@1.0.0
REACT_APP_SENTRY_TRACES_SAMPLE_RATE=0.1
REACT_APP_SENTRY_DEBUG=false
```

#### Variable Descriptions:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `REACT_APP_SENTRY_DSN` | Data Source Name from Sentry project | (none) | `https://xyz789@o123.ingest.sentry.io/789` |
| `REACT_APP_SENTRY_ENVIRONMENT` | Environment name | `NODE_ENV` | `production`, `staging`, `development` |
| `REACT_APP_SENTRY_RELEASE` | Release version for tracking | `secure-gate-client@unknown` | `secure-gate-client@1.2.3` |
| `REACT_APP_SENTRY_TRACES_SAMPLE_RATE` | Performance monitoring sample rate | `0.1` | `0.2` = 20% of page loads |
| `REACT_APP_SENTRY_DEBUG` | Enable Sentry debug logs | `false` | `true` for troubleshooting |

**Note**: React env vars must be prefixed with `REACT_APP_`.

---

### Environment-Specific Configuration

#### Development
```bash
# Server .env.development
SENTRY_DSN=  # Leave empty to disable
SENTRY_ENVIRONMENT=development

# Client .env.development
REACT_APP_SENTRY_DSN=  # Leave empty to disable
REACT_APP_SENTRY_ENVIRONMENT=development
REACT_APP_SENTRY_DEBUG=true
```

#### Staging
```bash
# Server .env.staging
SENTRY_DSN=https://your-server-dsn@sentry.io/12345678
SENTRY_ENVIRONMENT=staging
SENTRY_TRACES_SAMPLE_RATE=0.3  # Higher sampling in staging

# Client .env.staging
REACT_APP_SENTRY_DSN=https://your-client-dsn@sentry.io/87654321
REACT_APP_SENTRY_ENVIRONMENT=staging
REACT_APP_SENTRY_TRACES_SAMPLE_RATE=0.5  # 50% sampling
```

#### Production
```bash
# Server .env.production
SENTRY_DSN=https://your-server-dsn@sentry.io/12345678
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% to minimize overhead
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Client .env.production
REACT_APP_SENTRY_DSN=https://your-client-dsn@sentry.io/87654321
REACT_APP_SENTRY_ENVIRONMENT=production
REACT_APP_SENTRY_TRACES_SAMPLE_RATE=0.1
```

---

## Testing the Integration

### 1. Test Server Error Capture

Create a test route to trigger an error:

```bash
# In server/src/routes/systemRoutes.js or create a test route
GET http://localhost:5000/api/test/error
```

Test implementation:
```javascript
app.get('/api/test/sentry-error', (req, res) => {
  throw new Error('Test error from server - Sentry integration test');
});
```

**Expected Result**: Error appears in Sentry dashboard under server project within 10 seconds.

### 2. Test Client Error Capture

Add a test button in your React app:

```jsx
// In any component
<button onClick={() => {
  throw new Error('Test error from client - Sentry integration test');
}}>
  Trigger Test Error
</button>
```

**Expected Result**: Error appears in Sentry dashboard under client project with component stack trace.

### 3. Test Performance Monitoring

Server:
```bash
# Make a slow request
GET http://localhost:5000/api/visitors?limit=1000
```

Client:
```bash
# Navigate between pages multiple times
# Check "Performance" tab in Sentry
```

**Expected Result**: Transaction appears in Performance tab showing response time breakdown.

### 4. Test User Context

Server:
```javascript
import { setUser } from '../config/sentry.js';

// In your auth middleware after user authentication
setUser({
  id: user.id,
  email: user.email,
  username: user.username,
  role: user.role
});
```

Client:
```javascript
import { setUser } from './config/sentry';

// After successful login
setUser({
  id: user.id,
  email: user.email,
  username: user.name,
  role: user.role
});
```

**Expected Result**: Errors show user information in Sentry dashboard.

### 5. Test Breadcrumbs

Breadcrumbs are automatically captured for:
- HTTP requests (fetch/XHR)
- Console logs
- Navigation events
- DOM events (clicks, inputs)

**Expected Result**: Error details in Sentry show breadcrumbs timeline leading to error.

---

## Advanced Features

### 1. Custom Error Capture

#### Server
```javascript
import { captureException, captureMessage } from './config/sentry.js';

try {
  // risky operation
} catch (error) {
  captureException(error, {
    level: 'error',
    tags: { module: 'payment' },
    extra: { orderId: '12345' },
    user: { id: userId }
  });
}

// Or capture a message
captureMessage('Payment processed successfully', 'info', {
  tags: { module: 'payment' },
  extra: { amount: 100.00 }
});
```

#### Client
```javascript
import { captureException, captureMessage } from './config/sentry';

try {
  // risky operation
} catch (error) {
  captureException(error, {
    level: 'error',
    tags: { component: 'checkout' },
    extra: { cartItems: cart.items }
  });
}
```

### 2. Performance Transactions

#### Server
```javascript
import { startTransaction } from './config/sentry.js';

const transaction = startTransaction('process-payment', 'payment');

try {
  // Start span
  const span = transaction.startChild({ op: 'db.query', description: 'Get user' });
  const user = await db.getUser(userId);
  span.finish();

  // Another span
  const span2 = transaction.startChild({ op: 'http.request', description: 'Charge card' });
  await paymentGateway.charge(amount);
  span2.finish();

  transaction.finish();
} catch (error) {
  transaction.finish();
  throw error;
}
```

#### Client
```javascript
import { startTransaction } from './config/sentry';

const transaction = startTransaction('checkout-flow', 'navigation');

// Measure specific operations
const span = transaction.startChild({ op: 'validate-form' });
validateCheckoutForm();
span.finish();

transaction.finish();
```

### 3. Custom Breadcrumbs

```javascript
import { addBreadcrumb } from './config/sentry';

addBreadcrumb({
  message: 'User started checkout process',
  category: 'user-action',
  level: 'info',
  data: { cartTotal: 99.99, itemCount: 3 }
});
```

### 4. User Feedback Dialog

Show a feedback form when an error occurs:

```javascript
import { showReportDialog } from './config/sentry';

try {
  // operation that fails
} catch (error) {
  const eventId = captureException(error);
  showReportDialog(eventId);
}
```

---

## Best Practices

### 1. Sample Rates

- **Production**: 10-20% (`0.1` - `0.2`) to minimize overhead
- **Staging**: 30-50% (`0.3` - `0.5`) for better visibility
- **Development**: 100% (`1.0`) or disabled entirely

### 2. Release Tracking

Use git commit hash for releases:

```bash
# Server
SENTRY_RELEASE=$(git rev-parse --short HEAD)

# Client (in build script)
REACT_APP_SENTRY_RELEASE=$(git rev-parse --short HEAD)
```

Or use version from package.json:
```bash
SENTRY_RELEASE=secure-gate@$(node -p "require('./package.json').version")
```

### 3. Source Maps

#### For React (Client)

Source maps are automatically generated by Create React App. Upload them to Sentry:

```bash
npm install --save-dev @sentry/webpack-plugin

# In package.json scripts:
"build:production": "GENERATE_SOURCEMAP=true react-scripts build && sentry-cli sourcemaps upload --org your-org --project secure-gate-client ./build"
```

#### For Node.js (Server)

If using Babel/TypeScript, upload source maps:

```bash
sentry-cli sourcemaps upload --org your-org --project secure-gate-server ./dist
```

### 4. Filtering Sensitive Data

Already implemented in config files:
- Passwords are redacted
- Authorization headers removed
- API keys filtered
- Cookie data excluded

### 5. Ignoring Known Errors

Common non-critical errors are already filtered:
- Network errors (offline users)
- Browser extension errors
- Third-party script errors
- Chunk load errors (deployment race conditions)

### 6. Alert Configuration

Set up intelligent alerts:
- **New Issue Alert**: Notify on first occurrence
- **Spike Alert**: >100 errors in 1 hour (adjust based on traffic)
- **High Severity**: Notify immediately for critical errors
- **Regression Alert**: Error that was marked "Resolved" reappears

---

## Troubleshooting

### Problem: "Sentry DSN not configured" warning

**Solution**: Add `SENTRY_DSN` to your `.env` file. If intentionally disabled, this is expected behavior.

---

### Problem: No errors appearing in Sentry

**Checklist**:
1. Verify `SENTRY_DSN` is correct (copy from Sentry project settings)
2. Check environment variables are loaded: `console.log(process.env.SENTRY_DSN)`
3. Ensure server is restarted after adding env vars
4. For client, rebuild: `npm run build`
5. Check network tab for outgoing requests to `sentry.io`
6. Verify no ad blockers are blocking Sentry

---

### Problem: Too many errors being sent

**Solution**: Adjust sample rates:
```bash
SENTRY_TRACES_SAMPLE_RATE=0.05  # Reduce to 5%
```

Or add errors to ignore list in `sentry.js`:
```javascript
ignoreErrors: [
  'YourSpecificErrorMessage',
  /regex pattern for error/
]
```

---

### Problem: Source maps not working

**Solution**:
1. Ensure source maps are generated: `GENERATE_SOURCEMAP=true`
2. Upload to Sentry using `sentry-cli`
3. Verify release name matches between upload and runtime

---

### Problem: Performance monitoring showing 0 transactions

**Solution**:
1. Verify `SENTRY_TRACES_SAMPLE_RATE > 0`
2. Check that requests/page loads are happening
3. Wait 5-10 minutes for data to appear
4. Verify Performance feature is enabled in Sentry project settings

---

## Monitoring Checklist

✅ **Setup Complete When**:
- [ ] Sentry DSN added to server `.env`
- [ ] Sentry DSN added to client `.env`
- [ ] Test error captured on server
- [ ] Test error captured on client
- [ ] Performance transactions visible in Sentry
- [ ] User context appears in error details
- [ ] Breadcrumbs show event timeline
- [ ] Alert notifications configured
- [ ] Team members added to Sentry project
- [ ] Source maps uploaded (optional but recommended)

---

## Cost Optimization

**Free Tier**: 5,000 errors/month
- Sufficient for most small-medium applications
- Monitor usage in Sentry dashboard

**If approaching limit**:
1. Increase ignored error patterns
2. Reduce sample rates
3. Filter out low-priority errors
4. Upgrade to paid plan ($26/month for 50K errors)

---

## Additional Resources

- [Sentry Node.js Docs](https://docs.sentry.io/platforms/node/)
- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Releases](https://docs.sentry.io/product/releases/)

---

## Summary

Sentry is now fully integrated and provides:
- ✅ Automatic error capture (server + client)
- ✅ Performance monitoring
- ✅ User context tracking
- ✅ Breadcrumbs for debugging
- ✅ Release tracking
- ✅ Sensitive data filtering
- ✅ Custom error boundaries (React)
- ✅ Production-ready configuration

**Next Steps**: Configure DSN in production deployment and monitor the Sentry dashboard for real-time error tracking!
