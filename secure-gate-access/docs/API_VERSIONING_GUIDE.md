# API Versioning Guide
# Secure Gate Access Control System

This guide explains the API versioning strategy implemented in the Secure Gate Access Control System.

## Table of Contents

1. [Overview](#overview)
2. [Version Detection](#version-detection)
3. [Supported Versions](#supported-versions)
4. [Version Differences](#version-differences)
5. [Migration Guide](#migration-guide)
6. [Best Practices](#best-practices)
7. [Deprecation Policy](#deprecation-policy)

## Overview

The Secure Gate Access Control System implements a comprehensive API versioning strategy to ensure backward compatibility while allowing for feature evolution. The system supports multiple API versions simultaneously and provides clear migration paths.

### Key Features

- **Multiple Version Support**: Run multiple API versions simultaneously
- **Flexible Version Detection**: Support for multiple version detection strategies
- **Backward Compatibility**: Maintain compatibility with existing clients
- **Clear Migration Paths**: Detailed migration guides and tools
- **Deprecation Management**: Structured deprecation and sunset policies

## Version Detection

The API supports multiple strategies for version detection, in order of priority:

### 1. URL Path (Highest Priority)
```
GET /api/v1/users
GET /api/v2/users
```

### 2. Accept Header
```
Accept: application/vnd.api+json;version=1.0
Accept: application/vnd.api+json;version=2.0
```

### 3. Custom Headers
```
API-Version: v1
X-API-Version: v2
```

### 4. Query Parameter (Lowest Priority)
```
GET /api/users?version=v1
GET /api/users?version=v2
```

### 5. Default Version
If no version is specified, the system defaults to `v1`.

## Supported Versions

### Version 1 (v1) - Stable
- **Status**: Stable
- **Release Date**: 2024-01-01
- **Deprecation Date**: 2024-12-31
- **Sunset Date**: 2025-06-30
- **Description**: Initial API version with core functionality

**Features**:
- Basic authentication (login/register)
- User management
- Visitor management
- Basic admin functions
- Standard error responses

### Version 2 (v2) - Beta
- **Status**: Beta
- **Release Date**: 2024-10-01
- **Deprecation Date**: TBD
- **Sunset Date**: TBD
- **Description**: Enhanced API with improved features and performance

**Features**:
- Enhanced authentication with refresh tokens
- Advanced user management with account locking
- Improved error responses with metadata
- Enhanced filtering and sorting
- User preferences support
- Advanced admin statistics

## Version Differences

### Authentication

#### v1 Authentication
```json
POST /api/v1/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+254712345678",
  "password": "SecurePass123!",
  "role": "resident"
}

Response:
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

#### v2 Authentication
```json
POST /api/v2/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+254712345678",
  "password": "SecurePass123!",
  "role": "resident",
  "preferences": {
    "notifications": true,
    "language": "en"
  }
}

Response:
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { 
      ...,
      "preferences": { ... }
    },
    "token": "jwt_token_here",
    "refresh_token": "refresh_token_here"
  },
  "meta": {
    "api_version": "v2",
    "timestamp": "2024-10-01T10:00:00Z"
  }
}
```

### Error Responses

#### v1 Error Response
```json
{
  "success": false,
  "message": "User not found",
  "error": {
    "code": "USER_NOT_FOUND"
  },
  "timestamp": "2024-10-01T10:00:00Z"
}
```

#### v2 Error Response
```json
{
  "success": false,
  "message": "User not found",
  "error": {
    "code": "USER_NOT_FOUND",
    "details": {
      "field": "id",
      "value": "123e4567-e89b-12d3-a456-426614174000"
    }
  },
  "timestamp": "2024-10-01T10:00:00Z",
  "meta": {
    "api_version": "v2",
    "request_id": "req_123456"
  }
}
```

### Admin Endpoints

#### v1 Admin Users
```json
GET /api/v1/admin/users?page=1&limit=10&role=resident

Response:
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

#### v2 Admin Users
```json
GET /api/v2/admin/users?page=1&limit=10&role=resident&search=john&sort=name&order=asc&status=active

Response:
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    },
    "filters": {
      "applied": {
        "role": "resident",
        "search": "john",
        "sort": "name",
        "order": "asc",
        "status": "active"
      },
      "available": {
        "roles": ["resident", "guard", "admin"],
        "statuses": ["active", "inactive", "locked"],
        "sortFields": ["name", "email", "created_at", "last_login"]
      }
    }
  },
  "meta": {
    "api_version": "v2",
    "response_time": 45
  }
}
```

## Migration Guide

### From v1 to v2

#### 1. Update API Endpoints
```javascript
// v1
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// v2
const response = await fetch('/api/v2/auth/login', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'API-Version': 'v2'
  },
  body: JSON.stringify({ email, password })
});
```

#### 2. Handle New Response Format
```javascript
// v1 response handling
const { user, token } = response.data;

// v2 response handling
const { user, token, refresh_token } = response.data;
const { api_version, timestamp } = response.meta;

// Store refresh token for token renewal
localStorage.setItem('refresh_token', refresh_token);
```

#### 3. Implement Refresh Token Logic
```javascript
// Token refresh function
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  
  const response = await fetch('/api/v2/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  
  if (response.ok) {
    const { token } = response.data;
    localStorage.setItem('access_token', token);
    return token;
  } else {
    // Redirect to login
    window.location.href = '/login';
  }
}
```

#### 4. Update Error Handling
```javascript
// v1 error handling
if (!response.success) {
  showError(response.message);
}

// v2 error handling
if (!response.success) {
  const { message, error } = response;
  const { code, details } = error;
  
  // Handle specific error codes
  switch (code) {
    case 'USER_NOT_FOUND':
      showError('User not found');
      break;
    case 'ACCOUNT_LOCKED':
      showError('Account is temporarily locked');
      break;
    default:
      showError(message);
  }
}
```

#### 5. Update Admin Features
```javascript
// v1 admin users
const users = await fetch('/api/admin/users?page=1&limit=10');

// v2 admin users with enhanced filtering
const users = await fetch('/api/v2/admin/users?page=1&limit=10&search=john&sort=name&status=active');
```

## Best Practices

### 1. Version Detection
- Always specify the API version explicitly
- Use URL path method for clarity
- Include version in headers as backup

### 2. Error Handling
- Handle both v1 and v2 error formats
- Implement fallback for missing fields
- Log errors with version information

### 3. Token Management
- Store both access and refresh tokens (v2)
- Implement automatic token refresh
- Handle token expiration gracefully

### 4. Feature Detection
- Check API version before using v2 features
- Implement feature flags for gradual migration
- Provide fallbacks for v1 compatibility

### 5. Testing
- Test with both v1 and v2 endpoints
- Verify backward compatibility
- Test migration scenarios

## Deprecation Policy

### Timeline
- **v1 Deprecation**: December 31, 2024
- **v1 Sunset**: June 30, 2025
- **v2 Stable**: January 1, 2025

### Deprecation Process
1. **Announcement**: 6 months before deprecation
2. **Warning Headers**: Added to responses 3 months before deprecation
3. **Documentation**: Updated with migration guides
4. **Support**: Limited support during deprecation period
5. **Sunset**: Complete removal after sunset date

### Warning Headers
```
API-Version-Deprecated: true
API-Version-Deprecation-Date: 2024-12-31T00:00:00Z
Warning: 299 - "API version v1 is deprecated. Please upgrade to v2."
```

## API Version Information

### Get Supported Versions
```bash
GET /api/versions
```

Response:
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "version": "v1",
        "status": "stable",
        "deprecationDate": "2024-12-31T00:00:00Z",
        "sunsetDate": "2025-06-30T00:00:00Z",
        "isDeprecated": false,
        "isSunset": false
      },
      {
        "version": "v2",
        "status": "beta",
        "deprecationDate": null,
        "sunsetDate": null,
        "isDeprecated": false,
        "isSunset": false
      }
    ],
    "defaultVersion": "v1",
    "currentVersion": "v1"
  }
}
```

### Get Migration Guide
```bash
GET /api/migration-guide?from=v1&to=v2
```

Response:
```json
{
  "success": true,
  "data": {
    "from": "v1",
    "to": "v2",
    "breakingChanges": [...],
    "newFeatures": [...],
    "migrationSteps": [...],
    "deprecationTimeline": {...}
  }
}
```

## Support

For questions about API versioning:

1. Check this documentation
2. Review migration guides
3. Test with both versions
4. Contact development team

## Changelog

### v2.0.0 (2024-10-01)
- Added refresh token support
- Enhanced error responses with metadata
- Improved admin user management
- Added user preferences
- Enhanced filtering and sorting
- Added account locking mechanism

### v1.0.0 (2024-01-01)
- Initial API release
- Basic authentication
- User management
- Visitor management
- Admin functions




