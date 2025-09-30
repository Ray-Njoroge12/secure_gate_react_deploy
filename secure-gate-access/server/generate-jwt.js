// Generate JWT token for API testing
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SECRET = process.env.JWT_SECRET || 'dev_secret_please_change_to_real_random_value_32chars';

const token = jwt.sign(
  { email: 'resident@test.com', role: 'resident' }, 
  SECRET, 
  { expiresIn: '1h' }
);

console.log('JWT Token for API testing:');
console.log(token);
