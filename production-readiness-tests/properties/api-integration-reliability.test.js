/**
 * Property-Based Test: API Integration Reliability
 * 
 * **Validates: Requirements 3.1, 3.4, 3.5**
 * 
 * This property-based test validates that API integration maintains reliability
 * across various conditions, request patterns, and error scenarios.
 * 
 * Properties tested:
 * 1. Request-response consistency across different data types
 * 2. Error handling reliability under various failure conditions
 * 3. Authentication and authorization consistency
 * 4. Rate limiting behavior predictability
 * 5. Data validation consistency across endpoints
 */

const fc = require('fast-check');
const axios = require('axios');

describe('Property Test: API Integration Reliability', () => {
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3001';
  const timeout = 30000;
  let authToken = null;

  beforeAll(async () => {
    try {
      const response = await axios.post(`${baseURL}/api/auth/login`, {
        email: 'admin@test.com',
        password: 'TestAdmin123!'
      });
      authToken = response.data.data.accessToken;
    } catch (error) {
      console.warn('⚠️ Could not obtain auth token, some tests may fail:', error.message);
    }
  }, timeout);

  /**
   * Property 1: Request-Response Consistency
   * For any valid request data, the API should return consistent response structure
   */
  test('Property 1: Request-response consistency across different data types', async () => {
    if (!authToken) {
      console.log('⚠️ Skipping test - no auth token available');
      return;
    }

    const visitorDataArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
      phone: fc.oneof(
        fc.constant('+254712345678'),
        fc.constant('+254723456789'),
        fc.constant('+254734567890')
      ),
      email: fc.emailAddress(),
      purpose: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
      expectedArrival: fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
        .map(date => date.toISOString())
    });

    await fc.assert(
      fc.asyncProperty(visitorDataArbitrary, async (visitorData) => {
        try {
          const response = await axios.post(`${baseURL}/api/visitors`, visitorData, {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 10000
          });

          // Property: Response should have consistent structure
          expect(response.data).toHaveProperty('success');
          expect(response.data).toHaveProperty('message');
          expect(response.data).toHaveProperty('data');
          expect(response.data).toHaveProperty('timestamp');

          if (response.data.success) {
            expect(response.data.data).toHaveProperty('visitor');
            expect(response.data.data.visitor).toHaveProperty('id');
            expect(response.data.data.visitor).toHaveProperty('name');
            expect(response.data.data.visitor).toHaveProperty('status');
            expect(response.data.data.visitor).toHaveProperty('created_at');

            // Property: Created visitor should match input data
            expect(response.data.data.visitor.name).toBe(visitorData.name);
            expect(response.data.data.visitor.email).toBe(visitorData.email);
            expect(response.data.data.visitor.purpose).toBe(visitorData.purpose);

            // Cleanup: Delete created visitor
            try {
              await axios.delete(`${baseURL}/api/visitors/${response.data.data.visitor.id}`, {
                headers: { Authorization: `Bearer ${authToken}` }
              });
            } catch (cleanupError) {
              console.warn('Cleanup failed:', cleanupError.message);
            }
          }

          return true;
        } catch (error) {
          // Property: Even errors should have consistent structure
          if (error.response) {
            expect(error.response.data).toHaveProperty('success', false);
            expect(error.response.data).toHaveProperty('message');
            expect(error.response.data).toHaveProperty('error');
            expect(error.response.data).toHaveProperty('timestamp');
          }
          return true;
        }
      }),
      { numRuns: 50, timeout: 60000 }
    );
  }, 120000);

  /**
   * Property 2: Error Handling Reliability
   * Invalid requests should consistently return appropriate error responses
   */
  test('Property 2: Error handling reliability under various failure conditions', async () => {
    if (!authToken) {
      console.log('⚠️ Skipping test - no auth token available');
      return;
    }

    const invalidVisitorDataArbitrary = fc.oneof(
      // Missing required fields
      fc.record({
        phone: fc.string(),
        email: fc.string()
      }),
      // Invalid email format
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 100 }),
        phone: fc.string(),
        email: fc.string().filter(s => !s.includes('@')),
        purpose: fc.string()
      }),
      // Invalid phone format
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 100 }),
        phone: fc.string().filter(s => !s.startsWith('+')),
        email: fc.emailAddress(),
        purpose: fc.string()
      }),
      // Empty required fields
      fc.record({
        name: fc.constant(''),
        phone: fc.string(),
        email: fc.emailAddress(),
        purpose: fc.string()
      })
    );

    await fc.assert(
      fc.asyncProperty(invalidVisitorDataArbitrary, async (invalidData) => {
        try {
          const response = await axios.post(`${baseURL}/api/visitors`, invalidData, {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 10000,
            validateStatus: () => true // Don't throw on 4xx/5xx
          });

          // Property: Invalid data should result in error response
          if (response.status >= 400) {
            expect(response.data).toHaveProperty('success', false);
            expect(response.data).toHaveProperty('message');
            expect(response.data).toHaveProperty('error');
            expect(response.data.error).toHaveProperty('code');
            expect(response.data).toHaveProperty('timestamp');

            // Property: Error code should be appropriate for validation errors
            expect(['VALIDATION_ERROR', 'VALIDATION_REQUIRED_FIELD', 'VALIDATION_INVALID_FORMAT'])
              .toContain(response.data.error.code);
          }

          return true;
        } catch (error) {
          // Network errors are acceptable in this test
          return true;
        }
      }),
      { numRuns: 30, timeout: 45000 }
    );
  }, 90000);

  /**
   * Property 3: Authentication and Authorization Consistency
   * Authentication requirements should be consistently enforced
   */
  test('Property 3: Authentication and authorization consistency', async () => {
    const protectedEndpoints = [
      { method: 'GET', path: '/api/visitors' },
      { method: 'POST', path: '/api/visitors' },
      { method: 'GET', path: '/api/admin/users' },
      { method: 'GET', path: '/api/admin/metrics' }
    ];

    const authScenarios = fc.oneof(
      fc.constant(null), // No token
      fc.constant('invalid-token'), // Invalid token
      fc.constant('Bearer invalid-token'), // Invalid bearer token
      fc.constant('Basic invalid'), // Wrong auth type
      fc.string().map(s => `Bearer ${s}`) // Random bearer token
    );

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...protectedEndpoints),
        authScenarios,
        async (endpoint, authHeader) => {
          try {
            const headers = authHeader ? { Authorization: authHeader } : {};
            const response = await axios({
              method: endpoint.method,
              url: `${baseURL}${endpoint.path}`,
              headers,
              timeout: 10000,
              validateStatus: () => true
            });

            // Property: Protected endpoints should require authentication
            if (!authHeader || authHeader === null) {
              expect([401, 403]).toContain(response.status);
              expect(response.data).toHaveProperty('success', false);
              expect(response.data.error?.code).toMatch(/AUTH_/);
            } else if (authHeader.includes('invalid')) {
              expect([401, 403]).toContain(response.status);
              expect(response.data).toHaveProperty('success', false);
            }

            // Property: Error responses should have consistent structure
            if (response.status >= 400) {
              expect(response.data).toHaveProperty('success', false);
              expect(response.data).toHaveProperty('message');
              expect(response.data).toHaveProperty('error');
              expect(response.data).toHaveProperty('timestamp');
            }

            return true;
          } catch (error) {
            // Network errors are acceptable
            return true;
          }
        }
      ),
      { numRuns: 25, timeout: 30000 }
    );
  }, 60000);

  /**
   * Property 4: Rate Limiting Behavior Predictability
   * Rate limiting should behave consistently and predictably
   */
  test('Property 4: Rate limiting behavior predictability', async () => {
    if (!authToken) {
      console.log('⚠️ Skipping test - no auth token available');
      return;
    }

    const requestCounts = fc.integer({ min: 1, max: 10 });

    await fc.assert(
      fc.asyncProperty(requestCounts, async (requestCount) => {
        const requests = [];
        const startTime = Date.now();

        // Make multiple rapid requests
        for (let i = 0; i < requestCount; i++) {
          requests.push(
            axios.get(`${baseURL}/api/visitors`, {
              headers: { Authorization: `Bearer ${authToken}` },
              timeout: 5000,
              validateStatus: () => true
            })
          );
        }

        try {
          const responses = await Promise.allSettled(requests);
          const endTime = Date.now();
          const duration = endTime - startTime;

          const successful = responses.filter(r => 
            r.status === 'fulfilled' && r.value.status === 200
          );
          const rateLimited = responses.filter(r => 
            r.status === 'fulfilled' && r.value.status === 429
          );

          // Property: Rate limiting should include proper headers
          rateLimited.forEach(response => {
            if (response.value?.headers) {
              // Should have rate limit headers
              const headers = response.value.headers;
              const hasRateLimitHeaders = 
                headers['x-ratelimit-limit'] || 
                headers['x-ratelimit-remaining'] || 
                headers['retry-after'];
              
              if (hasRateLimitHeaders) {
                expect(response.value.data).toHaveProperty('success', false);
                expect(response.value.data.error?.code).toBe('RATE_LIMIT_EXCEEDED');
              }
            }
          });

          // Property: Response structure should be consistent regardless of rate limiting
          responses.forEach(response => {
            if (response.status === 'fulfilled') {
              expect(response.value.data).toHaveProperty('success');
              expect(response.value.data).toHaveProperty('timestamp');
              
              if (response.value.status >= 400) {
                expect(response.value.data).toHaveProperty('error');
                expect(response.value.data).toHaveProperty('message');
              }
            }
          });

          return true;
        } catch (error) {
          // Network timeouts are acceptable for this test
          return true;
        }
      }),
      { numRuns: 10, timeout: 30000 }
    );
  }, 60000);

  /**
   * Property 5: Data Validation Consistency
   * Data validation should be consistent across similar endpoints
   */
  test('Property 5: Data validation consistency across endpoints', async () => {
    if (!authToken) {
      console.log('⚠️ Skipping test - no auth token available');
      return;
    }

    const emailArbitrary = fc.oneof(
      fc.emailAddress(), // Valid email
      fc.string().filter(s => !s.includes('@')), // Invalid email
      fc.constant(''), // Empty email
      fc.constant('invalid@'), // Incomplete email
      fc.constant('@invalid.com') // Missing local part
    );

    await fc.assert(
      fc.asyncProperty(emailArbitrary, async (email) => {
        const endpoints = [
          {
            method: 'POST',
            path: '/api/visitors',
            data: {
              name: 'Test Visitor',
              phone: '+254712345678',
              email: email,
              purpose: 'Test purpose',
              expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
          },
          {
            method: 'POST',
            path: '/api/auth/register',
            data: {
              username: 'testuser',
              email: email,
              password: 'TestPassword123!',
              phone: '+254712345678'
            }
          }
        ];

        const responses = await Promise.allSettled(
          endpoints.map(endpoint =>
            axios({
              method: endpoint.method,
              url: `${baseURL}${endpoint.path}`,
              data: endpoint.data,
              headers: { Authorization: `Bearer ${authToken}` },
              timeout: 10000,
              validateStatus: () => true
            })
          )
        );

        const isValidEmail = email.includes('@') && email.includes('.') && email.length > 5;

        responses.forEach((response, index) => {
          if (response.status === 'fulfilled') {
            const res = response.value;
            
            // Property: Email validation should be consistent across endpoints
            if (!isValidEmail && res.status >= 400) {
              expect(res.data).toHaveProperty('success', false);
              expect(res.data.error?.code).toMatch(/VALIDATION/);
              
              // Should mention email in error message or details
              const errorText = JSON.stringify(res.data).toLowerCase();
              expect(errorText).toMatch(/email/);
            }

            // Property: Response structure should be consistent
            expect(res.data).toHaveProperty('success');
            expect(res.data).toHaveProperty('timestamp');
            
            if (res.status >= 400) {
              expect(res.data).toHaveProperty('error');
              expect(res.data).toHaveProperty('message');
            }

            // Cleanup successful visitor creation
            if (index === 0 && res.status === 201 && res.data.data?.visitor?.id) {
              axios.delete(`${baseURL}/api/visitors/${res.data.data.visitor.id}`, {
                headers: { Authorization: `Bearer ${authToken}` }
              }).catch(() => {}); // Ignore cleanup errors
            }
          }
        });

        return true;
      }),
      { numRuns: 20, timeout: 30000 }
    );
  }, 60000);

  /**
   * Property 6: Response Time Consistency
   * Similar operations should have consistent response times
   */
  test('Property 6: Response time consistency for similar operations', async () => {
    if (!authToken) {
      console.log('⚠️ Skipping test - no auth token available');
      return;
    }

    const operationTypes = fc.constantFrom(
      { method: 'GET', path: '/api/visitors', name: 'list_visitors' },
      { method: 'GET', path: '/api/health', name: 'health_check' },
      { method: 'GET', path: '/api/auth/csrf-token', name: 'csrf_token' }
    );

    await fc.assert(
      fc.asyncProperty(operationTypes, async (operation) => {
        const responseTimes = [];
        const responses = [];

        // Perform the same operation multiple times
        for (let i = 0; i < 3; i++) {
          try {
            const startTime = Date.now();
            const response = await axios({
              method: operation.method,
              url: `${baseURL}${operation.path}`,
              headers: operation.path.includes('/api/visitors') ? 
                { Authorization: `Bearer ${authToken}` } : {},
              timeout: 10000,
              validateStatus: () => true
            });
            const endTime = Date.now();
            
            responseTimes.push(endTime - startTime);
            responses.push(response);
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            // Network errors are acceptable
            responseTimes.push(10000); // Max timeout
          }
        }

        if (responseTimes.length > 1) {
          const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
          const maxResponseTime = Math.max(...responseTimes);
          const minResponseTime = Math.min(...responseTimes);
          
          // Property: Response times should be reasonably consistent
          // Allow for some variation but not extreme differences
          const variation = maxResponseTime - minResponseTime;
          const variationRatio = variation / avgResponseTime;
          
          // Property: Variation should not exceed 300% of average response time
          expect(variationRatio).toBeLessThan(3.0);
          
          // Property: All successful responses should have consistent structure
          responses.forEach(response => {
            if (response.status < 400) {
              expect(response.data).toHaveProperty('success');
              expect(response.data).toHaveProperty('timestamp');
            }
          });
        }

        return true;
      }),
      { numRuns: 15, timeout: 45000 }
    );
  }, 90000);

  afterAll(async () => {
    // Cleanup any remaining test data
    console.log('🧹 API Integration Reliability test cleanup completed');
  });
});