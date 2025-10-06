/**
 * Global Setup for E2E Tests
 * 
 * Sets up test environment, creates test data, and prepares for E2E testing
 */

const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');

let backendProcess;
let frontendProcess;

async function globalSetup(config) {
  console.log('🚀 Starting E2E test global setup...');
  
  try {
    // Start backend server
    await startBackendServer();
    
    // Start frontend server
    await startFrontendServer();
    
    // Wait for services to be ready
    await waitForServices();
    
    // Create test data
    await createTestData();
    
    console.log('✅ E2E test global setup completed');
    
  } catch (error) {
    console.error('❌ E2E test global setup failed:', error);
    throw error;
  }
}

async function startBackendServer() {
  console.log('🔧 Starting backend server...');
  
  return new Promise((resolve, reject) => {
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        PORT: '3001',
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/gatedb_test'
      },
      stdio: 'pipe'
    });
    
    let serverReady = false;
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Backend: ${output.trim()}`);
      
      if (output.includes('Server running') || output.includes('port 3001') || output.includes('healthy')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Backend server started');
          resolve();
        }
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`Backend Error: ${output.trim()}`);
    });
    
    backendProcess.on('error', (error) => {
      console.error('❌ Backend server error:', error);
      reject(error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Backend server startup timeout'));
      }
    }, 30000);
  });
}

async function startFrontendServer() {
  console.log('🔧 Starting frontend server...');
  
  return new Promise((resolve, reject) => {
    frontendProcess = spawn('npm', ['start'], {
      cwd: '../client',
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        PORT: '3000',
        REACT_APP_API_URL: 'http://localhost:3001'
      },
      stdio: 'pipe'
    });
    
    let serverReady = false;
    
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Frontend: ${output.trim()}`);
      
      if (output.includes('webpack compiled') || output.includes('Local:') || output.includes('localhost:3000')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Frontend server started');
          resolve();
        }
      }
    });
    
    frontendProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`Frontend Error: ${output.trim()}`);
    });
    
    frontendProcess.on('error', (error) => {
      console.error('❌ Frontend server error:', error);
      reject(error);
    });
    
    // Timeout after 60 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Frontend server startup timeout'));
      }
    }, 60000);
  });
}

async function waitForServices() {
  console.log('⏳ Waiting for services to be ready...');
  
  const maxAttempts = 30;
  const delay = 2000;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Test backend health
      const backendResponse = await fetch('http://localhost:3001/health');
      if (backendResponse.ok) {
        console.log('✅ Backend is ready');
        
        // Test frontend
        const frontendResponse = await fetch('http://localhost:3000');
        if (frontendResponse.ok) {
          console.log('✅ Frontend is ready');
          return;
        }
      }
    } catch (error) {
      console.log(`⏳ Waiting for services... attempt ${i + 1}/${maxAttempts}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw new Error('Services did not become ready within timeout');
}

async function createTestData() {
  console.log('📊 Creating test data...');
  
  try {
    // Create test users
    await createTestUsers();
    
    // Create test residents
    await createTestResidents();
    
    // Create test visitors
    await createTestVisitors();
    
    console.log('✅ Test data created successfully');
    
  } catch (error) {
    console.warn('⚠️  Test data creation failed (continuing anyway):', error.message);
  }
}

async function createTestUsers() {
  const testUsers = [
    {
      name: 'Admin User',
      email: 'admin@test.com',
      phone: '+254712345001',
      password: 'AdminPass123!',
      role: 'admin'
    },
    {
      name: 'Resident User',
      email: 'resident@test.com',
      phone: '+254712345002',
      password: 'ResidentPass123!',
      role: 'resident'
    },
    {
      name: 'Guard User',
      email: 'guard@test.com',
      phone: '+254712345003',
      password: 'GuardPass123!',
      role: 'guard'
    }
  ];
  
  for (const user of testUsers) {
    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
      });
      
      if (response.ok) {
        console.log(`✅ Created test user: ${user.email}`);
      } else {
        console.log(`⚠️  Test user ${user.email} may already exist`);
      }
    } catch (error) {
      console.log(`⚠️  Failed to create test user ${user.email}:`, error.message);
    }
  }
}

async function createTestResidents() {
  // This would create test residents if the endpoint exists
  console.log('📝 Test residents creation skipped (endpoint not available)');
}

async function createTestVisitors() {
  // This would create test visitors if the endpoint exists
  console.log('📝 Test visitors creation skipped (endpoint not available)');
}

// Store processes for cleanup
process.on('exit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (frontendProcess) {
    frontendProcess.kill();
  }
});

module.exports = globalSetup;
