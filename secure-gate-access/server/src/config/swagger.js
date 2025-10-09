/**
 * Swagger/OpenAPI Configuration
 * 
 * This module configures Swagger UI for API documentation
 * and generates OpenAPI 3.0 specification from JSDoc comments.
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Secure Gate Access Control System API',
    version: '1.0.0',
    description: `
# Secure Gate Access Control System API

A comprehensive access control system for residential buildings with visitor management, 
resident administration, and security monitoring capabilities.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Visitor Management**: Complete visitor lifecycle from invitation to check-out
- **Resident Administration**: Resident registration, management, and bulk operations
- **Security Monitoring**: Real-time security events, audit logs, and compliance reporting
- **Admin Dashboard**: Comprehensive admin interface with metrics and reporting
- **OTP System**: SMS-based OTP verification for visitor access
- **Rate Limiting**: Advanced rate limiting with different limits for different endpoints
- **Caching**: Redis-based caching for improved performance
- **Audit Logging**: Comprehensive audit trail for all operations

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 10 requests per 15 minutes per IP  
- **Visitor Creation**: 10 requests per 15 minutes per IP
- **OTP Operations**: 3 requests per minute per IP

## Error Handling

All endpoints return standardized error responses:

\`\`\`json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
\`\`\`

## Success Responses

All successful operations return standardized success responses:

\`\`\`json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2025-01-01T00:00:00.000Z"
}
\`\`\`
    `,
    contact: {
      name: 'Secure Gate Development Team',
      email: 'dev@securegate.com',
      url: 'https://securegate.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.API_BASE_URL || 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: 'https://api.securegate.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login endpoint'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for service-to-service authentication'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique user identifier'
          },
          username: {
            type: 'string',
            description: 'Username'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          role: {
            type: 'string',
            enum: ['admin', 'resident', 'guard'],
            description: 'User role'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'User creation timestamp'
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'User last update timestamp'
          }
        }
      },
      Visitor: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique visitor identifier'
          },
          name: {
            type: 'string',
            description: 'Visitor full name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Visitor email address'
          },
          phone: {
            type: 'string',
            description: 'Visitor phone number'
          },
          purpose: {
            type: 'string',
            description: 'Visit purpose'
          },
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'checked_in', 'checked_out'],
            description: 'Visitor status'
          },
          expected_arrival: {
            type: 'string',
            format: 'date-time',
            description: 'Expected arrival time'
          },
          actual_arrival: {
            type: 'string',
            format: 'date-time',
            description: 'Actual arrival time'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Visitor creation timestamp'
          }
        }
      },
      Resident: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique resident identifier'
          },
          name: {
            type: 'string',
            description: 'Resident full name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Resident email address'
          },
          phone: {
            type: 'string',
            description: 'Resident phone number'
          },
          unit: {
            type: 'string',
            description: 'Resident unit/apartment number'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Resident creation timestamp'
          }
        }
      },
      Guard: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Unique guard identifier'
          },
          name: {
            type: 'string',
            description: 'Guard full name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Guard email address'
          },
          phone: {
            type: 'string',
            description: 'Guard phone number'
          },
          badge_number: {
            type: 'string',
            description: 'Guard badge number'
          },
          shift: {
            type: 'string',
            enum: ['morning', 'afternoon', 'night'],
            description: 'Guard shift'
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Guard creation timestamp'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            description: 'Error message'
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code'
              },
              details: {
                type: 'object',
                description: 'Additional error details'
              }
            }
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Error timestamp'
          }
        }
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            description: 'Success message'
          },
          data: {
            type: 'object',
            description: 'Response data'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Response timestamp'
          }
        }
      }
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10
        }
      },
      SortParam: {
        name: 'sort',
        in: 'query',
        description: 'Sort field',
        schema: {
          type: 'string'
        }
      },
      OrderParam: {
        name: 'order',
        in: 'query',
        description: 'Sort order',
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc'
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Authentication required',
              error: {
                code: 'AUTH_TOKEN_MISSING'
              },
              timestamp: '2025-01-01T00:00:00.000Z'
            }
          }
        }
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Insufficient permissions',
              error: {
                code: 'FORBIDDEN'
              },
              timestamp: '2025-01-01T00:00:00.000Z'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Resource not found',
              error: {
                code: 'NOT_FOUND'
              },
              timestamp: '2025-01-01T00:00:00.000Z'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Validation failed',
              error: {
                code: 'VALIDATION_ERROR',
                details: {
                  field: 'email',
                  message: 'Invalid email format'
                }
              },
              timestamp: '2025-01-01T00:00:00.000Z'
            }
          }
        }
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Too many requests, please try again later',
              error: {
                code: 'RATE_LIMIT_EXCEEDED'
              },
              timestamp: '2025-01-01T00:00:00.000Z'
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints'
    },
    {
      name: 'Admin',
      description: 'Administrative functions and user management'
    },
    {
      name: 'Visitors',
      description: 'Visitor management and invitation system'
    },
    {
      name: 'Residents',
      description: 'Resident management and administration'
    },
    {
      name: 'Guards',
      description: 'Security guard management and operations'
    },
    {
      name: 'Security',
      description: 'Security monitoring and audit functions'
    },
    {
      name: 'Cache',
      description: 'Cache management and statistics'
    },
    {
      name: 'Health',
      description: 'System health and monitoring endpoints'
    }
  ]
};

// Swagger options
const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    join(__dirname, '../routes/*.js'),
    join(__dirname, '../controllers/*.js'),
    join(__dirname, '../middleware/*.js')
  ]
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI options
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #2c3e50; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 4px; }
  `,
  customSiteTitle: 'Secure Gate API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

// Swagger middleware
const swaggerMiddleware = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(swaggerSpec, swaggerUiOptions)
};

export { swaggerSpec, swaggerMiddleware };
export default swaggerMiddleware;




