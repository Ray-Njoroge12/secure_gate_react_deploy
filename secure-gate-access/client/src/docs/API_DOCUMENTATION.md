# API Documentation

This document provides comprehensive documentation for the Secure Gate Access API endpoints.

## Base URL

```
Development: http://localhost:5003/api
Production: https://api.securegateaccess.com/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details
  }
}
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "resident",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "resident"
    },
    "token": "jwt_token"
  },
  "message": "User registered successfully"
}
```

#### POST /auth/login
Authenticate a user and return a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "resident"
    },
    "token": "jwt_token"
  },
  "message": "Login successful"
}
```

#### GET /auth/profile
Get the current user's profile information.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "resident",
    "phone": "+1234567890",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /auth/profile
Update the current user's profile information.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "resident",
    "phone": "+1234567890",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

### Visitor Management

#### GET /visitors
Get a list of visitors for the current user.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 25)
- `status` (optional): Filter by status (confirmed, checked-in, checked-out, revoked)
- `search` (optional): Search term for name, email, or phone

**Response:**
```json
{
  "success": true,
  "data": {
    "visitors": [
      {
        "id": "visitor_id",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+1234567890",
        "status": "confirmed",
        "checkInTime": null,
        "checkOutTime": null,
        "createdAt": "2024-01-01T00:00:00Z",
        "visitDate": "2024-01-15T10:00:00Z",
        "hostId": "user_id",
        "hostName": "John Doe"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 100,
      "pages": 4
    }
  }
}
```

#### POST /visitors
Create a new visitor invitation.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "visitDate": "2024-01-15T10:00:00Z",
  "purpose": "Meeting",
  "notes": "Important client meeting"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "visitor_id",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "status": "confirmed",
    "inviteCode": "ABC123",
    "visitDate": "2024-01-15T10:00:00Z",
    "purpose": "Meeting",
    "notes": "Important client meeting",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "Visitor invitation created successfully"
}
```

#### GET /visitors/:id
Get a specific visitor's details.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "visitor_id",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "status": "confirmed",
    "inviteCode": "ABC123",
    "visitDate": "2024-01-15T10:00:00Z",
    "purpose": "Meeting",
    "notes": "Important client meeting",
    "checkInTime": null,
    "checkOutTime": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "hostId": "user_id",
    "hostName": "John Doe"
  }
}
```

#### POST /visitors/:id/pass
Generate a QR code pass for a visitor.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "passId": "pass_id",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "expiresAt": "2024-01-15T18:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "Visitor pass generated successfully"
}
```

#### POST /visitors/:id/check-in
Check in a visitor.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "visitor_id",
    "status": "checked-in",
    "checkInTime": "2024-01-15T10:30:00Z",
    "checkedInBy": "guard_id"
  },
  "message": "Visitor checked in successfully"
}
```

#### POST /visitors/:id/check-out
Check out a visitor.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "visitor_id",
    "status": "checked-out",
    "checkOutTime": "2024-01-15T16:30:00Z",
    "checkedOutBy": "guard_id"
  },
  "message": "Visitor checked out successfully"
}
```

#### POST /visitors/:id/revoke
Revoke a visitor's access.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "visitor_id",
    "status": "revoked",
    "revokedAt": "2024-01-15T12:00:00Z",
    "revokedBy": "user_id"
  },
  "message": "Visitor access revoked successfully"
}
```

### Bulk Operations

#### POST /visitors/bulk
Create multiple visitor invitations.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "visitors": [
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "visitDate": "2024-01-15T10:00:00Z",
      "purpose": "Meeting"
    },
    {
      "name": "Bob Johnson",
      "email": "bob@example.com",
      "phone": "+1234567891",
      "visitDate": "2024-01-15T14:00:00Z",
      "purpose": "Interview"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": 2,
    "failed": 0,
    "visitors": [
      {
        "id": "visitor_id_1",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "status": "confirmed",
        "inviteCode": "ABC123"
      },
      {
        "id": "visitor_id_2",
        "name": "Bob Johnson",
        "email": "bob@example.com",
        "status": "confirmed",
        "inviteCode": "DEF456"
      }
    ]
  },
  "message": "Bulk visitor invitations created successfully"
}
```

### Guard Operations

#### GET /visitors/active
Get all currently active visitors (for guards).

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "visitor_id",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "status": "checked-in",
      "checkInTime": "2024-01-15T10:30:00Z",
      "hostId": "user_id",
      "hostName": "John Doe",
      "purpose": "Meeting"
    }
  ]
}
```

#### GET /visitors/upcoming
Get upcoming visitor appointments.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "visitor_id",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "status": "confirmed",
      "visitDate": "2024-01-15T14:00:00Z",
      "hostId": "user_id",
      "hostName": "John Doe",
      "purpose": "Meeting"
    }
  ]
}
```

#### GET /visitors/recent
Get recently checked-in visitors.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "visitor_id",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567890",
      "status": "checked-out",
      "checkInTime": "2024-01-15T10:30:00Z",
      "checkOutTime": "2024-01-15T16:30:00Z",
      "hostId": "user_id",
      "hostName": "John Doe"
    }
  ]
}
```

### Admin Operations

#### GET /admin/metrics
Get system metrics and statistics.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVisitors": 150,
    "activeVisitors": 12,
    "visitorsToday": 25,
    "visitorsThisWeek": 89,
    "visitorsThisMonth": 150,
    "checkInRate": 0.95,
    "averageVisitDuration": 120,
    "topHosts": [
      {
        "id": "user_id",
        "name": "John Doe",
        "visitorCount": 45
      }
    ],
    "visitorStatusBreakdown": {
      "confirmed": 8,
      "checkedIn": 12,
      "checkedOut": 125,
      "revoked": 5
    }
  }
}
```

#### GET /admin/audit-logs
Get system audit logs.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 25)
- `action` (optional): Filter by action type
- `userId` (optional): Filter by user ID
- `date` (optional): Filter by date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_id",
        "action": "visitor.check_in",
        "userId": "user_id",
        "entityType": "visitor",
        "entityId": "visitor_id",
        "details": {
          "visitorName": "Jane Smith",
          "checkInTime": "2024-01-15T10:30:00Z"
        },
        "ipAddress": "192.168.1.100",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 1000,
      "pages": 40
    }
  }
}
```

### WebSocket Events

#### Connection
```javascript
const ws = new WebSocket('ws://localhost:5003/api/ws/guards');
```

#### Events

##### visitor.check_in
```json
{
  "type": "visitor.check_in",
  "data": {
    "visitorId": "visitor_id",
    "visitorName": "Jane Smith",
    "checkInTime": "2024-01-15T10:30:00Z",
    "hostName": "John Doe"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

##### visitor.check_out
```json
{
  "type": "visitor.check_out",
  "data": {
    "visitorId": "visitor_id",
    "visitorName": "Jane Smith",
    "checkOutTime": "2024-01-15T16:30:00Z",
    "hostName": "John Doe"
  },
  "timestamp": "2024-01-15T16:30:00Z"
}
```

##### visitor.revoked
```json
{
  "type": "visitor.revoked",
  "data": {
    "visitorId": "visitor_id",
    "visitorName": "Jane Smith",
    "revokedAt": "2024-01-15T12:00:00Z",
    "revokedBy": "John Doe"
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

## Error Codes

### Authentication Errors
- `AUTH_INVALID_CREDENTIALS`: Invalid email or password
- `AUTH_TOKEN_EXPIRED`: JWT token has expired
- `AUTH_TOKEN_INVALID`: Invalid JWT token
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions

### Validation Errors
- `VALIDATION_REQUIRED_FIELD`: Required field is missing
- `VALIDATION_INVALID_EMAIL`: Invalid email format
- `VALIDATION_INVALID_PHONE`: Invalid phone number format
- `VALIDATION_INVALID_DATE`: Invalid date format

### Business Logic Errors
- `VISITOR_NOT_FOUND`: Visitor with specified ID not found
- `VISITOR_ALREADY_CHECKED_IN`: Visitor is already checked in
- `VISITOR_ALREADY_CHECKED_OUT`: Visitor is already checked out
- `VISITOR_ACCESS_REVOKED`: Visitor access has been revoked

### System Errors
- `INTERNAL_SERVER_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **General API**: 100 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **OTP Generation**: 5 requests per minute per IP

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with the following query parameters:

- `page`: Page number (1-based, default: 1)
- `limit`: Items per page (default: 25, max: 100)

Pagination information is included in the response:
```json
{
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "pages": 4,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering and Sorting

Many endpoints support filtering and sorting:

### Filtering
Use query parameters to filter results:
```
GET /visitors?status=confirmed&search=jane
```

### Sorting
Use the `sort` parameter with field and direction:
```
GET /visitors?sort=createdAt:desc
GET /visitors?sort=name:asc
```

## Webhooks

The API supports webhooks for real-time notifications:

### Webhook Events
- `visitor.created`
- `visitor.checked_in`
- `visitor.checked_out`
- `visitor.revoked`

### Webhook Payload
```json
{
  "event": "visitor.checked_in",
  "data": {
    "visitorId": "visitor_id",
    "visitorName": "Jane Smith",
    "checkInTime": "2024-01-15T10:30:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## SDK and Libraries

### JavaScript/TypeScript
```bash
npm install @securegateaccess/api-client
```

```javascript
import { SecureGateAPI } from '@securegateaccess/api-client';

const api = new SecureGateAPI({
  baseURL: 'https://api.securegateaccess.com/api',
  apiKey: 'your-api-key'
});

// Create a visitor
const visitor = await api.visitors.create({
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+1234567890',
  visitDate: '2024-01-15T10:00:00Z'
});
```

### Python
```bash
pip install securegateaccess-api
```

```python
from securegateaccess import SecureGateAPI

api = SecureGateAPI(
    base_url='https://api.securegateaccess.com/api',
    api_key='your-api-key'
)

# Create a visitor
visitor = api.visitors.create({
    'name': 'Jane Smith',
    'email': 'jane@example.com',
    'phone': '+1234567890',
    'visit_date': '2024-01-15T10:00:00Z'
})
```

## Testing

### Postman Collection
A Postman collection is available for testing the API:
- Download: [Secure Gate Access API.postman_collection.json](./Secure%20Gate%20Access%20API.postman_collection.json)
- Import into Postman
- Set up environment variables for base URL and authentication

### API Testing Tools
- **Postman**: GUI-based API testing
- **Insomnia**: Alternative API client
- **curl**: Command-line testing
- **HTTPie**: User-friendly command-line HTTP client

### Example curl Commands

#### Register a new user
```bash
curl -X POST https://api.securegateaccess.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "resident",
    "phone": "+1234567890"
  }'
```

#### Create a visitor
```bash
curl -X POST https://api.securegateaccess.com/api/visitors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "visitDate": "2024-01-15T10:00:00Z",
    "purpose": "Meeting"
  }'
```

## Support

For API support and questions:
- **Documentation**: [https://docs.securegateaccess.com](https://docs.securegateaccess.com)
- **Support Email**: api-support@securegateaccess.com
- **Status Page**: [https://status.securegateaccess.com](https://status.securegateaccess.com)
- **GitHub Issues**: [https://github.com/securegateaccess/api/issues](https://github.com/securegateaccess/api/issues)

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial API release
- Authentication endpoints
- Visitor management
- Guard operations
- Admin dashboard
- WebSocket support
- Rate limiting
- Comprehensive documentation

