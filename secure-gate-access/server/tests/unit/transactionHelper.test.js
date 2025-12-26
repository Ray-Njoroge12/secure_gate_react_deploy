/**
 * Transaction Helper Unit Tests
 * Tests for database transaction wrapper utility
 * Priority: P1 - Core utility functions
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the database manager before importing the module
const mockTransaction = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    transaction: mockTransaction
  }
}));

const { withTransaction } = await import('../../src/utils/transactionHelper.js');

describe('transactionHelper', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withTransaction', () => {
    it('should call dbManager.transaction with work function', async () => {
      const mockClient = { query: jest.fn() };
      const workFn = jest.fn().mockResolvedValue('success');
      
      mockTransaction.mockImplementation(async (fn) => {
        return fn(mockClient);
      });

      await withTransaction(workFn);
      
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(workFn).toHaveBeenCalledWith(mockClient);
    });

    it('should return result from work function', async () => {
      const expectedResult = { id: 1, name: 'Test' };
      const workFn = jest.fn().mockResolvedValue(expectedResult);
      
      mockTransaction.mockImplementation(async (fn) => {
        return fn({});
      });

      const result = await withTransaction(workFn);
      
      expect(result).toEqual(expectedResult);
    });

    it('should pass options to dbManager.transaction', async () => {
      const workFn = jest.fn().mockResolvedValue('result');
      const options = { isolationLevel: 'SERIALIZABLE' };
      
      mockTransaction.mockImplementation(async (fn, opts) => {
        return fn({});
      });

      await withTransaction(workFn, options);
      
      expect(mockTransaction).toHaveBeenCalledWith(
        expect.any(Function),
        options
      );
    });

    it('should propagate errors from work function', async () => {
      const error = new Error('Transaction failed');
      const workFn = jest.fn().mockRejectedValue(error);
      
      mockTransaction.mockImplementation(async (fn) => {
        return fn({});
      });

      await expect(withTransaction(workFn)).rejects.toThrow('Transaction failed');
    });

    it('should propagate errors from dbManager.transaction', async () => {
      const error = new Error('Database connection failed');
      const workFn = jest.fn();
      
      mockTransaction.mockRejectedValue(error);

      await expect(withTransaction(workFn)).rejects.toThrow('Database connection failed');
    });

    it('should handle async work functions', async () => {
      const workFn = jest.fn().mockImplementation(async (client) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });
      
      mockTransaction.mockImplementation(async (fn) => {
        return fn({});
      });

      const result = await withTransaction(workFn);
      
      expect(result).toBe('async result');
    });

    it('should handle work functions that return undefined', async () => {
      const workFn = jest.fn().mockResolvedValue(undefined);
      
      mockTransaction.mockImplementation(async (fn) => {
        return fn({});
      });

      const result = await withTransaction(workFn);
      
      expect(result).toBeUndefined();
    });

    it('should handle work functions that return null', async () => {
      const workFn = jest.fn().mockResolvedValue(null);
      
      mockTransaction.mockImplementation(async (fn) => {
        return fn({});
      });

      const result = await withTransaction(workFn);
      
      expect(result).toBeNull();
    });

    it('should handle complex return values', async () => {
      const complexResult = {
        users: [{ id: 1 }, { id: 2 }],
        metadata: { total: 2, page: 1 },
        nested: { deep: { value: 'test' } }
      };
      const workFn = jest.fn().mockResolvedValue(complexResult);
      
      mockTransaction.mockImplementation(async (fn) => {
        return fn({});
      });

      const result = await withTransaction(workFn);
      
      expect(result).toEqual(complexResult);
    });

    it('should pass client with query method to work function', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }] })
      };
      
      const workFn = jest.fn().mockImplementation(async (client) => {
        const result = await client.query('SELECT 1');
        return result.rows;
      });
      
      mockTransaction.mockImplementation(async (fn) => {
        return fn(mockClient);
      });

      await withTransaction(workFn);
      
      expect(workFn).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should handle multiple sequential transactions', async () => {
      const workFn1 = jest.fn().mockResolvedValue('result1');
      const workFn2 = jest.fn().mockResolvedValue('result2');
      
      mockTransaction.mockImplementation(async (fn) => {
        return fn({});
      });

      const result1 = await withTransaction(workFn1);
      const result2 = await withTransaction(workFn2);
      
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
      expect(mockTransaction).toHaveBeenCalledTimes(2);
    });
  });
});
