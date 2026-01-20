/**
 * Mock Integration Test Setup
 * Provides mock database for integration testing without PostgreSQL
 */

import { jest } from '@jest/globals';

// In-memory mock database
const mockDatabase = {
  users: [],
  visitors: [],
  audit_logs: [],
  recurring_passes: [],
  delivery_logs: [],
  consent_log: [],
  data_deletion_requests: [],
  data_export_log: [],
  user_privacy_settings: []
};

let idCounter = 1;

/**
 * Mock query implementation
 */
const mockQuery = jest.fn(async (sql, params = []) => {
  const sqlLower = sql.toLowerCase().trim();
  
  // Handle INSERT
  if (sqlLower.startsWith('insert into')) {
    const tableMatch = sql.match(/insert into (\w+)/i);
    if (tableMatch) {
      const table = tableMatch[1];
      const id = idCounter++;
      const record = { id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      
      // Extract column names and values
      const colMatch = sql.match(/\(([\w\s,_]+)\)\s*values/i);
      if (colMatch) {
        const columns = colMatch[1].split(',').map(c => c.trim());
        columns.forEach((col, i) => {
          if (params[i] !== undefined) {
            record[col] = params[i];
          }
        });
      }
      
      if (mockDatabase[table]) {
        mockDatabase[table].push(record);
        return { rows: [record], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }
  
  // Handle SELECT
  if (sqlLower.startsWith('select')) {
    const tableMatch = sql.match(/from (\w+)/i);
    if (tableMatch) {
      const table = tableMatch[1];
      let results = mockDatabase[table] || [];
      
      // Handle WHERE clause with params
      if (sqlLower.includes('where') && params.length > 0) {
        const whereMatch = sql.match(/where\s+(.+?)(?:order|limit|$)/i);
        if (whereMatch) {
          const conditions = whereMatch[1];
          results = results.filter(row => {
            // Simple parameter matching
            let paramIndex = 0;
            let match = true;
            
            // Handle id = $1
            if (conditions.includes('id =') && params[0] !== undefined) {
              match = match && row.id === params[0];
            }
            // Handle user_id = $1
            if (conditions.includes('user_id =') && params[0] !== undefined) {
              match = match && row.user_id === params[0];
            }
            // Handle email = $1
            if (conditions.includes('email =') && params[0] !== undefined) {
              match = match && row.email === params[0];
            }
            // Handle host_id = $1
            if (conditions.includes('host_id =') && params[0] !== undefined) {
              match = match && row.host_id === params[0];
            }
            // Handle resident_id = $1
            if (conditions.includes('resident_id =') && params[0] !== undefined) {
              match = match && row.resident_id === params[0];
            }
            // Handle status = $1 or status = 'value'
            if (conditions.includes('status =')) {
              const statusMatch = conditions.match(/status\s*=\s*(?:\$\d+|'(\w+)')/i);
              if (statusMatch) {
                const status = statusMatch[1] || params[0];
                match = match && row.status === status;
              }
            }
            // Handle action = $1
            if (conditions.includes('action =') && params[0] !== undefined) {
              match = match && row.action === params[0];
            }
            
            return match;
          });
        }
      }
      
      // Handle LIMIT
      const limitMatch = sql.match(/limit\s+(\d+)/i);
      if (limitMatch) {
        results = results.slice(0, parseInt(limitMatch[1]));
      }
      
      // Handle COUNT(*)
      if (sqlLower.includes('count(*)')) {
        return { rows: [{ count: results.length.toString() }], rowCount: 1 };
      }
      
      return { rows: results, rowCount: results.length };
    }
    return { rows: [], rowCount: 0 };
  }
  
  // Handle UPDATE
  if (sqlLower.startsWith('update')) {
    const tableMatch = sql.match(/update (\w+)/i);
    if (tableMatch) {
      const table = tableMatch[1];
      let updated = [];
      
      if (mockDatabase[table]) {
        mockDatabase[table] = mockDatabase[table].map(row => {
          let shouldUpdate = true;
          
          // Check WHERE conditions
          if (sqlLower.includes('where')) {
            if (sqlLower.includes('id =') && params.length > 0) {
              const idParamIndex = (sql.match(/id = \$(\d+)/i) || [])[1];
              if (idParamIndex) {
                shouldUpdate = row.id === params[parseInt(idParamIndex) - 1];
              }
            }
            if (sqlLower.includes("status = 'approved'") || sqlLower.includes("status = 'pending'")) {
              const statusMatch = sql.match(/and\s+status\s*=\s*'(\w+)'/i);
              if (statusMatch) {
                shouldUpdate = shouldUpdate && row.status === statusMatch[1];
              }
            }
          }
          
          if (shouldUpdate) {
            const setMatch = sql.match(/set\s+(.+?)\s+where/i);
            if (setMatch) {
              const setClauses = setMatch[1].split(',');
              setClauses.forEach(clause => {
                const [col, val] = clause.split('=').map(s => s.trim());
                if (val.startsWith('$')) {
                  const paramIndex = parseInt(val.slice(1)) - 1;
                  row[col] = params[paramIndex];
                } else if (val === 'NOW()') {
                  row[col] = new Date().toISOString();
                }
              });
              row.updated_at = new Date().toISOString();
              updated.push(row);
            }
          }
          return row;
        });
      }
      
      return { rows: updated, rowCount: updated.length };
    }
    return { rows: [], rowCount: 0 };
  }
  
  // Handle DELETE
  if (sqlLower.startsWith('delete')) {
    const tableMatch = sql.match(/from (\w+)/i);
    if (tableMatch) {
      const table = tableMatch[1];
      if (mockDatabase[table]) {
        const beforeCount = mockDatabase[table].length;
        
        if (params.length > 0 && sqlLower.includes('where')) {
          mockDatabase[table] = mockDatabase[table].filter(row => {
            if (sqlLower.includes('id =')) {
              return row.id !== params[0];
            }
            if (sqlLower.includes('host_id =')) {
              return row.host_id !== params[0];
            }
            if (sqlLower.includes('user_id =')) {
              return row.user_id !== params[0];
            }
            return true;
          });
        } else if (!sqlLower.includes('where')) {
          mockDatabase[table] = [];
        }
        
        return { rows: [], rowCount: beforeCount - mockDatabase[table].length };
      }
    }
    return { rows: [], rowCount: 0 };
  }
  
  // Handle DROP TABLE, CREATE TABLE, ALTER TABLE
  if (sqlLower.includes('drop table') || sqlLower.includes('create table') || sqlLower.includes('alter table')) {
    return { rows: [], rowCount: 0 };
  }
  
  return { rows: [], rowCount: 0 };
});

/**
 * Mock database manager
 */
export const mockDbManager = {
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: mockQuery,
      release: jest.fn()
    })
  },
  query: mockQuery,
  connect: jest.fn().mockResolvedValue(true),
  close: jest.fn().mockResolvedValue(true),
  isConnected: jest.fn().mockReturnValue(true),
  transaction: jest.fn(async (callback) => {
    const client = {
      query: mockQuery,
      release: jest.fn()
    };
    return callback(client);
  })
};

/**
 * Setup mock test database
 */
export async function setupMockTestDatabase() {
  // Reset mock database
  Object.keys(mockDatabase).forEach(table => {
    mockDatabase[table] = [];
  });
  idCounter = 1;
  
  console.log('✅ Mock test database initialized');
  return true;
}

/**
 * Create test users
 */
export async function createMockTestUsers() {
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.default.hash('testpass123', 10);
  
  const admin = {
    id: idCounter++,
    username: 'admin_test',
    email: 'admin@test.com',
    password: hashedPassword,
    role: 'admin',
    phone: '+254700000001',
    house: 'Admin',
    estate_id: 1,
    created_at: new Date().toISOString()
  };
  
  const guard = {
    id: idCounter++,
    username: 'guard_test',
    email: 'guard@test.com',
    password: hashedPassword,
    role: 'guard',
    phone: '+254700000002',
    house: 'Gate 1',
    estate_id: 1,
    created_at: new Date().toISOString()
  };
  
  const resident = {
    id: idCounter++,
    username: 'resident_test',
    email: 'resident@test.com',
    password: hashedPassword,
    role: 'resident',
    phone: '+254700000003',
    house: 'A101',
    estate_id: 1,
    created_at: new Date().toISOString()
  };
  
  mockDatabase.users.push(admin, guard, resident);
  
  return { admin, guard, resident };
}

/**
 * Get auth token for test user
 */
export async function getMockAuthToken(email) {
  const jwt = await import('jsonwebtoken');
  const user = mockDatabase.users.find(u => u.email === email);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const token = jwt.default.sign(
    { id: user.id, email: user.email, role: user.role, estate_id: user.estate_id ?? 1 },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  
  return token;
}

/**
 * Cleanup mock database
 */
export async function cleanupMockTestDatabase() {
  Object.keys(mockDatabase).forEach(table => {
    mockDatabase[table] = [];
  });
  idCounter = 1;
}

/**
 * Get mock database reference (for direct manipulation in tests)
 */
export function getMockDatabase() {
  return mockDatabase;
}

export default {
  mockDbManager,
  setupMockTestDatabase,
  createMockTestUsers,
  getMockAuthToken,
  cleanupMockTestDatabase,
  getMockDatabase
};
