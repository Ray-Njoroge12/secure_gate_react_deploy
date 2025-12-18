/**
 * Database Mock for Unit Tests
 * Provides a mock implementation of the database manager to prevent actual database connections
 */

import { jest } from '@jest/globals';

// Mock query results for common operations
const mockQueryResults = {
  empty: { rows: [], rowCount: 0 },
  single: (data) => ({ rows: [data], rowCount: 1 }),
  multiple: (data) => ({ rows: data, rowCount: data.length })
};

// Create mock database manager
export const createMockDbManager = () => {
  const mockQuery = jest.fn().mockResolvedValue(mockQueryResults.empty);
  
  const mockDbManager = {
    query: mockQuery,
    getConnection: jest.fn().mockResolvedValue({
      query: mockQuery,
      release: jest.fn()
    }),
    transaction: jest.fn(async (callback) => {
      const mockClient = {
        query: mockQuery,
        release: jest.fn()
      };
      try {
        await mockQuery('BEGIN');
        const result = await callback(mockClient);
        await mockQuery('COMMIT');
        return result;
      } catch (error) {
        await mockQuery('ROLLBACK');
        throw error;
      }
    }),
    isConnected: jest.fn().mockReturnValue(true),
    getPoolStatus: jest.fn().mockReturnValue({
      total: 10,
      idle: 8,
      waiting: 0
    }),
    metrics: {
      queries: 0,
      errors: 0,
      connectionTime: 0
    }
  };

  return { mockDbManager, mockQuery, mockQueryResults };
};

// Helper to setup common query responses
export const setupQueryResponse = (mockQuery, queryPattern, response) => {
  mockQuery.mockImplementation((sql, params) => {
    if (typeof queryPattern === 'string' && sql.includes(queryPattern)) {
      return Promise.resolve(response);
    }
    if (queryPattern instanceof RegExp && queryPattern.test(sql)) {
      return Promise.resolve(response);
    }
    return Promise.resolve(mockQueryResults.empty);
  });
};

// Mock for specific table queries
export const mockTableQueries = {
  users: {
    findById: (user) => mockQueryResults.single(user),
    findByEmail: (user) => mockQueryResults.single(user),
    notFound: mockQueryResults.empty,
    create: (user) => mockQueryResults.single({ ...user, id: Date.now() })
  },
  visitors: {
    findById: (visitor) => mockQueryResults.single(visitor),
    findByResident: (visitors) => mockQueryResults.multiple(visitors),
    create: (visitor) => mockQueryResults.single({ ...visitor, id: Date.now() })
  },
  incidents: {
    findById: (incident) => mockQueryResults.single(incident),
    findAll: (incidents) => mockQueryResults.multiple(incidents),
    create: (incident) => mockQueryResults.single({ ...incident, id: Date.now() })
  }
};

// Export for Jest unstable_mockModule
export const mockDbModule = () => ({
  dbManager: createMockDbManager().mockDbManager
});

export default {
  createMockDbManager,
  setupQueryResponse,
  mockTableQueries,
  mockQueryResults,
  mockDbModule
};
