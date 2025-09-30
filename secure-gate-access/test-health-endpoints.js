// test-health-endpoints.js
/**
 * Simple test script to validate health monitoring endpoints
 */

import express from 'express';
import { createHealthMonitoring } from './server/integration/health-monitoring-integration.js';
import { healthCheck } from './server/src/services/healthService.js';

async function testHealthEndpoints() {
  try {
    console.log('🚀 Starting health monitoring test...');
    
    // Create test app
    const app = express();
    app.use(express.json());

    // Initialize health monitoring
    console.log('📋 Initializing health monitoring integration...');
    const healthMonitoring = await createHealthMonitoring(app, healthCheck);
    
    console.log('✅ Health monitoring integration status:', healthMonitoring.getStatus());

    // Start server
    const PORT = process.env.PORT || 5001;
    const server = app.listen(PORT, () => {
      console.log(`🌐 Test server running on http://localhost:${PORT}`);
      console.log('🔍 Available health endpoints:');
      console.log('  • GET /health - Basic health check');
      console.log('  • GET /health/live - Liveness probe');
      console.log('  • GET /health/ready - Readiness probe'); 
      console.log('  • GET /health/startup - Startup probe');
      console.log('  • GET /health/detailed - Detailed health info');
    });

    // Test health endpoints after a short delay
    setTimeout(async () => {
      await testEndpoints(PORT);
      server.close(() => {
        console.log('🏁 Test completed successfully');
        process.exit(0);
      });
    }, 1000);

  } catch (error) {
    console.error('❌ Health monitoring test failed:', error.message);
    process.exit(1);
  }
}

async function testEndpoints(port) {
  const fetch = (await import('node-fetch')).default;
  
  const endpoints = [
    '/health',
    '/health/live', 
    '/health/ready',
    '/health/startup',
    '/health/detailed'
  ];

  console.log('🔍 Testing health endpoints...');
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:${port}${endpoint}`);
      const data = await response.json();
      
      console.log(`✅ ${endpoint}: ${response.status} - ${data.status || 'ok'}`);
      
      if (endpoint === '/health/detailed') {
        console.log('📊 Detailed health check keys:', Object.keys(data));
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: ERROR - ${error.message}`);
    }
  }
}

// Run the test
testHealthEndpoints();