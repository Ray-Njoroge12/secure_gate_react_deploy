/**
 * Contract Testing Utilities
 * ==========================
 * 
 * Comprehensive utilities for API contract testing using:
 * 1. JSON Schema validation derived from OpenAPI spec
 * 2. Consumer-driven contract testing (Pact-style)
 * 3. Provider verification
 * 
 * Purpose: Ensure API compatibility between frontend and backend
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Joi from 'joi';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// OpenAPI Schema Parser
// ============================================================================

export class OpenAPISchemaParser {
  constructor(specPath) {
    this.specPath = specPath;
    this.spec = null;
  }

  /**
   * Load and parse the OpenAPI specification
   */
  load() {
    const content = fs.readFileSync(this.specPath, 'utf8');
    this.spec = yaml.load(content);
    return this;
  }

  /**
   * Get all defined paths
   */
  getPaths() {
    return Object.keys(this.spec.paths || {});
  }

  /**
   * Get schema for a specific path and method
   */
  getEndpointSchema(path, method) {
    const endpoint = this.spec.paths?.[path]?.[method.toLowerCase()];
    if (!endpoint) return null;

    return {
      path,
      method: method.toUpperCase(),
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      tags: endpoint.tags,
      security: endpoint.security,
      requestBody: this.resolveSchema(endpoint.requestBody?.content?.['application/json']?.schema),
      responses: this.extractResponses(endpoint.responses),
      parameters: endpoint.parameters?.map(p => ({
        name: p.name,
        in: p.in,
        required: p.required,
        schema: this.resolveSchema(p.schema),
      })),
    };
  }

  /**
   * Resolve $ref schemas
   */
  resolveSchema(schema) {
    if (!schema) return null;
    
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/', '').split('/');
      let resolved = this.spec;
      for (const part of refPath) {
        resolved = resolved[part];
      }
      return this.resolveSchema(resolved);
    }

    // Resolve nested schemas
    if (schema.properties) {
      const resolved = { ...schema, properties: {} };
      for (const [key, value] of Object.entries(schema.properties)) {
        resolved.properties[key] = this.resolveSchema(value);
      }
      return resolved;
    }

    if (schema.items) {
      return { ...schema, items: this.resolveSchema(schema.items) };
    }

    return schema;
  }

  /**
   * Extract response schemas
   */
  extractResponses(responses) {
    const result = {};
    
    if (!responses) return result;

    for (const [code, response] of Object.entries(responses)) {
      result[code] = {
        description: response.description,
        schema: this.resolveSchema(response.content?.['application/json']?.schema),
      };
    }

    return result;
  }

  /**
   * Get all endpoint schemas
   */
  getAllEndpoints() {
    const endpoints = [];
    
    for (const [path, methods] of Object.entries(this.spec.paths || {})) {
      for (const method of Object.keys(methods)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          endpoints.push(this.getEndpointSchema(path, method));
        }
      }
    }

    return endpoints;
  }
}

// ============================================================================
// Joi Schema Generator (from OpenAPI)
// ============================================================================

export class JoiSchemaGenerator {
  /**
   * Convert OpenAPI schema to Joi schema
   */
  toJoi(openApiSchema) {
    if (!openApiSchema) return Joi.any();

    switch (openApiSchema.type) {
      case 'string':
        return this.stringToJoi(openApiSchema);
      case 'integer':
      case 'number':
        return this.numberToJoi(openApiSchema);
      case 'boolean':
        return Joi.boolean();
      case 'array':
        return this.arrayToJoi(openApiSchema);
      case 'object':
        return this.objectToJoi(openApiSchema);
      default:
        if (openApiSchema.properties) {
          return this.objectToJoi(openApiSchema);
        }
        return Joi.any();
    }
  }

  stringToJoi(schema) {
    let joiSchema = Joi.string();

    if (schema.format === 'email') {
      joiSchema = joiSchema.email();
    }
    if (schema.format === 'date') {
      joiSchema = joiSchema.isoDate();
    }
    if (schema.format === 'date-time') {
      joiSchema = joiSchema.isoDate();
    }
    if (schema.minLength) {
      joiSchema = joiSchema.min(schema.minLength);
    }
    if (schema.maxLength) {
      joiSchema = joiSchema.max(schema.maxLength);
    }
    if (schema.enum) {
      joiSchema = joiSchema.valid(...schema.enum);
    }
    if (schema.pattern) {
      joiSchema = joiSchema.pattern(new RegExp(schema.pattern));
    }

    return joiSchema;
  }

  numberToJoi(schema) {
    let joiSchema = Joi.number();

    if (schema.type === 'integer') {
      joiSchema = joiSchema.integer();
    }
    if (schema.minimum !== undefined) {
      joiSchema = joiSchema.min(schema.minimum);
    }
    if (schema.maximum !== undefined) {
      joiSchema = joiSchema.max(schema.maximum);
    }

    return joiSchema;
  }

  arrayToJoi(schema) {
    let joiSchema = Joi.array();

    if (schema.items) {
      joiSchema = joiSchema.items(this.toJoi(schema.items));
    }
    if (schema.minItems) {
      joiSchema = joiSchema.min(schema.minItems);
    }
    if (schema.maxItems) {
      joiSchema = joiSchema.max(schema.maxItems);
    }

    return joiSchema;
  }

  objectToJoi(schema) {
    const properties = {};
    const requiredFields = schema.required || [];

    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        let propSchema = this.toJoi(value);
        if (requiredFields.includes(key)) {
          propSchema = propSchema.required();
        }
        properties[key] = propSchema;
      }
    }

    return Joi.object(properties);
  }
}

// ============================================================================
// Contract Definitions
// ============================================================================

const StandardErrorContract = Joi.object({
  success: Joi.boolean().valid(false).required(),
  message: Joi.string().required(),
  error: Joi.object({
    code: Joi.string().required(),
    details: Joi.object().optional(),
    requestId: Joi.string().optional(),
  }).required(),
  timestamp: Joi.string().isoDate().required(),
});

export const Contracts = {
  Security: {
    StandardError: StandardErrorContract,
    AdminBulkApproveEstateScope: {
      request: Joi.object({
        userIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(50).required(),
        estateId: Joi.number().integer().positive().optional(),
      }),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          message: Joi.string().required(),
          data: Joi.object({
            approved: Joi.array().items(Joi.object()).required(),
            count: Joi.number().integer().required(),
            requested: Joi.number().integer().required(),
          }).required(),
        }),
        403: Joi.object({
          success: Joi.boolean().valid(false).required(),
          message: Joi.string().valid('Estate context required').required(),
        }),
      },
    },
    AdminBulkRejectEstateScope: {
      request: Joi.object({
        userIds: Joi.array().items(Joi.number().integer().positive()).min(1).max(50).required(),
        reason: Joi.string().optional(),
      }),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          message: Joi.string().required(),
          data: Joi.object({
            rejected: Joi.array().items(Joi.object()).required(),
            count: Joi.number().integer().required(),
          }).required(),
        }),
        403: Joi.object({
          success: Joi.boolean().valid(false).required(),
          message: Joi.string().valid('Estate context required').required(),
        }),
      },
    },
    QRRegenerate: {
      request: Joi.object({
        visitorId: Joi.number().integer().positive().required(),
      }),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          data: Joi.object({
            message: Joi.string().valid('QR code regenerated successfully').required(),
            data: Joi.object({
              qrCode: Joi.string().required(),
            }).required(),
          }).required(),
        }),
        400: StandardErrorContract,
        401: StandardErrorContract,
        403: StandardErrorContract,
        404: StandardErrorContract,
      },
    },
    SetupBootstrapMigrate: {
      request: Joi.object({
        secret: Joi.string().required(),
      }),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          message: Joi.string().valid('Database migrations completed').required(),
          stats: Joi.object({
            total: Joi.number().integer().required(),
            applied: Joi.number().integer().required(),
            skipped: Joi.number().integer().required(),
          }).required(),
          logs: Joi.array().items(Joi.string()).required(),
        }),
        403: StandardErrorContract,
        500: StandardErrorContract,
      },
    },
    MFADisable: {
      request: Joi.object({
        password: Joi.string().required(),
        token: Joi.string().required(),
      }),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          message: Joi.string().valid('MFA disabled successfully').required(),
        }),
        400: StandardErrorContract,
        401: StandardErrorContract,
      },
    },
  },

  // Authentication Contracts
  Authentication: {
    Register: {
      request: Joi.object({
        username: Joi.string().min(3).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        role: Joi.string().valid('resident', 'guard', 'admin').required(),
        area: Joi.string().optional(),
        phone: Joi.string().optional(),
        house: Joi.string().optional(),
      }),
      response: {
        201: Joi.object({
          success: Joi.boolean().valid(true).required(),
          message: Joi.string().optional(),
          data: Joi.object().optional(),
        }),
        400: Joi.object({
          success: Joi.boolean().valid(false).required(),
          error: Joi.string().required(),
          message: Joi.string().optional(),
        }),
      },
    },
    Login: {
      request: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
        remember: Joi.boolean().optional(),
      }),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          token: Joi.string().required(),
          role: Joi.string().valid('resident', 'guard', 'admin').required(),
          user: Joi.object({
            id: Joi.number().integer().required(),
            username: Joi.string().required(),
            email: Joi.string().email().required(),
            role: Joi.string().required(),
            area: Joi.string().allow(null).optional(),
            phone: Joi.string().allow(null).optional(),
            house: Joi.string().allow(null).optional(),
            verified: Joi.boolean().optional(),
          }).required(),
        }),
        401: Joi.object({
          success: Joi.boolean().valid(false).required(),
          error: Joi.string().required(),
        }),
      },
    },
    Logout: {
      request: Joi.object({}),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          message: Joi.string().optional(),
        }),
      },
    },
  },

  // Visitor Management Contracts
  Visitors: {
    Create: {
      request: Joi.object({
        name: Joi.string().required(),
        phone: Joi.string().required(),
        email: Joi.string().email().optional(),
        id_number: Joi.string().optional(),
        vehicle_plate: Joi.string().optional(),
        date_of_visit: Joi.string().isoDate().required(),
        time: Joi.string().required(),
        purpose: Joi.string().required(),
      }),
      response: {
        201: Joi.object({
          success: Joi.boolean().valid(true).required(),
          data: Joi.object({
            id: Joi.number().integer().required(),
            name: Joi.string().required(),
            phone: Joi.string().required(),
            email: Joi.string().allow(null).optional(),
            status: Joi.string().valid('PENDING', 'CONFIRMED', 'ON_PREMISE', 'EXITED', 'REVOKED', 'EXPIRED').required(),
            date_of_visit: Joi.string().required(),
            time: Joi.string().required(),
            purpose: Joi.string().required(),
            otp: Joi.string().optional(),
            created_at: Joi.string().optional(),
          }).required(),
        }),
      },
    },
    List: {
      request: Joi.object({
        limit: Joi.number().integer().min(1).max(100).optional(),
        offset: Joi.number().integer().min(0).optional(),
        status: Joi.string().valid('PENDING', 'CONFIRMED', 'ON_PREMISE', 'EXITED', 'REVOKED', 'EXPIRED').optional(),
      }),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          data: Joi.array().items(
            Joi.object({
              id: Joi.number().integer().required(),
              name: Joi.string().required(),
              phone: Joi.string().required(),
              status: Joi.string().required(),
              date_of_visit: Joi.string().required(),
            })
          ).required(),
        }),
      },
    },
    CheckIn: {
      request: Joi.object({}),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          data: Joi.object({
            id: Joi.number().integer().required(),
            status: Joi.string().valid('ON_PREMISE').required(),
            check_in_time: Joi.string().isoDate().required(),
            already_checked_in: Joi.boolean().optional(),
          }).required(),
        }),
      },
    },
    CheckOut: {
      request: Joi.object({}),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          data: Joi.object({
            id: Joi.number().integer().required(),
            status: Joi.string().valid('EXITED').required(),
            check_out_time: Joi.string().isoDate().required(),
            already_checked_out: Joi.boolean().optional(),
          }).required(),
        }),
      },
    },
    Revoke: {
      request: Joi.object({}),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          data: Joi.object({
            id: Joi.number().integer().required(),
            status: Joi.string().valid('REVOKED').required(),
          }).required(),
        }),
      },
    },
  },

  // OTP Contracts
  OTP: {
    Verify: {
      request: Joi.object({
        otp: Joi.string().length(6).required(),
      }),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          message: Joi.string().optional(),
        }),
        400: Joi.object({
          success: Joi.boolean().valid(false).required(),
          error: Joi.string().required(),
        }),
      },
    },
    Resend: {
      request: Joi.object({}),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          message: Joi.string().optional(),
        }),
        429: Joi.object({
          success: Joi.boolean().valid(false).required(),
          error: Joi.string().required(),
        }),
      },
    },
  },

  // Bulk Invite Contracts
  BulkInvite: {
    Create: {
      request: Joi.object({
        event_name: Joi.string().required(),
        date: Joi.string().isoDate().required(),
        time: Joi.string().required(),
        num_guests: Joi.number().integer().min(1).max(50).required(),
      }),
      response: {
        201: Joi.object({
          success: Joi.boolean().valid(true).required(),
          data: Joi.object({
            id: Joi.number().integer().required(),
            invite_code: Joi.string().required(),
            event_name: Joi.string().required(),
            date: Joi.string().required(),
            num_guests: Joi.number().integer().required(),
            status: Joi.string().valid('ACTIVE', 'EXPIRED', 'CANCELLED').required(),
          }).required(),
        }),
      },
    },
    CompleteRegistration: {
      request: Joi.object({
        name: Joi.string().required(),
        phone: Joi.string().required(),
        email: Joi.string().email().required(),
        id_number: Joi.string().optional(),
        vehicle_plate: Joi.string().optional(),
        expected_time: Joi.string().optional(),
      }),
      response: {
        201: Joi.object({
          success: Joi.boolean().valid(true).required(),
          visitor: Joi.object().required(),
          otp_issued: Joi.boolean().optional(),
          otp_ttl_minutes: Joi.number().integer().optional(),
        }),
      },
    },
  },

  // Admin Contracts
  Admin: {
    Metrics: {
      request: Joi.object({}),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          data: Joi.object({
            visitors: Joi.object().optional(),
            performance: Joi.object().optional(),
            system: Joi.object().optional(),
          }).required(),
        }),
      },
    },
    AuditLogs: {
      request: Joi.object({
        limit: Joi.number().integer().min(1).max(100).optional(),
        offset: Joi.number().integer().min(0).optional(),
      }),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          data: Joi.array().items(Joi.object()).required(),
        }),
      },
    },
    UpdateSettings: {
      request: Joi.object({
        setting_key: Joi.string().required(),
        setting_value: Joi.string().required(),
      }),
      response: {
        200: Joi.object({
          success: Joi.boolean().valid(true).required(),
          message: Joi.string().optional(),
        }),
      },
    },
  },

  // Pass Generation Contracts
  Pass: {
    Generate: {
      request: Joi.object({}),
      response: {
        201: Joi.object({
          success: Joi.boolean().valid(true).required(),
          data: Joi.object({
            id: Joi.number().integer().required(),
            visitor_id: Joi.number().integer().required(),
            qr_code: Joi.string().required(),
            access_code: Joi.string().required(),
            expires_at: Joi.string().isoDate().required(),
            is_active: Joi.boolean().required(),
          }).required(),
        }),
      },
    },
  },

  // Common Response Contracts
  Common: {
    ApiResponse: Joi.object({
      success: Joi.boolean().required(),
      message: Joi.string().optional(),
      data: Joi.any().optional(),
      code: Joi.number().integer().optional(),
    }),
    ErrorResponse: Joi.object({
      success: Joi.boolean().valid(false).required(),
      error: Joi.string().required(),
      message: Joi.string().optional(),
      code: Joi.number().integer().optional(),
    }),
    PaginatedResponse: Joi.object({
      success: Joi.boolean().valid(true).required(),
      data: Joi.array().required(),
      pagination: Joi.object({
        total: Joi.number().integer().optional(),
        limit: Joi.number().integer().optional(),
        offset: Joi.number().integer().optional(),
        hasMore: Joi.boolean().optional(),
      }).optional(),
    }),
  },
};

// ============================================================================
// Contract Validator
// ============================================================================

export class ContractValidator {
  constructor(contracts = Contracts) {
    this.contracts = contracts;
    this.results = [];
  }

  /**
   * Validate a request against a contract
   */
  validateRequest(contractPath, data) {
    const contract = this.getContract(contractPath);
    if (!contract?.request) {
      return { valid: false, error: `No request contract found: ${contractPath}` };
    }

    const { error, value } = contract.request.validate(data, { abortEarly: false });
    
    return {
      valid: !error,
      value,
      errors: error?.details?.map(d => ({
        path: d.path.join('.'),
        message: d.message,
        type: d.type,
      })),
    };
  }

  /**
   * Validate a response against a contract
   */
  validateResponse(contractPath, statusCode, data) {
    const contract = this.getContract(contractPath);
    const responseContract = contract?.response?.[statusCode];
    
    if (!responseContract) {
      return { valid: false, error: `No response contract found: ${contractPath}[${statusCode}]` };
    }

    const { error, value } = responseContract.validate(data, { abortEarly: false });
    
    return {
      valid: !error,
      value,
      errors: error?.details?.map(d => ({
        path: d.path.join('.'),
        message: d.message,
        type: d.type,
      })),
    };
  }

  /**
   * Get contract by dot-notation path
   */
  getContract(path) {
    const parts = path.split('.');
    let current = this.contracts;
    
    for (const part of parts) {
      current = current?.[part];
    }
    
    return current;
  }

  /**
   * Run all contract validations for an endpoint
   */
  validateEndpoint(contractPath, request, response, statusCode) {
    const result = {
      contractPath,
      request: this.validateRequest(contractPath, request),
      response: this.validateResponse(contractPath, statusCode, response),
      timestamp: new Date().toISOString(),
    };

    result.passed = result.request.valid && result.response.valid;
    this.results.push(result);

    return result;
  }

  /**
   * Get validation summary
   */
  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? (passed / total) * 100 : 0,
      failures: this.results.filter(r => !r.passed).map(r => ({
        contractPath: r.contractPath,
        requestErrors: r.request.errors,
        responseErrors: r.response.errors,
      })),
    };
  }

  /**
   * Clear results
   */
  clearResults() {
    this.results = [];
  }
}

// ============================================================================
// Consumer Contract Store (Pact-style)
// ============================================================================

export class ConsumerContractStore {
  constructor(storePath) {
    this.storePath = storePath;
    this.contracts = [];
    this.ensureDirectory();
  }

  ensureDirectory() {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Add a consumer interaction (Pact-style)
   */
  addInteraction(interaction) {
    this.contracts.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...interaction,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Define an expected interaction
   */
  expectRequest(consumer, provider) {
    return {
      uponReceiving: (description) => ({
        withRequest: (request) => ({
          willRespondWith: (response) => {
            this.addInteraction({
              consumer,
              provider,
              description,
              request,
              response,
            });
          },
        }),
      }),
    };
  }

  /**
   * Save contracts to file
   */
  save() {
    const pactContent = {
      consumer: { name: 'SecureGate Frontend' },
      provider: { name: 'SecureGate API' },
      interactions: this.contracts,
      metadata: {
        pactSpecification: { version: '3.0.0' },
        generatedAt: new Date().toISOString(),
      },
    };

    fs.writeFileSync(this.storePath, JSON.stringify(pactContent, null, 2));
  }

  /**
   * Load contracts from file
   */
  load() {
    if (fs.existsSync(this.storePath)) {
      const content = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
      this.contracts = content.interactions || [];
    }
    return this.contracts;
  }

  /**
   * Verify provider against contracts
   */
  async verifyProvider(providerFn) {
    const results = [];

    for (const contract of this.contracts) {
      try {
        const response = await providerFn(contract.request);
        
        const matches = this.matchResponse(response, contract.response);
        
        results.push({
          description: contract.description,
          passed: matches.passed,
          errors: matches.errors,
        });
      } catch (error) {
        results.push({
          description: contract.description,
          passed: false,
          errors: [error.message],
        });
      }
    }

    return results;
  }

  /**
   * Match actual response against expected
   */
  matchResponse(actual, expected) {
    const errors = [];

    // Check status
    if (expected.status && actual.status !== expected.status) {
      errors.push(`Status mismatch: expected ${expected.status}, got ${actual.status}`);
    }

    // Check headers
    if (expected.headers) {
      for (const [key, value] of Object.entries(expected.headers)) {
        if (actual.headers?.[key] !== value) {
          errors.push(`Header mismatch: ${key}`);
        }
      }
    }

    // Check body (basic matching)
    if (expected.body) {
      const bodyErrors = this.matchBody(actual.body, expected.body);
      errors.push(...bodyErrors);
    }

    return {
      passed: errors.length === 0,
      errors,
    };
  }

  /**
   * Match body structure
   */
  matchBody(actual, expected, path = '') {
    const errors = [];

    if (typeof expected !== typeof actual) {
      errors.push(`Type mismatch at ${path || 'root'}`);
      return errors;
    }

    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        errors.push(`Expected array at ${path || 'root'}`);
      }
    } else if (typeof expected === 'object' && expected !== null) {
      for (const key of Object.keys(expected)) {
        const newPath = path ? `${path}.${key}` : key;
        if (!(key in actual)) {
          errors.push(`Missing field: ${newPath}`);
        } else {
          errors.push(...this.matchBody(actual[key], expected[key], newPath));
        }
      }
    }

    return errors;
  }
}

// ============================================================================
// API Contract Test Runner
// ============================================================================

export class ContractTestRunner {
  constructor(baseUrl, contracts = Contracts) {
    this.baseUrl = baseUrl;
    this.validator = new ContractValidator(contracts);
    this.results = [];
  }

  /**
   * Test an endpoint
   */
  async testEndpoint(config) {
    const {
      contractPath,
      method,
      path,
      requestBody,
      queryParams,
      headers = {},
      expectedStatus,
    } = config;

    try {
      // Validate request against contract
      const requestValidation = this.validator.validateRequest(
        contractPath, 
        requestBody || queryParams || {}
      );

      // Make the actual request (mock for testing framework)
      const response = await this.makeRequest({
        method,
        path,
        body: requestBody,
        query: queryParams,
        headers,
      });

      // Validate response against contract
      const responseValidation = this.validator.validateResponse(
        contractPath,
        response.status,
        response.body
      );

      const result = {
        contractPath,
        endpoint: `${method} ${path}`,
        request: {
          valid: requestValidation.valid,
          errors: requestValidation.errors,
        },
        response: {
          status: response.status,
          valid: responseValidation.valid,
          errors: responseValidation.errors,
        },
        passed: requestValidation.valid && responseValidation.valid,
        timestamp: new Date().toISOString(),
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const result = {
        contractPath,
        endpoint: `${method} ${path}`,
        passed: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      this.results.push(result);
      return result;
    }
  }

  /**
   * Make HTTP request (to be overridden or mocked in tests)
   */
  async makeRequest(config) {
    // This is a placeholder - actual implementation uses supertest or fetch
    throw new Error('makeRequest must be implemented or mocked');
  }

  /**
   * Run all contract tests
   */
  async runAll(testCases) {
    for (const testCase of testCases) {
      await this.testEndpoint(testCase);
    }

    return this.getReport();
  }

  /**
   * Get test report
   */
  getReport() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;

    return {
      summary: {
        total,
        passed,
        failed: total - passed,
        passRate: total > 0 ? ((passed / total) * 100).toFixed(2) + '%' : '0%',
      },
      results: this.results,
      failures: this.results.filter(r => !r.passed),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport() {
    const report = this.getReport();
    
    let md = `# API Contract Test Report\n\n`;
    md += `**Generated:** ${report.generatedAt}\n\n`;
    
    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Tests | ${report.summary.total} |\n`;
    md += `| Passed | ${report.summary.passed} |\n`;
    md += `| Failed | ${report.summary.failed} |\n`;
    md += `| Pass Rate | ${report.summary.passRate} |\n\n`;

    if (report.failures.length > 0) {
      md += `## Failures\n\n`;
      report.failures.forEach(f => {
        md += `### ${f.endpoint}\n`;
        md += `**Contract:** ${f.contractPath}\n\n`;
        if (f.error) {
          md += `**Error:** ${f.error}\n\n`;
        }
        if (f.request?.errors) {
          md += `**Request Errors:**\n`;
          f.request.errors.forEach(e => {
            md += `- ${e.path}: ${e.message}\n`;
          });
          md += '\n';
        }
        if (f.response?.errors) {
          md += `**Response Errors:**\n`;
          f.response.errors.forEach(e => {
            md += `- ${e.path}: ${e.message}\n`;
          });
          md += '\n';
        }
      });
    }

    md += `## All Results\n\n`;
    md += `| Endpoint | Contract | Status | Result |\n`;
    md += `|----------|----------|--------|--------|\n`;
    report.results.forEach(r => {
      const icon = r.passed ? '✅' : '❌';
      md += `| ${r.endpoint} | ${r.contractPath} | ${r.response?.status || 'N/A'} | ${icon} |\n`;
    });

    return md;
  }
}

export default {
  OpenAPISchemaParser,
  JoiSchemaGenerator,
  Contracts,
  ContractValidator,
  ConsumerContractStore,
  ContractTestRunner,
};
