# QUICK START GUIDE - Production Testing

## Current Blockers & Solutions

### 🔴 BLOCKER 1: Port 5000 Conflict
**Issue**: macOS Control Center is using port 5000  
**Status**: ✅ FIXED  
**Solution**: Changed server port to 3001 in `.env`

### 🔴 BLOCKER 2: PostgreSQL Not Running
**Issue**: Database connection failures (ECONNREFUSED)  
**Status**: ⚠️ NEEDS ATTENTION  
**Solutions**: Choose ONE option below:

#### Option A: Use Docker (Recommended)
```bash
# Start Docker Desktop app, then:
cd /Users/raynj/Desktop/secure-gate-react-express/deployment
docker-compose -f docker-compose.production.yml up -d postgres

# Wait 10 seconds for PostgreSQL to start
sleep 10

# Verify PostgreSQL is running
docker ps | grep postgres
```

#### Option B: Install PostgreSQL Locally
```bash
# Install PostgreSQL using Postgres.app (easiest)
# Download from: https://postgresapp.com/

# Or install via MacPorts/other package manager if you don't have Homebrew
```

#### Option C: Use Mock Database (Testing Only - NOT for production)
```bash
# This creates a mock database for testing purposes only
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
npm run setup:mock-db
```

## Step-by-Step Execution Plan

### Phase 1: Fix Database (Choose ONE option above)

1. **If using Docker** (Recommended):
   ```bash
   # Make sure Docker Desktop is running
   cd /Users/raynj/Desktop/secure-gate-react-express/deployment
   docker-compose -f docker-compose.production.yml up -d postgres redis
   
   # Wait for services to be healthy
   docker-compose -f docker-compose.production.yml ps
   ```

2. **Update .env if needed**:
   ```bash
   cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
   
   # For Docker PostgreSQL:
   # PGHOST=localhost (already set correctly)
   
   # For local PostgreSQL:
   # Update PGHOST, PGPORT, PGPASSWORD as needed
   ```

### Phase 2: Start Server & Verify

```bash
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server

# Start the server
npm start &

# Wait 5 seconds for startup
sleep 5

# Test health endpoint
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

### Phase 3: Run Security Tests

```bash
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server

# Run comprehensive security audit
npm run test:security

# Run vulnerability tests
npm run test:security:vulnerability

# Run NPM audit
npm run test:security:npm

# Expected: Security test results with findings
```

### Phase 4: Run Performance Tests

```bash
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server

# Check if k6 is installed
which k6 || echo "k6 not installed"

# If k6 not installed:
# brew install k6
# OR download from: https://k6.io/docs/getting-started/installation/

# Run load test
npm run test:performance:load

# Run stress test
npm run test:performance:stress

# Expected: P95/P99 latencies, error rates, throughput metrics
```

### Phase 5: Document Results

All test results will be saved to:
- Security: `tests/results/security-audit-*.json`
- Performance: `tests/results/performance-*.json`

## Current System Status

✅ **FIXED**:
- Port conflict resolved (using 3001)
- Dependencies installed
- Test scripts verified
- Documentation created

⚠️ **PENDING**:
- PostgreSQL database connection
- Server startup verification
- Actual security test execution
- Actual performance test execution

## Next Immediate Action

**YOU NEED TO**: Choose and execute ONE database option from "Option A, B, or C" above.

**Recommendation**: Use Option A (Docker) if you can start Docker Desktop, otherwise use Option B (Postgres.app).

Once database is running, execute:
```bash
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
npm start
# Then run security and performance tests
```

## Emergency Fallback

If you cannot get PostgreSQL running and need to proceed with testing:

```bash
# Create a minimal mock server for testing
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
node scripts/create-mock-server.js &

# This will start a server on port 3001 with mock endpoints
# Then you can run security/performance tests against it
```

## Contact Information

If blocked on database setup, document the specific error message and we can create a workaround.
