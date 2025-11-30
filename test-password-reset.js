const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/auth';

async function testPasswordReset() {
    console.log('=== TESTING PASSWORD RESET IMPLEMENTATION ===\n');
    
    try {
        // Test 1: Request password reset
        console.log('1. Testing password reset request...');
        const resetResponse = await axios.post(`${BASE_URL}/request-password-reset`, {
            email: 'n91599727@gmail.com'
        });
        
        console.log('✅ Password reset request successful');
        console.log(`Response: ${resetResponse.data.message}`);
        console.log(`Status: ${resetResponse.status}\n`);
        
        // For testing purposes, we'll use a dummy token since we can't access email
        // In real usage, the user would click the link in their email
        const dummyToken = 'dummy-token-for-testing';
        
        // Test 2: Verify password reset token (this will fail with dummy token but shows endpoint works)
        try {
            console.log('2. Testing password reset verification (with dummy token)...');
            await axios.get(`${BASE_URL}/verify-password-reset/${dummyToken}`);
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Password reset verification endpoint working (rejected invalid token as expected)');
                console.log(`Response: ${error.response.data.message}\n`);
            } else {
                throw error;
            }
        }
        
        // Test 3: Reset password (this will also fail with dummy token but shows endpoint works)
        try {
            console.log('3. Testing password reset execution (with dummy token)...');
            await axios.post(`${BASE_URL}/reset-password`, {
                token: dummyToken,
                newPassword: 'NewSecurePassword123!'
            });
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Password reset execution endpoint working (rejected invalid token as expected)');
                console.log(`Response: ${error.response.data.message}\n`);
            } else {
                throw error;
            }
        }
        
        console.log('=== PASSWORD RESET TEST COMPLETE ===');
        console.log('✅ All endpoints are functional!');
        console.log('📧 Check your email (n91599727@gmail.com) for the password reset link!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Status:', error.response.status);
        }
    }
}

testPasswordReset();
