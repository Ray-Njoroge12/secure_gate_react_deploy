const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const BACKEND_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000;

let backendProcess;
let testDatabase;

const setupTestDatabase = async () => {
  try {
    // Import database connection
    const dbPath = path.join(__dirname, '../../secure-gate-access/server/src/database/db.enhanced.js');
    const dbModule = await import(dbPath);
    testDatabase = dbModule.default;
    
    // Clean test data
    await testDatabase.query("DELETE FROM users WHERE email LIKE '%@test.com'");
    await testDatabase.query("DELETE FROM visitors WHERE phone LIKE '+2547123%'");
    await testDatabase.query("DELETE FROM residents WHERE email LIKE '%@test.com'");
    await testDatabase.query("DELETE FROM access_logs WHERE request_id LIKE 'test_%'");
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
};

const startBackend = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting backend server for integration tests...');
    
    const serverPath = path.join(__dirname, '../../secure-gate-access/server');
    
    backendProcess = spawn('node', ['server.js'], {
      cwd: serverPath,
      env: { 
        ...process.env, 
        NODE_ENV: 'test', 
        PORT: '3001',
        PGHOST: 'localhost',
        PGPORT: '5432',
        PGDATABASE: 'secure_gate',
        PGUSER: 'secure_gate_user',
        PGPASSWORD: 'secure_gate_password',
        JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production-32-chars-min',
        JWT_REFRESH_SECRET: 'your-super-secret-refresh-key-change-this-in-production-32-chars-min'
      },
      stdio: 'pipe'
    });
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running') || output.includes('port 3001')) {
        console.log('✅ Backend server started');
        resolve();
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      // Only log actual errors, not warnings
      if (errorOutput.includes('Error:') || errorOutput.includes('❌')) {
        console.error('Backend error:', errorOutput);
      }
    });
    
    backendProcess.on('error', (error) => {
      reject(error);
    });
    
    // Timeout after 15 seconds
    setTimeout(() => reject(new Error('Backend startup timeout')), 15000);
  });
};

const waitForBackend = async (maxAttempts = 30) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 2000 });
      if (response.status === 200) {
        console.log('✅ Backend is ready');
        return true;
      }
    } catch (error) {
      console.log(`Waiting for backend... attempt ${i + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Backend did not become ready');
};

const cleanup = async () => {
  console.log('Cleaning up test environment...');
  
  if (backendProcess) {
    backendProcess.kill();
    console.log('✅ Backend process terminated');
  }
  
  if (testDatabase) {
    try {
      await testDatabase.query("DELETE FROM users WHERE email LIKE '%@test.com'");
      await testDatabase.query("DELETE FROM visitors WHERE phone LIKE '+2547123%'");
      await testDatabase.query("DELETE FROM residents WHERE email LIKE '%@test.com'");
      await testDatabase.query("DELETE FROM access_logs WHERE request_id LIKE 'test_%'");
      console.log('✅ Test data cleaned');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
  
  console.log('✅ Cleanup complete');
};

const globalSetup = async () => {
  console.log('🚀 Setting up integration test environment...');
  await setupTestDatabase();
  await startBackend();
  await waitForBackend();
  console.log('✅ Integration test environment ready');
};

const globalTeardown = async () => {
  console.log('🧹 Tearing down integration test environment...');
  await cleanup();
  console.log('✅ Integration test environment cleaned up');
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (method, endpoint, data = null, token = null) => {
  const config = {
    method,
    url: `${BACKEND_URL}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 10000
  };
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (data) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return response;
  } catch (error) {
    if (error.response) {
      return error.response;
    }
    throw error;
  }
};

// Helper function to create test user
const createTestUser = async (userData = {}) => {
  const defaultUser = {
    username: `testuser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: `test_${Date.now()}@test.com`,
    password: 'TestPassword123!',
    role: 'resident',
    ...userData
  };
  
  const response = await makeAuthenticatedRequest('POST', '/api/auth/register', defaultUser);
  
  if (response.status === 201) {
    return {
      ...defaultUser,
      id: response.data.data.user.id,
      token: response.data.data.token
    };
  }
  
  throw new Error(`Failed to create test user: ${response.status} - ${response.data?.message}`);
};

// Helper function to create test admin user
const createTestAdmin = async () => {
  return await createTestUser({
    username: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: `admin_${Date.now()}@test.com`,
    role: 'admin'
  });
};

module.exports = {
  BACKEND_URL,
  TEST_TIMEOUT,
  globalSetup,
  globalTeardown,
  setupTestDatabase,
  cleanup,
  makeAuthenticatedRequest,
  createTestUser,
  createTestAdmin,
  testDatabase
};




