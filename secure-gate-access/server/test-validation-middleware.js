import express from 'express';
import { globalErrorHandler, requestIdMiddleware } from './src/middleware/errorHandler.js';
import { validateRequest, ValidationSchemas } from './src/middleware/validationMiddleware.js';

// Test the validation middleware integration
const app = express();

app.use(requestIdMiddleware);
app.use(express.json());

// Test route with validation
app.post('/test/user/register', 
  validateRequest(ValidationSchemas.userRegistration),
  (req, res) => {
    res.json({ success: true, message: 'Validation passed', data: req.body });
  }
);

app.use(globalErrorHandler);

async function testValidationMiddleware() {
  console.log('Testing validation middleware integration...\n');
  
  const server = app.listen(3002, async () => {
    try {
      // Test 1: Valid data
      console.log('1. Testing valid registration data...');
      const validResponse = await fetch('http://localhost:3002/test/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser123',
          password: 'Password123!',
          role: 'resident'
        })
      });
      
      const validData = await validResponse.json();
      console.log('Valid response:', JSON.stringify(validData, null, 2));
      
      // Test 2: Invalid data
      console.log('\n2. Testing invalid registration data...');
      const invalidResponse = await fetch('http://localhost:3002/test/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          username: 'ab', // too short
          password: 'weak' // weak password
        })
      });
      
      const invalidData = await invalidResponse.json();
      console.log('Invalid response:', JSON.stringify(invalidData, null, 2));
      
      if (invalidData.success === false && invalidData.error && invalidData.error.details) {
        console.log('✅ Validation middleware correctly integrated with error handling');
      } else {
        console.log('❌ Validation middleware integration needs work');
      }
      
      console.log('\n✅ Validation middleware integration testing completed!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      server.close();
    }
  });
}

testValidationMiddleware();