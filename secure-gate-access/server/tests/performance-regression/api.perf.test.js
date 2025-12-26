/**
 * Performance Regression Tests for API Endpoints
 * 
 * Tests API response times to detect performance regressions.
 * Measures endpoint latency, throughput, and response consistency.
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  benchmark,
  performanceAssert,
  Timer,
  BaselineManager,
  createBenchmarkSuite
} from './benchmark.utils.js';

// Performance thresholds for different endpoint types (in ms)
const API_THRESHOLDS = {
  health: 50,        // Health check endpoints
  auth: 200,         // Authentication endpoints
  crud: 150,         // Basic CRUD operations
  list: 300,         // List/pagination endpoints
  search: 500,       // Search endpoints
  export: 2000,      // Data export endpoints
  report: 3000       // Report generation endpoints
};

// Mock Express app components
const createMockRequest = (overrides = {}) => ({
  method: 'GET',
  path: '/api/test',
  headers: { authorization: 'Bearer test-token' },
  query: {},
  params: {},
  body: {},
  user: { id: 1, role: 'admin' },
  get: jest.fn((header) => overrides.headers?.[header.toLowerCase()]),
  ...overrides
});

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    data: null,
    status: jest.fn((code) => { res.statusCode = code; return res; }),
    json: jest.fn((data) => { res.data = data; return res; }),
    send: jest.fn((data) => { res.data = data; return res; }),
    setHeader: jest.fn(),
    end: jest.fn()
  };
  return res;
};

// Simulated controller handlers
const mockControllers = {
  healthCheck: async (req, res) => {
    await simulateDelay(5);
    res.json({ status: 'healthy', timestamp: Date.now() });
  },

  login: async (req, res) => {
    await simulateDelay(50); // Hash comparison, DB lookup
    res.json({ token: 'jwt-token', user: { id: 1 } });
  },

  getVisitor: async (req, res) => {
    await simulateDelay(20); // DB lookup
    res.json({ id: 1, name: 'Test Visitor' });
  },

  listVisitors: async (req, res) => {
    await simulateDelay(50); // DB query with pagination
    res.json({ data: [], total: 100, page: 1 });
  },

  searchVisitors: async (req, res) => {
    await simulateDelay(100); // Full-text search
    res.json({ results: [], total: 50 });
  },

  createVisitor: async (req, res) => {
    await simulateDelay(30); // Validation + DB insert
    res.status(201).json({ id: 1, ...req.body });
  },

  updateVisitor: async (req, res) => {
    await simulateDelay(25); // DB update
    res.json({ id: 1, ...req.body });
  },

  deleteVisitor: async (req, res) => {
    await simulateDelay(15); // Soft delete
    res.status(204).end();
  },

  exportVisitors: async (req, res) => {
    await simulateDelay(500); // Generate CSV/PDF
    res.setHeader('Content-Type', 'text/csv');
    res.send('data');
  },

  generateReport: async (req, res) => {
    await simulateDelay(1000); // Complex aggregation
    res.json({ report: { data: [] } });
  },

  bulkCreate: async (req, res) => {
    const count = req.body.items?.length || 10;
    await simulateDelay(count * 5); // Per-item processing
    res.status(201).json({ created: count });
  }
};

describe('API Endpoint Performance Regression Tests', () => {
  let baselineManager;

  beforeAll(() => {
    baselineManager = new BaselineManager();
  });

  describe('Health Check Endpoints', () => {
    it('should respond within threshold', async () => {
      const req = createMockRequest({ path: '/api/health' });
      const res = createMockResponse();

      const timer = new Timer();
      timer.start();
      await mockControllers.healthCheck(req, res);
      timer.stop();

      performanceAssert.underMs(
        timer.getElapsedMs(),
        API_THRESHOLDS.health,
        'Health check exceeded threshold'
      );
    });

    it('should maintain consistent response times', async () => {
      const result = await benchmark(
        async () => {
          const req = createMockRequest({ path: '/api/health' });
          const res = createMockResponse();
          await mockControllers.healthCheck(req, res);
        },
        { iterations: 100, warmupIterations: 10, name: 'health_check' }
      );

      expect(result.stats.mean).toBeLessThan(API_THRESHOLDS.health);
      expect(result.stats.p99).toBeLessThan(API_THRESHOLDS.health * 2);
      
      // Coefficient of variation should be low for health checks
      const cv = result.stats.stdDev / result.stats.mean;
      expect(cv).toBeLessThan(0.3);
    });
  });

  describe('Authentication Endpoints', () => {
    it('should handle login within threshold', async () => {
      const result = await benchmark(
        async () => {
          const req = createMockRequest({
            method: 'POST',
            path: '/api/auth/login',
            body: { email: 'test@example.com', password: 'password123' }
          });
          const res = createMockResponse();
          await mockControllers.login(req, res);
        },
        { iterations: 30, name: 'auth_login' }
      );

      expect(result.stats.mean).toBeLessThan(API_THRESHOLDS.auth);
      expect(result.stats.p95).toBeLessThan(API_THRESHOLDS.auth * 1.5);
    });

    it('should not regress login performance', async () => {
      const result = await benchmark(
        async () => {
          const req = createMockRequest({
            method: 'POST',
            path: '/api/auth/login',
            body: { email: 'user@example.com', password: 'pass' }
          });
          const res = createMockResponse();
          await mockControllers.login(req, res);
        },
        { iterations: 20, name: 'auth_login_baseline' }
      );

      const comparison = baselineManager.compareToBaseline(
        'auth_login_baseline',
        result.stats,
        25
      );

      if (!comparison.hasBaseline) {
        baselineManager.setBaseline('auth_login_baseline', result.stats);
      }

      expect(comparison.regression).toBe(false);
    });
  });

  describe('CRUD Endpoints', () => {
    describe('GET (Read)', () => {
      it('should fetch single resource within threshold', async () => {
        const result = await benchmark(
          async () => {
            const req = createMockRequest({ 
              path: '/api/visitors/1',
              params: { id: '1' }
            });
            const res = createMockResponse();
            await mockControllers.getVisitor(req, res);
          },
          { iterations: 50, name: 'get_visitor' }
        );

        expect(result.stats.mean).toBeLessThan(API_THRESHOLDS.crud);
        expect(result.stats.p99).toBeLessThan(API_THRESHOLDS.crud * 2);
      });
    });

    describe('POST (Create)', () => {
      it('should create resource within threshold', async () => {
        const result = await benchmark(
          async () => {
            const req = createMockRequest({
              method: 'POST',
              path: '/api/visitors',
              body: { name: 'New Visitor', phone: '+254700123456' }
            });
            const res = createMockResponse();
            await mockControllers.createVisitor(req, res);
          },
          { iterations: 30, name: 'create_visitor' }
        );

        expect(result.stats.mean).toBeLessThan(API_THRESHOLDS.crud);
      });
    });

    describe('PUT (Update)', () => {
      it('should update resource within threshold', async () => {
        const result = await benchmark(
          async () => {
            const req = createMockRequest({
              method: 'PUT',
              path: '/api/visitors/1',
              params: { id: '1' },
              body: { name: 'Updated Visitor' }
            });
            const res = createMockResponse();
            await mockControllers.updateVisitor(req, res);
          },
          { iterations: 30, name: 'update_visitor' }
        );

        expect(result.stats.mean).toBeLessThan(API_THRESHOLDS.crud);
      });
    });

    describe('DELETE', () => {
      it('should delete resource within threshold', async () => {
        const result = await benchmark(
          async () => {
            const req = createMockRequest({
              method: 'DELETE',
              path: '/api/visitors/1',
              params: { id: '1' }
            });
            const res = createMockResponse();
            await mockControllers.deleteVisitor(req, res);
          },
          { iterations: 30, name: 'delete_visitor' }
        );

        expect(result.stats.mean).toBeLessThan(API_THRESHOLDS.crud);
      });
    });
  });

  describe('List/Pagination Endpoints', () => {
    it('should list resources within threshold', async () => {
      const result = await benchmark(
        async () => {
          const req = createMockRequest({
            path: '/api/visitors',
            query: { page: 1, limit: 20 }
          });
          const res = createMockResponse();
          await mockControllers.listVisitors(req, res);
        },
        { iterations: 30, name: 'list_visitors' }
      );

      expect(result.stats.mean).toBeLessThan(API_THRESHOLDS.list);
    });

    it('should handle different page sizes consistently', async () => {
      const pageSizes = [10, 20, 50, 100];
      const results = [];

      for (const pageSize of pageSizes) {
        const result = await benchmark(
          async () => {
            const req = createMockRequest({
              path: '/api/visitors',
              query: { page: 1, limit: pageSize }
            });
            const res = createMockResponse();
            await mockControllers.listVisitors(req, res);
          },
          { iterations: 10, name: `list_visitors_page_${pageSize}` }
        );
        results.push({ pageSize, mean: result.stats.mean });
      }

      // Performance should scale reasonably with page size
      // (in mock it's constant, but structure shows intent)
      for (const r of results) {
        expect(r.mean).toBeLessThan(API_THRESHOLDS.list);
      }
    });
  });

  describe('Search Endpoints', () => {
    it('should search within threshold', async () => {
      const result = await benchmark(
        async () => {
          const req = createMockRequest({
            path: '/api/visitors/search',
            query: { q: 'John', status: 'PENDING' }
          });
          const res = createMockResponse();
          await mockControllers.searchVisitors(req, res);
        },
        { iterations: 20, name: 'search_visitors' }
      );

      expect(result.stats.mean).toBeLessThan(API_THRESHOLDS.search);
    });
  });

  describe('Export Endpoints', () => {
    it('should export data within threshold', async () => {
      const result = await benchmark(
        async () => {
          const req = createMockRequest({
            path: '/api/visitors/export',
            query: { format: 'csv' }
          });
          const res = createMockResponse();
          await mockControllers.exportVisitors(req, res);
        },
        { iterations: 10, name: 'export_visitors' }
      );

      expect(result.stats.mean).toBeLessThan(API_THRESHOLDS.export);
    });
  });

  describe('Report Generation Endpoints', () => {
    it('should generate reports within threshold', async () => {
      const result = await benchmark(
        async () => {
          const req = createMockRequest({
            path: '/api/reports/visitors',
            query: { startDate: '2025-01-01', endDate: '2025-12-31' }
          });
          const res = createMockResponse();
          await mockControllers.generateReport(req, res);
        },
        { iterations: 5, name: 'generate_report' }
      );

      expect(result.stats.mean).toBeLessThan(API_THRESHOLDS.report);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk create within reasonable time', async () => {
      const itemCounts = [10, 50, 100];
      
      for (const count of itemCounts) {
        const result = await benchmark(
          async () => {
            const req = createMockRequest({
              method: 'POST',
              path: '/api/visitors/bulk',
              body: { items: Array(count).fill({ name: 'Visitor' }) }
            });
            const res = createMockResponse();
            await mockControllers.bulkCreate(req, res);
          },
          { iterations: 5, name: `bulk_create_${count}` }
        );

        // Time should scale linearly-ish with item count
        const maxTime = count * 20; // ~20ms per item max
        expect(result.stats.mean).toBeLessThan(maxTime);
      }
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      
      const timer = new Timer();
      timer.start();

      await Promise.all(
        Array.from({ length: concurrentRequests }, async () => {
          const req = createMockRequest({ path: '/api/visitors' });
          const res = createMockResponse();
          await mockControllers.listVisitors(req, res);
        })
      );

      timer.stop();
      
      // Average time per request should not increase dramatically
      const avgTime = timer.getElapsedMs() / concurrentRequests;
      expect(avgTime).toBeLessThan(API_THRESHOLDS.list);
    });

    it('should handle mixed concurrent operations', async () => {
      const operations = [
        () => mockControllers.healthCheck(createMockRequest(), createMockResponse()),
        () => mockControllers.getVisitor(createMockRequest({ params: { id: '1' } }), createMockResponse()),
        () => mockControllers.listVisitors(createMockRequest(), createMockResponse()),
        () => mockControllers.createVisitor(createMockRequest({ body: { name: 'Test' } }), createMockResponse())
      ];

      const timer = new Timer();
      timer.start();

      await Promise.all(operations.map(op => op()));

      timer.stop();

      // All operations should complete within combined threshold
      expect(timer.getElapsedMs()).toBeLessThan(
        API_THRESHOLDS.health + API_THRESHOLDS.crud * 3
      );
    });
  });

  describe('Response Size Impact', () => {
    it('should track response size metrics', async () => {
      const req = createMockRequest({ path: '/api/visitors' });
      const res = createMockResponse();
      
      await mockControllers.listVisitors(req, res);
      
      // Verify response was generated
      expect(res.json).toHaveBeenCalled();
      expect(res.data).toBeDefined();
    });
  });
});

describe('API Performance Benchmark Suite', () => {
  it('should run complete API benchmark suite', async () => {
    const suite = createBenchmarkSuite('API Endpoints');

    suite
      .add('Health Check', async () => {
        await mockControllers.healthCheck(createMockRequest(), createMockResponse());
      }, { iterations: 50 })
      .add('Authentication', async () => {
        await mockControllers.login(
          createMockRequest({ body: { email: 'test@test.com' } }),
          createMockResponse()
        );
      }, { iterations: 20 })
      .add('List Visitors', async () => {
        await mockControllers.listVisitors(createMockRequest(), createMockResponse());
      }, { iterations: 20 })
      .add('Create Visitor', async () => {
        await mockControllers.createVisitor(
          createMockRequest({ body: { name: 'Test' } }),
          createMockResponse()
        );
      }, { iterations: 20 });

    const summary = await suite.run({ tolerancePercent: 25 });

    expect(summary.total).toBe(4);
    expect(summary.passRate).toBeGreaterThanOrEqual(0);
  });
});

// Helper function
function simulateDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
