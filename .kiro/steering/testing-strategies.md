# Testing Strategies & Patterns

## Overview

The Secure Gate Access Control System implements comprehensive testing strategies covering unit tests, integration tests, end-to-end tests, and property-based testing. This guide covers testing patterns, conventions, and best practices used throughout the system.

## Testing Architecture

### Test Environment Structure
```
tests/
├── unit/                    # Unit tests for individual functions/modules
├── integration/             # Integration tests for API endpoints
├── e2e/                     # End-to-end tests with Playwright
├── fixtures/                # Test data and mocks
├── helpers/                 # Test utilities and helpers
├── mocks/                   # Mock implementations
├── setup.js                 # Global test setup
└── teardown.js              # Global test cleanup
```

### Testing Stack
- **Unit Testing**: Jest with ES modules support
- **Integration Testing**: Jest + Supertest for API testing
- **E2E Testing**: Playwright for browser automation
- **Property-Based Testing**: Fast-check for property validation
- **Mocking**: Jest mocks with manual mocks for external services
- **Test Database**: Separate PostgreSQL instance for testing

## Unit Testing Patterns

### Service Layer Testing
```javascript
// Example: Token Service Unit Tests
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock external dependencies
const mockArgon2 = {
  hash: jest.fn(),
  verify: jest.fn()
};

jest.unstable_mockModule('argon2', () => ({ default: mockArgon2 }));

// Set environment before importing
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-min-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-unit-tests-min-32-chars';

const { tokenService } = await import('../../src/services/tokenService.js');

describe('TokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tokenService.clearRevokedTokens();
  });

  describe('generateTokens', () => {
    test('should generate both access and refresh tokens', () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'resident',
        username: 'testuser'
      };

      const tokens = tokenService.generateTokens(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('jti');
      expect(tokens).toHaveProperty('refreshJti');
      expect(tokens).toHaveProperty('expiresIn', 15 * 60 * 1000);
      expect(tokens).toHaveProperty('tokenType', 'Bearer');
    });

    test('should include standard JWT claims in access token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const tokens = tokenService.generateTokens(payload);
      const decoded = jwt.decode(tokens.accessToken);

      expect(decoded).toHaveProperty('sub');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('jti');
      expect(decoded).toHaveProperty('type', 'access');
      expect(decoded).toHaveProperty('iss', 'secure-gate-api');
      expect(decoded).toHaveProperty('aud', 'secure-gate-client');
    });
  });

  describe('verifyAccessToken', () => {
    test('should verify valid access token', async () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload);

      const decoded = await tokenService.verifyAccessToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded.id).toBe(1);
      expect(decoded.type).toBe('access');
    });

    test('should reject expired token', async () => {
      const payload = { id: 1, email: 'test@example.com', role: 'resident' };
      const token = tokenService.generateAccessToken(payload, '1ms');

      await new Promise(resolve => setTimeout(resolve, 50));
      
      await expect(tokenService.verifyAccessToken(token)).rejects.toThrow('Token expired');
    });
  });
});
```

### Component Testing (React)
```javascript
// Example: GradientButton Component Tests
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GradientButton from '../../../components/ui/GradientButton';

describe('GradientButton', () => {
  test('renders children text', () => {
    render(<GradientButton>Click Me</GradientButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<GradientButton onClick={handleClick}>Click</GradientButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<GradientButton onClick={handleClick} disabled>Click</GradientButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('shows loading spinner when loading', () => {
    render(<GradientButton loading>Submit</GradientButton>);
    
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  test('applies variant and size classes', () => {
    render(<GradientButton variant="secondary" size="lg">Button</GradientButton>);
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('gradient-button--secondary');
    expect(button.className).toContain('gradient-button--lg');
  });
});
```

### Mock Patterns
```javascript
// Service mocks with proper typing
const mockUserService = {
  createUser: jest.fn(),
  getUserById: jest.fn(),
  authenticateUser: jest.fn(),
  updateUser: jest.fn()
};

// Database mock with query simulation
const mockDbManager = {
  query: jest.fn(),
  transaction: jest.fn(),
  getStatus: jest.fn(() => ({ isConnected: true }))
};

// External service mocks
const mockEmailService = {
  sendRegistrationConfirmation: jest.fn().mockResolvedValue({ id: 'msg-123' }),
  sendPasswordReset: jest.fn().mockResolvedValue({ id: 'msg-456' })
};

// Mock implementation with realistic responses
mockUserService.createUser.mockImplementation(async (userData) => ({
  id: 1,
  username: userData.username,
  email: userData.email,
  role: userData.role,
  created_at: new Date().toISOString()
}));
```

## Integration Testing Patterns

### API Endpoint Testing
```javascript
// Example: Estate Scoping Integration Tests
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { dbManager } from '../../src/database/db.enhanced.js';
import { setupTestDatabase, createTestUsers, getAuthToken, cleanupTestDatabase } from './setup.js';
import { getTestApp } from '../utils/testApp.js';

const app = getTestApp();

describe('Estate scoping for guard and event APIs', () => {
  let adminToken;
  let adminUser;
  let guardUser;
  let estateTwoGuard;

  beforeAll(async () => {
    await setupTestDatabase();
    const testUsers = await createTestUsers();
    adminUser = testUsers.admin;
    guardUser = testUsers.guard;
    adminToken = await getAuthToken(adminUser.email);

    // Setup test data with proper estate scoping
    await dbManager.query(
      `INSERT INTO estates (id, name, slug, timezone, created_at)
       VALUES 
       (1, 'Test Estate 1', 'test-estate-1', 'UTC', NOW()),
       (2, 'Test Estate 2', 'test-estate-2', 'UTC', NOW())
       ON CONFLICT (id) DO NOTHING`
    );

    // Create guard for estate 2
    const estateTwoGuardResult = await dbManager.query(
      `INSERT INTO users (username, email, password_hash, role, phone, verified, estate_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        `guard_estate_two_${Date.now()}`,
        `guard_estate_two_${Date.now()}@test.com`,
        adminUser.password_hash,
        'guard',
        '+254700000999',
        true,
        2
      ]
    );
    estateTwoGuard = estateTwoGuardResult.rows[0];
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  test('guard shift list is scoped to estate', async () => {
    const response = await request(app)
      .get('/api/guards/shifts')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.every(shift => shift.estate_id === 1)).toBe(true);
  });

  test('guard cannot check in visitor from another estate', async () => {
    const guardToken = await getAuthToken(guardUser.email);
    
    // Create visitor in estate 2
    const visitorResult = await dbManager.query(
      `INSERT INTO visitors (name, phone, purpose, status, host_id, invite_code, estate_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        'Estate Two Visitor',
        '+254700000123',
        'Estate visit',
        'pending',
        adminUser.id,
        `EST2-${Date.now()}`,
        2
      ]
    );
    const visitorId = visitorResult.rows[0].id;

    const response = await request(app)
      .post(`/api/check-in/${visitorId}`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ notes: 'Attempted cross-estate check-in' });

    expect(response.status).toBe(404);

    // Cleanup
    await dbManager.query('DELETE FROM visitors WHERE id = $1', [visitorId]);
  });
});
```

### Database Integration Testing
```javascript
// Database transaction testing
describe('Database Transactions', () => {
  test('should rollback on error', async () => {
    const client = await dbManager.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert valid data
      const userResult = await client.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['testuser', 'test@example.com', 'hash', 'resident']
      );
      
      // This should fail due to constraint violation
      await expect(
        client.query(
          'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
          ['testuser', 'test@example.com', 'hash', 'resident'] // Duplicate email
        )
      ).rejects.toThrow();
      
      await client.query('ROLLBACK');
      
      // Verify rollback worked
      const checkResult = await client.query(
        'SELECT COUNT(*) FROM users WHERE email = $1',
        ['test@example.com']
      );
      expect(parseInt(checkResult.rows[0].count)).toBe(0);
      
    } finally {
      client.release();
    }
  });
});
```

## End-to-End Testing Patterns

### Playwright E2E Tests
```javascript
// Example: Authentication E2E Tests
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should complete login flow successfully', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'TestAdmin123!');
    
    // Submit form
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
    
    // Verify successful login
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'invalid@test.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
    
    // Verify still on login page
    expect(page.url()).toContain('/login');
  });

  test('should handle MFA flow', async ({ page }) => {
    // Login with MFA-enabled user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'mfa-user@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to MFA page
    await page.waitForURL('/mfa');
    
    // Enter MFA code
    await page.fill('[data-testid="mfa-code-input"]', '123456');
    await page.click('[data-testid="verify-mfa-button"]');
    
    // Should complete login
    await page.waitForURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});
```

### Visual Regression Testing
```javascript
// Visual testing with Playwright
test('should match dashboard screenshot', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Hide dynamic content
  await page.addStyleTag({
    content: `
      [data-testid="current-time"],
      [data-testid="live-visitor-count"] {
        visibility: hidden !important;
      }
    `
  });
  
  await expect(page).toHaveScreenshot('dashboard.png');
});
```

## Property-Based Testing

### Property Test Patterns
```javascript
// Example: Property-based testing with fast-check
import fc from 'fast-check';

describe('Visitor Validation Properties', () => {
  test('visitor name should always be trimmed and non-empty', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1 }).map(s => `  ${s}  `), // String with whitespace
      (nameWithWhitespace) => {
        const trimmedName = nameWithWhitespace.trim();
        
        // Property: trimmed name should never be empty if original had content
        expect(trimmedName.length).toBeGreaterThan(0);
        
        // Property: trimmed name should not have leading/trailing whitespace
        expect(trimmedName).toBe(trimmedName.trim());
      }
    ));
  });

  test('phone number validation should be consistent', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('+254712345678'),  // Valid Kenyan number
        fc.constant('+1234567890'),    // Valid international
        fc.constant('invalid-phone'),   // Invalid format
        fc.constant(''),               // Empty string
        fc.constant(null)              // Null value
      ),
      (phoneNumber) => {
        const isValid = validatePhoneNumber(phoneNumber);
        
        // Property: validation result should be boolean
        expect(typeof isValid).toBe('boolean');
        
        // Property: valid numbers should start with +
        if (isValid) {
          expect(phoneNumber).toMatch(/^\+\d+$/);
        }
      }
    ));
  });

  test('invite code generation should be unique and valid', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 10, maxLength: 100 }),
      (userIds) => {
        const inviteCodes = userIds.map(id => generateInviteCode(id));
        
        // Property: all codes should be unique
        const uniqueCodes = new Set(inviteCodes);
        expect(uniqueCodes.size).toBe(inviteCodes.length);
        
        // Property: all codes should match expected format
        inviteCodes.forEach(code => {
          expect(code).toMatch(/^[A-Z0-9]{8,12}$/);
        });
      }
    ));
  });
});
```

### Property Test Generators
```javascript
// Custom generators for domain objects
const visitorGenerator = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  phone: fc.oneof(
    fc.constant(null),
    fc.string().filter(s => s.match(/^\+\d{10,15}$/))
  ),
  purpose: fc.string({ minLength: 1, maxLength: 500 }),
  expectedArrival: fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
});

const userGenerator = fc.record({
  username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
  email: fc.emailAddress(),
  role: fc.constantFrom('admin', 'guard', 'resident'),
  estateId: fc.integer({ min: 1, max: 1000 })
});
```

## Test Data Management

### Test Fixtures
```javascript
// Test data fixtures
export const testUsers = {
  admin: {
    id: 1,
    username: 'admin_test',
    email: 'admin@test.com',
    password: 'TestAdmin123!',
    role: 'admin',
    estate_id: 1,
    verified: true
  },
  resident: {
    id: 2,
    username: 'resident_test',
    email: 'resident@test.com',
    password: 'TestResident123!',
    role: 'resident',
    estate_id: 1,
    verified: true
  },
  guard: {
    id: 3,
    username: 'guard_test',
    email: 'guard@test.com',
    password: 'TestGuard123!',
    role: 'guard',
    estate_id: 1,
    verified: true
  }
};

export const testVisitors = {
  pending: {
    name: 'John Doe',
    phone: '+254712345678',
    email: 'john@example.com',
    purpose: 'Meeting with resident',
    status: 'PENDING',
    invite_code: 'TEST-INV-001'
  },
  approved: {
    name: 'Jane Smith',
    phone: '+254712345679',
    email: 'jane@example.com',
    purpose: 'Delivery',
    status: 'APPROVED',
    invite_code: 'TEST-INV-002'
  }
};
```

### Database Seeding
```javascript
// Test database setup and seeding
export async function setupTestDatabase() {
  // Ensure test database is clean
  await cleanupTestDatabase();
  
  // Create test estates
  await dbManager.query(`
    INSERT INTO estates (id, name, slug, timezone) 
    VALUES (1, 'Test Estate', 'test-estate', 'UTC')
    ON CONFLICT (id) DO NOTHING
  `);
  
  // Create test users
  const hashedPassword = await passwordService.hashPassword('TestPassword123!');
  
  for (const [key, user] of Object.entries(testUsers)) {
    await dbManager.query(`
      INSERT INTO users (id, username, email, password_hash, role, estate_id, verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        estate_id = EXCLUDED.estate_id,
        verified = EXCLUDED.verified
    `, [user.id, user.username, user.email, hashedPassword, user.role, user.estate_id, user.verified]);
  }
}

export async function cleanupTestDatabase() {
  const tables = [
    'audit_logs', 'visitors', 'incidents', 'bulk_invites',
    'refresh_tokens', 'revoked_tokens'
  ];
  
  for (const table of tables) {
    await dbManager.query(`DELETE FROM ${table} WHERE 1=1`);
  }
}
```

## Test Configuration

### Jest Configuration
```javascript
// jest.config.js
export default {
  preset: 'node',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globalTeardown: '<rootDir>/tests/teardown.js',
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/src/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/database/migrations/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000
};
```

### Playwright Configuration
```javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI
  }
});
```

## Testing Best Practices

### Test Organization
- **Arrange-Act-Assert**: Clear test structure with setup, execution, and verification
- **Descriptive Names**: Test names should describe the expected behavior
- **Single Responsibility**: Each test should verify one specific behavior
- **Independent Tests**: Tests should not depend on each other's state

### Mock Strategy
- **Mock External Dependencies**: Database, external APIs, file system
- **Keep Mocks Simple**: Avoid complex mock logic that needs its own tests
- **Reset Mocks**: Clear mock state between tests
- **Verify Mock Calls**: Assert that mocks were called with expected parameters

### Performance Testing
- **Load Testing**: Use k6 or Artillery for API load testing
- **Memory Leaks**: Monitor memory usage during long-running tests
- **Database Performance**: Test query performance with realistic data volumes
- **Concurrent Users**: Test system behavior under concurrent load

### Continuous Integration
- **Parallel Execution**: Run tests in parallel for faster feedback
- **Test Isolation**: Ensure tests can run independently
- **Flaky Test Detection**: Identify and fix unreliable tests
- **Coverage Reporting**: Track test coverage and enforce thresholds

This comprehensive testing strategy ensures high code quality, system reliability, and maintainable test suites across the Secure Gate Access Control System.