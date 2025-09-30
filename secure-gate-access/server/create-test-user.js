// Create a test resident user for API testing
import pool from './src/database/db.js';
import bcrypt from 'bcryptjs';

const testUser = {
    email: 'resident@test.com',
    password: 'testpassword123',
    role: 'resident',
    name: 'Test Resident'
};

async function createTestUser() {
    try {
        console.log('🔍 Checking if test user exists...');
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT email, role, username FROM users WHERE email = $1', [testUser.email]);
        
        if (existingUser.rowCount > 0) {
            console.log('✅ Test user already exists:', existingUser.rows[0]);
            return;
        }
        
        console.log('👤 Creating test user...');
        
        // Hash password
        const hashedPassword = await bcrypt.hash(testUser.password, 10);
        
        // Insert user
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, role, username) VALUES ($1, $2, $3, $4) RETURNING id, email, role, username',
            [testUser.email, hashedPassword, testUser.role, testUser.name]
        );
        
        console.log('✅ Test user created:', result.rows[0]);
        
    } catch (error) {
        console.error('❌ Error creating test user:', error.message);
    } finally {
        process.exit(0);
    }
}

createTestUser();
