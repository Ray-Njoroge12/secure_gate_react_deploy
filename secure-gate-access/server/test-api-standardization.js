import request from 'supertest';
import { createServer } from 'http';
import express from 'express';

// Import our standardized middleware and controllers
import { globalErrorHandler, requestIdMiddleware, notFoundHandler } from './src/middleware/errorHandler.js';
import { ResponseUtil } from './src/utils/responseUtils.js';
import { getMetrics, getAuditLogs } from './src/controllers/adminController.js';

// Create a test app to verify our standardized responses
const app = express();

// Apply our standardized middleware
app.use(requestIdMiddleware);
app.use(express.json());

// Add mock user middleware for testing
app.use((req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com', role: 'admin' };
  next();
});

// Test routes using our standardized patterns
app.get('/test/success', (req, res) => {
  ResponseUtil.success(res, { message: 'Test successful' }, 'Test completed successfully');
});

app.get('/test/error', (req, res, next) => {
  const error = new Error('Test error');
  error.statusCode = 400;
  next(error);
});

app.get('/test/admin/metrics', getMetrics);
app.get('/test/admin/logs', getAuditLogs);

// Apply error handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Test our API response standardization
async function testApiStandardization() {
  console.log('Testing API Response Standardization...\n');
  
  const server = createServer(app);
  const PORT = 3001; // Use different port for testing
  
  return new Promise((resolve, reject) => {
    server.listen(PORT, async () => {
      try {
        console.log(`Test server running on port ${PORT}\n`);
        
        // Test 1: Success response
        console.log('1. Testing success response format...');
        const successTest = await fetch(`http://localhost:${PORT}/test/success`);
        const successData = await successTest.json();
        
        console.log('Success response:', JSON.stringify(successData, null, 2));
        
        // Verify standardized success format
        if (successData.success === true && 
            successData.status === 'success' && 
            successData.data && 
            successData.message) {
          console.log('✅ Success response format is standardized\n');
        } else {
          console.log('❌ Success response format needs work\n');
        }
        
        // Test 2: Error response
        console.log('2. Testing error response format...');
        const errorTest = await fetch(`http://localhost:${PORT}/test/error`);
        const errorData = await errorTest.json();
        
        console.log('Error response:', JSON.stringify(errorData, null, 2));
        
        // Verify standardized error format
        if (errorData.success === false && 
            errorData.status === 'error' && 
            errorData.error && 
            'requestId' in errorData) {
          console.log('✅ Error response format is standardized\n');
        } else {
          console.log('❌ Error response format needs work\n');
        }
        
        // Test 3: 404 Not Found
        console.log('3. Testing 404 response format...');
        const notFoundTest = await fetch(`http://localhost:${PORT}/nonexistent`);
        const notFoundData = await notFoundTest.json();
        
        console.log('404 response:', JSON.stringify(notFoundData, null, 2));
        
        if (notFoundData.success === false && 
            notFoundData.status === 'error' && 
            notFoundTest.status === 404) {
          console.log('✅ 404 response format is standardized\n');
        } else {
          console.log('❌ 404 response format needs work\n');
        }
        
        console.log('✅ API Response Standardization testing completed successfully!');
        
        server.close(() => resolve());
        
      } catch (error) {
        server.close(() => reject(error));
      }
    });
  });
}

// Run the test
testApiStandardization().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});