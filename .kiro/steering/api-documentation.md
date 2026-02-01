# API Documentation & Endpoint Patterns

## Overview

The Secure Gate Access Control System implements a comprehensive REST API with standardized patterns, authentication flows, and response formats. This guide covers the API architecture, endpoint conventions, and integration patterns used throughout the system.

## API Architecture

### Base URL Structure
- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.secure-gate.app/api`
- **Staging**: `https://staging-api.secure-gate.app/api`

### Versioning Strategy
- **Current Version**: v1 (implicit, no version prefix)
- **Future Versions**: `/api/v2/` prefix for breaking changes
- **Backward Compatibility**: Maintained for at least 6 months

## Authentication & Authorization

### Token-Based Authentication
```javascript
// JWT Token Structure
{
  "sub": "user_id",           // Subject (user ID)
  "email": "user@example.com",
  "role": "resident",         // User role
  "estate_id": 123,          // Estate scoping
  "verified": true,          // Email verification status
  "iat": 1640995200,         // Issued at
  "exp": 1640998800,         // Expires at
  "jti": "unique-token-id",  // JWT ID for revocation
  "type": "access"           // Token type
}
```

### Authentication Headers
```http
Authorization: Bearer <access_token>
X-Request-ID: <correlation_id>
X-CSRF-Token: <csrf_token>
```

### Role-Based Access Control
- **Super Admin**: Platform-wide access across all estates
- **Estate Admin**: Complete estate management and configuration
- **Security Guard**: Visitor processing and security operations
- **Resident**: Visitor invitation and management
- **Visitor**: Self-service access via token URLs

## Endpoint Patterns

### Resource Naming Conventions
- **Collections**: Plural nouns (`/api/visitors`, `/api/users`)
- **Resources**: Singular identifiers (`/api/visitors/{id}`)
- **Sub-resources**: Nested paths (`/api/visitors/{id}/pass`)
- **Actions**: Verb-based (`/api/visitors/{id}/check-in`)

### HTTP Methods
- **GET**: Retrieve resources (idempotent)
- **POST**: Create new resources or trigger actions
- **PUT**: Update entire resource (idempotent)
- **PATCH**: Partial resource updates
- **DELETE**: Remove resources (soft delete preferred)

### Standard Query Parameters
```javascript
// Pagination
?page=1&limit=20

// Filtering
?status=active&role=resident

// Sorting
?sort=created_at&order=desc

// Search
?search=john&fields=name,email

// Date Ranges
?start_date=2025-01-01&end_date=2025-01-31
```

## Response Format Standards

### Success Response Structure
```javascript
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response payload
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Error Response Structure
```javascript
{
  "success": false,
  "message": "User-friendly error message",
  "error": {
    "code": "ERROR_CODE",
    "requestId": "correlation-id",
    "details": {
      // Additional error context (development only)
    }
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### Pagination Response
```javascript
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Core API Endpoints

### Authentication Endpoints
```javascript
// User Registration (Public)
POST /api/auth/register
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phone": "+254712345678"
}

// User Login
POST /api/auth/login
{
  "username": "john_doe", // or email
  "password": "SecurePass123!",
  "estate_id": 123 // optional
}

// Token Refresh
POST /api/auth/refresh
{
  "refreshToken": "jwt_refresh_token"
}

// Logout
POST /api/auth/logout
// Requires: Authorization header

// Get CSRF Token
GET /api/auth/csrf-token

// Email Verification
GET /api/auth/verify-email?token=verification_token
```

### Visitor Management Endpoints
```javascript
// Create Visitor Invitation
POST /api/visitors
{
  "name": "John Doe",
  "phone": "+254712345678",
  "email": "john@example.com",
  "purpose": "Meeting with resident",
  "expectedArrival": "2025-01-01T14:00:00.000Z",
  "notes": "Please bring ID"
}

// Get My Visitors (Resident)
GET /api/visitors?status=pending&page=1&limit=10

// Visitor Check-in (Guard)
POST /api/visitors/{id}/check-in
{
  "notes": "Visitor arrived on time",
  "guardId": 123
}

// Visitor Check-out (Guard)
POST /api/visitors/{id}/check-out
{
  "notes": "Visit completed",
  "guardId": 123
}

// OTP Verification (Public)
POST /api/visitors/{id}/verify-otp
{
  "otp": "123456"
}

// Bulk Invite
POST /api/visitors/bulk-invite
{
  "eventName": "Community Meeting",
  "date": "2025-01-15",
  "time": "18:00",
  "numGuests": 50,
  "expiresAt": "2025-01-15T20:00:00.000Z"
}
```

### Admin Management Endpoints
```javascript
// Get System Metrics (Admin)
GET /api/admin/metrics

// Get Audit Logs (Admin)
GET /api/admin/audit-logs?level=info&page=1&limit=50

// User Management
GET /api/admin/users?role=resident&status=active
PUT /api/admin/users/{id}
DELETE /api/admin/users/{id}

// Pending User Approvals
GET /api/admin/users/pending
PUT /api/admin/users/{id}/status
{
  "status": "approved", // or "rejected"
  "reason": "Account verified"
}
```

### Health & Monitoring Endpoints
```javascript
// Basic Health Check (Public)
GET /health

// Detailed Health Check (Admin)
GET /health/detailed

// Kubernetes Probes
GET /health/live    // Liveness probe
GET /health/ready   // Readiness probe

// Metrics (Prometheus format)
GET /health/metrics
```

## Rate Limiting

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640998800
Retry-After: 60
```

### Rate Limiting Profiles
```javascript
const RATE_LIMIT_PROFILES = {
  PUBLIC: { windowMs: 15 * 60 * 1000, max: 200 },    // 200 requests per 15 minutes
  AUTH: { windowMs: 15 * 60 * 1000, max: 20 },       // 20 auth attempts per 15 minutes
  ADMIN: { windowMs: 60 * 60 * 1000, max: 50 },      // 50 admin requests per hour
  SENSITIVE: { windowMs: 10 * 60 * 1000, max: 5 }    // 5 sensitive ops per 10 minutes
};
```

## Error Handling

### Standard Error Codes
```javascript
// Authentication & Authorization
AUTH_TOKEN_MISSING: 'Authentication token required'
AUTH_TOKEN_INVALID: 'Invalid authentication token'
AUTH_TOKEN_EXPIRED: 'Authentication token expired'
AUTH_INSUFFICIENT_PERMISSIONS: 'Insufficient permissions'

// Validation
VALIDATION_ERROR: 'Validation failed'
VALIDATION_REQUIRED_FIELD: 'Required field missing'
VALIDATION_INVALID_FORMAT: 'Invalid data format'

// Business Logic
RESOURCE_NOT_FOUND: 'Resource not found'
RESOURCE_ALREADY_EXISTS: 'Resource already exists'
OPERATION_NOT_ALLOWED: 'Operation not allowed'

// System
DATABASE_ERROR: 'Database operation failed'
EXTERNAL_SERVICE_ERROR: 'External service error'
RATE_LIMIT_EXCEEDED: 'Rate limit exceeded'
```

### HTTP Status Code Usage
- **200**: Success with response body
- **201**: Resource created successfully
- **204**: Success with no response body
- **400**: Bad request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Resource not found
- **409**: Conflict (duplicate resource)
- **429**: Too many requests (rate limited)
- **500**: Internal server error

## Request/Response Examples

### Successful Visitor Creation
```http
POST /api/visitors
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "John Doe",
  "phone": "+254712345678",
  "email": "john@example.com",
  "purpose": "Meeting with resident",
  "expectedArrival": "2025-01-01T14:00:00.000Z"
}

HTTP/1.1 201 Created
Content-Type: application/json
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000

{
  "success": true,
  "message": "Visitor created successfully",
  "data": {
    "visitor": {
      "id": 123,
      "name": "John Doe",
      "phone": "+254712345678",
      "email": "john@example.com",
      "status": "PENDING",
      "inviteCode": "INV-ABC123",
      "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "expectedArrival": "2025-01-01T14:00:00.000Z",
      "created_at": "2025-01-01T10:00:00.000Z"
    }
  },
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

### Validation Error Example
```http
POST /api/visitors
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "",
  "phone": "invalid-phone",
  "email": "not-an-email"
}

HTTP/1.1 400 Bad Request
Content-Type: application/json
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000

{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "details": {
      "name": "Name is required",
      "phone": "Invalid phone number format",
      "email": "Invalid email format"
    }
  },
  "timestamp": "2025-01-01T10:00:00.000Z"
}
```

## Security Headers

### Required Security Headers
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{nonce}'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### CORS Configuration
```javascript
// CORS Settings
{
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining']
}
```

## WebSocket Integration

### Real-Time Event Endpoints
```javascript
// WebSocket Connection
const ws = new WebSocket('wss://api.secure-gate.app/ws', ['Bearer', accessToken]);

// Event Types
{
  "type": "visitor_checked_in",
  "data": {
    "visitorId": 123,
    "name": "John Doe",
    "timestamp": "2025-01-01T14:00:00.000Z"
  }
}

{
  "type": "visitor_status_updated",
  "data": {
    "visitorId": 123,
    "oldStatus": "PENDING",
    "newStatus": "APPROVED",
    "timestamp": "2025-01-01T13:30:00.000Z"
  }
}
```

## API Testing

### Test Data Conventions
```javascript
// Test User Credentials
{
  "admin": {
    "email": "admin@test.com",
    "password": "TestAdmin123!"
  },
  "resident": {
    "email": "resident@test.com", 
    "password": "TestResident123!"
  },
  "guard": {
    "email": "guard@test.com",
    "password": "TestGuard123!"
  }
}

// Test Estate Data
{
  "estate_id": 1,
  "name": "Test Estate",
  "timezone": "UTC"
}
```

### Integration Test Patterns
```javascript
// Standard Test Flow
describe('Visitor API', () => {
  let authToken;
  let testVisitor;

  beforeAll(async () => {
    authToken = await getAuthToken('resident@test.com');
  });

  test('should create visitor', async () => {
    const response = await request(app)
      .post('/api/visitors')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validVisitorData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    testVisitor = response.body.data.visitor;
  });

  afterAll(async () => {
    await cleanupTestData();
  });
});
```

## Performance Considerations

### Caching Strategy
- **GET Endpoints**: Cache responses for 5-15 minutes
- **Static Data**: Cache for 1 hour (user profiles, estate info)
- **Dynamic Data**: Cache for 1-5 minutes (visitor lists, metrics)
- **Cache Headers**: Include `Cache-Control` and `ETag` headers

### Pagination Best Practices
- **Default Limit**: 20 items per page
- **Maximum Limit**: 100 items per page
- **Cursor-Based**: For large datasets (>10k records)
- **Offset-Based**: For smaller datasets with stable ordering

### Database Query Optimization
- **Indexes**: All foreign keys and frequently queried fields
- **Estate Scoping**: Always filter by `estate_id` for multi-tenant data
- **Connection Pooling**: 20 connections max, 5 minimum
- **Query Timeout**: 30 seconds maximum

## Monitoring & Observability

### Request Logging
```javascript
// Standard Log Format
{
  "timestamp": "2025-01-01T10:00:00.000Z",
  "level": "info",
  "message": "API request completed",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "POST",
  "url": "/api/visitors",
  "statusCode": 201,
  "responseTime": 150,
  "userId": 123,
  "estateId": 1,
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.100"
}
```

### Metrics Collection
- **Response Times**: P50, P95, P99 percentiles
- **Error Rates**: By endpoint and error type
- **Request Volume**: Requests per second/minute
- **Authentication**: Success/failure rates
- **Rate Limiting**: Violations and patterns

This API documentation provides the foundation for consistent, secure, and maintainable API development across the Secure Gate Access Control System.