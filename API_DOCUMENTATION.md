# Secure Gate Access Control System - API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [User Management](#user-management)
4. [Visitor Management](#visitor-management)
5. [Invitation Management](#invitation-management)
6. [Check-in/Check-out](#check-incheck-out)
7. [Admin Operations](#admin-operations)
8. [Performance Monitoring](#performance-monitoring)
9. [Load Balancer Management](#load-balancer-management)
10. [Compliance](#compliance)
11. [Error Handling](#error-handling)

## Overview

The Secure Gate Access Control System provides a comprehensive REST API for managing visitors, residents, guards, and administrators. The API follows RESTful principles and uses JSON for data exchange.

### Base URL
```
Production: https://api.securegate.com
Development: http://localhost:5000
```

### Authentication
All API endpoints (except authentication) require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Response Format
All API responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Error Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Authentication

### Login
Authenticate a user and receive access and refresh tokens.

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "role": "resident",
      "name": "John Doe"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "message": "Login successful"
}
```

### Register
Register a new user account.

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "resident"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "role": "resident",
      "name": "John Doe",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  },
  "message": "Registration successful"
}
```

### Refresh Token
Refresh an expired access token using a valid refresh token.

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "message": "Token refreshed successfully"
}
```

### Logout
Logout a user and invalidate their tokens.

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Password Reset
Request a password reset email.

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### Reset Password
Reset password using a reset token.

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "password": "new_password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

## User Management

### Get Current User
Get the current authenticated user's information.

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "resident",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "lastLogin": "2025-01-15T10:30:00.000Z"
  }
}
```

### Update Profile
Update the current user's profile information.

```http
PUT /api/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "John Smith",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Smith",
    "phone": "+1234567890",
    "role": "resident",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Profile updated successfully"
}
```

### Change Password
Change the current user's password.

```http
PUT /api/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "old_password123",
  "newPassword": "new_password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## Visitor Management

### Create Visitor
Create a new visitor record.

```http
POST /api/visitors
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "visitDate": "2025-01-20",
  "purpose": "Meeting",
  "notes": "Meeting with John about project"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "visitor_123",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "visitDate": "2025-01-20",
    "purpose": "Meeting",
    "notes": "Meeting with John about project",
    "status": "pending",
    "qrCode": "visitor_qr_code_123",
    "otp": "123456",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "createdBy": "user_123"
  },
  "message": "Visitor created successfully"
}
```

### Get Visitors
Get a list of visitors with optional filtering and pagination.

```http
GET /api/visitors?status=active&page=1&limit=10&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, active, completed, expired)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order (asc, desc, default: desc)
- `search` (optional): Search by name, email, or phone

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "visitor_123",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "visitDate": "2025-01-20",
      "purpose": "Meeting",
      "status": "active",
      "qrCode": "visitor_qr_code_123",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### Get Visitor
Get a specific visitor by ID.

```http
GET /api/visitors/{visitorId}
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "visitor_123",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "visitDate": "2025-01-20",
    "purpose": "Meeting",
    "notes": "Meeting with John about project",
    "status": "active",
    "qrCode": "visitor_qr_code_123",
    "otp": "123456",
    "checkInTime": "2025-01-20T09:00:00.000Z",
    "checkOutTime": null,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "createdBy": "user_123"
  }
}
```

### Update Visitor
Update a visitor's information.

```http
PUT /api/visitors/{visitorId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "phone": "+0987654321",
  "purpose": "Updated meeting purpose"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "visitor_123",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+0987654321",
    "purpose": "Updated meeting purpose",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Visitor updated successfully"
}
```

### Delete Visitor
Delete a visitor record.

```http
DELETE /api/visitors/{visitorId}
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Visitor deleted successfully"
}
```

## Invitation Management

### Create Invitation
Create a new visitor invitation.

```http
POST /api/invitations
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "visitorName": "John Doe",
  "visitorEmail": "john@example.com",
  "visitorPhone": "+1234567890",
  "visitDate": "2025-01-20",
  "purpose": "Meeting",
  "expiresAt": "2025-01-20T18:00:00.000Z",
  "notes": "Meeting about project"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "invitation_123",
    "invitationCode": "INV_ABC123",
    "visitorName": "John Doe",
    "visitorEmail": "john@example.com",
    "visitorPhone": "+1234567890",
    "visitDate": "2025-01-20",
    "purpose": "Meeting",
    "status": "pending",
    "expiresAt": "2025-01-20T18:00:00.000Z",
    "inviteUrl": "https://securegate.com/invite/INV_ABC123",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "createdBy": "user_123"
  },
  "message": "Invitation created successfully"
}
```

### Get Invitations
Get a list of invitations.

```http
GET /api/invitations?status=pending&page=1&limit=10
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "invitation_123",
      "invitationCode": "INV_ABC123",
      "visitorName": "John Doe",
      "visitorEmail": "john@example.com",
      "status": "pending",
      "visitDate": "2025-01-20",
      "expiresAt": "2025-01-20T18:00:00.000Z",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### Complete Invitation
Complete an invitation by visitor registration.

```http
POST /api/invitations/{invitationCode}/complete
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "idNumber": "12345678"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "visitorId": "visitor_123",
    "qrCode": "visitor_qr_code_123",
    "otp": "123456",
    "status": "active"
  },
  "message": "Invitation completed successfully"
}
```

## Check-in/Check-out

### Check-in Visitor
Check-in a visitor using QR code and OTP.

```http
POST /api/checkins
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "qrCode": "visitor_qr_code_123",
  "otp": "123456",
  "notes": "Visitor arrived on time"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "checkin_123",
    "visitorId": "visitor_123",
    "visitorName": "John Doe",
    "checkInTime": "2025-01-20T09:00:00.000Z",
    "status": "checked_in",
    "notes": "Visitor arrived on time",
    "checkedInBy": "guard_123"
  },
  "message": "Visitor checked in successfully"
}
```

### Check-out Visitor
Check-out a visitor.

```http
PUT /api/checkins/{checkinId}/checkout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "notes": "Visitor left at 5:00 PM"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "checkin_123",
    "visitorId": "visitor_123",
    "visitorName": "John Doe",
    "checkInTime": "2025-01-20T09:00:00.000Z",
    "checkOutTime": "2025-01-20T17:00:00.000Z",
    "status": "checked_out",
    "notes": "Visitor left at 5:00 PM",
    "checkedOutBy": "guard_123"
  },
  "message": "Visitor checked out successfully"
}
```

### Get Check-ins
Get a list of check-ins.

```http
GET /api/checkins?status=checked_in&page=1&limit=10
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "checkin_123",
      "visitorId": "visitor_123",
      "visitorName": "John Doe",
      "checkInTime": "2025-01-20T09:00:00.000Z",
      "checkOutTime": null,
      "status": "checked_in",
      "checkedInBy": "guard_123"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

## Admin Operations

### Get System Statistics
Get system-wide statistics and metrics.

```http
GET /api/admin/statistics
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "active": 120,
      "residents": 100,
      "guards": 15,
      "admins": 5
    },
    "visitors": {
      "total": 500,
      "active": 25,
      "today": 10,
      "thisWeek": 50,
      "thisMonth": 200
    },
    "checkins": {
      "total": 1000,
      "today": 15,
      "thisWeek": 75,
      "thisMonth": 300
    },
    "system": {
      "uptime": "7 days, 12 hours",
      "version": "1.0.0",
      "lastBackup": "2025-01-15T02:00:00.000Z"
    }
  }
}
```

### Get Users
Get a list of users with optional filtering.

```http
GET /api/admin/users?role=resident&page=1&limit=10
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "resident",
      "status": "active",
      "lastLogin": "2025-01-15T10:30:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Create User
Create a new user account.

```http
POST /api/admin/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "resident"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_456",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "resident",
    "status": "active",
    "createdAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "User created successfully"
}
```

### Update User
Update a user's information.

```http
PUT /api/admin/users/{userId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "role": "guard",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "Updated Name",
    "role": "guard",
    "status": "active",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "User updated successfully"
}
```

### Delete User
Delete a user account.

```http
DELETE /api/admin/users/{userId}
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

## Performance Monitoring

### Get Performance Metrics
Get system performance metrics.

```http
GET /api/performance/metrics
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "requests": 10000,
      "averageResponseTime": 150,
      "slowRequests": 50,
      "errors": 25,
      "errorRate": 0.25
    },
    "cache": {
      "hits": 8000,
      "misses": 2000,
      "hitRate": 80.0
    },
    "database": {
      "queries": 5000,
      "averageQueryTime": 75
    }
  }
}
```

### Get Cache Status
Get cache performance and status.

```http
GET /api/performance/cache
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "hits": 8000,
      "misses": 2000,
      "sets": 3000,
      "deletes": 500,
      "hitRate": 80.0
    },
    "health": {
      "status": "healthy",
      "responseTime": "2ms",
      "isConnected": true
    }
  }
}
```

### Clear Cache
Clear the application cache.

```http
POST /api/performance/cache/clear
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "prefix": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "clearedKeys": 150
}
```

## Load Balancer Management

### Get Load Balancer Status
Get load balancer status and statistics.

```http
GET /api/load-balancer/status
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "loadBalancer": {
      "algorithm": "round_robin",
      "stickySessions": true,
      "sessionCount": 25,
      "health": {
        "totalServers": 3,
        "healthyServers": 3,
        "unhealthyServers": 0,
        "successRate": 99.5
      }
    },
    "servers": [
      {
        "id": "backend-1",
        "host": "backend-1",
        "port": 5000,
        "status": "healthy",
        "weight": 3,
        "responseTime": 45,
        "lastCheck": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

### Get Servers
Get all load balancer servers.

```http
GET /api/load-balancer/servers
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "backend-1",
      "host": "backend-1",
      "port": 5000,
      "status": "healthy",
      "weight": 3,
      "responseTime": 45,
      "successRate": 99.5,
      "totalChecks": 1000,
      "successfulChecks": 995,
      "failedChecks": 5,
      "lastCheck": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

### Toggle Server
Enable or disable a server.

```http
PUT /api/load-balancer/servers/{serverId}/toggle
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "enabled": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "backend-1",
    "host": "backend-1",
    "port": 5000,
    "status": "unhealthy",
    "enabled": false
  },
  "message": "Server disabled successfully"
}
```

### Change Algorithm
Change the load balancing algorithm.

```http
PUT /api/load-balancer/algorithm
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "algorithm": "least_connections"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "algorithm": "least_connections"
  },
  "message": "Load balancing algorithm changed successfully"
}
```

## Compliance

### Get Compliance Status
Get compliance status and statistics.

```http
GET /api/compliance/status
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gdpr": {
      "enabled": true,
      "consentRequired": true,
      "dataRetentionDays": 365,
      "lastAudit": "2025-01-15T10:30:00.000Z"
    },
    "kenyaDpa": {
      "enabled": true,
      "dataRetentionDays": 180,
      "lastAudit": "2025-01-15T10:30:00.000Z"
    },
    "consent": {
      "totalConsents": 500,
      "activeConsents": 450,
      "expiredConsents": 50
    }
  }
}
```

### Data Subject Access Request
Submit a data subject access request.

```http
POST /api/compliance/dsar
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "requestType": "access",
  "dataSubjectEmail": "user@example.com",
  "description": "Request for personal data access"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "dsar_123",
    "status": "pending",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "estimatedCompletion": "2025-01-22T10:30:00.000Z"
  },
  "message": "Data subject access request submitted successfully"
}
```

### Data Deletion Request
Submit a data deletion request.

```http
POST /api/compliance/data-deletion
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "dataSubjectEmail": "user@example.com",
  "reason": "Account closure",
  "description": "Request for complete data deletion"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "deletion_123",
    "status": "pending",
    "submittedAt": "2025-01-15T10:30:00.000Z",
    "estimatedCompletion": "2025-01-22T10:30:00.000Z"
  },
  "message": "Data deletion request submitted successfully"
}
```

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 502 | Bad Gateway - Upstream server error |
| 503 | Service Unavailable - Service temporarily unavailable |

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/api/visitors",
  "method": "POST"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| AUTH_001 | Invalid credentials |
| AUTH_002 | Token expired |
| AUTH_003 | Insufficient permissions |
| AUTH_004 | Account locked |
| VISITOR_001 | Visitor not found |
| VISITOR_002 | Invalid QR code |
| VISITOR_003 | OTP expired |
| VISITOR_004 | Visitor already checked in |
| INVITATION_001 | Invitation not found |
| INVITATION_002 | Invitation expired |
| INVITATION_003 | Invitation already used |
| SYSTEM_001 | Database connection failed |
| SYSTEM_002 | Cache connection failed |
| SYSTEM_003 | External service unavailable |
| VALIDATION_001 | Required field missing |
| VALIDATION_002 | Invalid email format |
| VALIDATION_003 | Invalid phone format |
| RATE_LIMIT_001 | Rate limit exceeded |
| RATE_LIMIT_002 | Too many requests |

### Rate Limiting

The API implements rate limiting to prevent abuse and ensure fair usage:

- **General API**: 100 requests per minute
- **Authentication**: 10 requests per minute
- **Sensitive Operations**: 5 requests per minute
- **Public Endpoints**: 200 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

### Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort order (asc, desc, default: desc)

Pagination metadata is included in responses:
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Filtering and Search

Many list endpoints support filtering and search:

- `status`: Filter by status
- `role`: Filter by role
- `search`: Search by name, email, or phone
- `dateFrom`: Filter from date
- `dateTo`: Filter to date

Example:
```
GET /api/visitors?status=active&search=john&dateFrom=2025-01-01&dateTo=2025-01-31
```

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Contact**: api-support@securegate.com
