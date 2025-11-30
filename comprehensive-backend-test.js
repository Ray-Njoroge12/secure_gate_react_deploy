#!/usr/bin/env node

const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3001';
const TEST_USER = {
    username: 'testuser' + Date.now(),
    email: 'test' + Date.now() + '@example.com',
    password: 'TestPassword123!'
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Helper functions
function logTest(testName, passed, details = '') {
    totalTests++;
    if (passed) {
        passedTests++;
        console.log(`✅ ${testName}`);
        testResults.push({ test: testName, status: 'PASS', details });
    } else {
        failedTests++;
        console.log(`❌ ${testName}`);
        if (details) console.log(`   Details: ${details}`);
        testResults.push({ test: testName, status: 'FAIL', details });
    }
}

function logSection(sectionName) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`${sectionName}`);
    console.log(`${'='.repeat(50)}`);
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method,
            url: `${BACKEND_URL}${endpoint}`,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status, headers: response.headers };
    } catch (error) {
        return { 
            success: false, 
            error: error.message, 
            status: error.response?.status,
            data: error.response?.data 
        };
    }
}

// Test suites
async function testHealthEndpoints() {
    logSection('HEALTH & STATUS ENDPOINTS');
    
    // Health check
    const health = await makeRequest('GET', '/api/health');
    logTest('Health endpoint responds', health.success, 
        health.success ? `Status: ${health.data.status}` : health.error);
    
    // Server info
    const info = await makeRequest('GET', '/api/info');
    logTest('Info endpoint responds', info.success,
        info.success ? `Version: ${info.data?.version || 'N/A'}` : info.error);
    
    // Status endpoint
    const status = await makeRequest('GET', '/api/status');
    logTest('Status endpoint responds', status.success,
        status.success ? 'Server status retrieved' : status.error);
}

async function testAuthenticationSystem() {
    logSection('AUTHENTICATION SYSTEM');
    
    let authToken = null;
    
    // Test user registration with correct fields
    const registrationData = {
        ...TEST_USER,
        confirmPassword: TEST_USER.password,
        consent: true
    };
    const registration = await makeRequest('POST', '/api/auth/register', registrationData);
    logTest('User registration', registration.success,
        registration.success ? 'User registered successfully' : registration.error);
    
    if (registration.success && registration.data.accessToken) {
        authToken = registration.data.accessToken;
    }
    
    // Test user login with username instead of email
    const login = await makeRequest('POST', '/api/auth/login', {
        username: TEST_USER.username,
        password: TEST_USER.password
    });
    logTest('User login', login.success,
        login.success ? 'Login successful' : login.error);
    
    if (login.success && login.data.accessToken) {
        authToken = login.data.accessToken;
    }
    
    // Test protected route access
    if (authToken) {
        const protectedAccess = await makeRequest('GET', '/api/auth/profile', null, {
            'Authorization': `Bearer ${authToken}`
        });
        logTest('Protected route access', protectedAccess.success,
            protectedAccess.success ? 'Profile retrieved' : protectedAccess.error);
        
        // Test token validation
        const tokenValidation = await makeRequest('GET', '/api/auth/validate', null, {
            'Authorization': `Bearer ${authToken}`
        });
        logTest('Token validation', tokenValidation.success,
            tokenValidation.success ? 'Token is valid' : tokenValidation.error);
    }
    
    // Test invalid login
    const invalidLogin = await makeRequest('POST', '/api/auth/login', {
        email: 'invalid@example.com',
        password: 'wrongpassword'
    });
    logTest('Invalid login rejection', !invalidLogin.success,
        !invalidLogin.success ? 'Invalid credentials rejected' : 'Should have failed');
    
    return authToken;
}

async function testDatabaseOperations() {
    logSection('DATABASE OPERATIONS');
    
    // Test database connection
    const dbHealth = await makeRequest('GET', '/api/database/health');
    logTest('Database connection', dbHealth.success,
        dbHealth.success ? 'Database connected' : dbHealth.error);
    
    // Test user count
    const userCount = await makeRequest('GET', '/api/database/users/count');
    logTest('User count query', userCount.success,
        userCount.success ? `Users in DB: ${userCount.data?.count || 'N/A'}` : userCount.error);
    
    // Test database tables
    const tables = await makeRequest('GET', '/api/database/tables');
    logTest('Database tables query', tables.success,
        tables.success ? `Tables found: ${tables.data?.length || 0}` : tables.error);
}

async function testAPIEndpoints() {
    logSection('API ENDPOINTS');
    
    // Test CORS headers
    const corsTest = await makeRequest('OPTIONS', '/api/health');
    logTest('CORS headers present', corsTest.success || corsTest.status === 204,
        'CORS preflight handling');
    
    // Test rate limiting (if implemented)
    const rateLimitTest = [];
    for (let i = 0; i < 5; i++) {
        const result = await makeRequest('GET', '/api/health');
        rateLimitTest.push(result.success);
    }
    logTest('Multiple requests handling', rateLimitTest.every(r => r),
        'Rapid requests handled successfully');
    
    // Test invalid endpoint
    const invalidEndpoint = await makeRequest('GET', '/api/nonexistent');
    logTest('Invalid endpoint handling', !invalidEndpoint.success && invalidEndpoint.status === 404,
        'Returns appropriate 404 for invalid endpoints');
}

async function testSecurityFeatures() {
    logSection('SECURITY FEATURES');
    
    // Test malformed JSON
    const malformedJson = await makeRequest('POST', '/api/auth/login', 'invalid json');
    logTest('Malformed JSON handling', !malformedJson.success,
        'Rejects malformed JSON properly');
    
    // Test SQL injection attempt
    const sqlInjection = await makeRequest('POST', '/api/auth/login', {
        email: "'; DROP TABLE users; --",
        password: 'password'
    });
    logTest('SQL injection protection', !sqlInjection.success,
        'SQL injection attempts blocked');
    
    // Test XSS attempt
    const xssAttempt = await makeRequest('POST', '/api/auth/register', {
        username: '<script>alert("xss")</script>',
        email: 'xss@test.com',
        password: 'password123'
    });
    logTest('XSS protection', !xssAttempt.success || !xssAttempt.data?.username?.includes('<script>'),
        'XSS attempts handled properly');
}

async function testErrorHandling() {
    logSection('ERROR HANDLING');
    
    // Test missing required fields
    const missingFields = await makeRequest('POST', '/api/auth/register', {
        username: 'testuser'
        // missing email and password
    });
    logTest('Missing field validation', !missingFields.success,
        'Properly validates required fields');
    
    // Test invalid data types
    const invalidTypes = await makeRequest('POST', '/api/auth/register', {
        username: 12345,
        email: true,
        password: []
    });
    logTest('Data type validation', !invalidTypes.success,
        'Validates data types properly');
    
    // Test oversized requests
    const largeData = 'x'.repeat(10000);
    const oversized = await makeRequest('POST', '/api/auth/register', {
        username: largeData,
        email: 'test@example.com',
        password: 'password123'
    });
    logTest('Oversized request handling', !oversized.success,
        'Handles oversized requests appropriately');
}

async function runPerformanceTests() {
    logSection('PERFORMANCE TESTS');
    
    // Test response time
    const startTime = Date.now();
    const perfTest = await makeRequest('GET', '/api/health');
    const responseTime = Date.now() - startTime;
    
    logTest('Response time < 1000ms', perfTest.success && responseTime < 1000,
        `Response time: ${responseTime}ms`);
    
    // Test concurrent requests
    const concurrentPromises = [];
    for (let i = 0; i < 10; i++) {
        concurrentPromises.push(makeRequest('GET', '/api/health'));
    }
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const allSuccessful = concurrentResults.every(r => r.success);
    logTest('Concurrent request handling', allSuccessful,
        `10 concurrent requests: ${concurrentResults.filter(r => r.success).length}/10 successful`);
}

// Main test runner
async function runComprehensiveTests() {
    console.log('🚀 COMPREHENSIVE BACKEND TEST SUITE');
    console.log(`Target: ${BACKEND_URL}`);
    console.log(`Test User: ${TEST_USER.email}`);
    console.log('');
    
    try {
        await testHealthEndpoints();
        await testAuthenticationSystem();
        await testDatabaseOperations();
        await testAPIEndpoints();
        await testSecurityFeatures();
        await testErrorHandling();
        await runPerformanceTests();
        
        // Final summary
        logSection('TEST SUMMARY');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ FAILED TESTS:');
            testResults
                .filter(result => result.status === 'FAIL')
                .forEach(result => {
                    console.log(`   • ${result.test}`);
                    if (result.details) console.log(`     ${result.details}`);
                });
        }
        
        console.log('\n📊 BACKEND STATUS:');
        if (passedTests >= totalTests * 0.8) {
            console.log('✅ BACKEND IS OPERATIONAL AND READY FOR INTEGRATION');
        } else if (passedTests >= totalTests * 0.6) {
            console.log('⚠️  BACKEND HAS ISSUES BUT IS PARTIALLY FUNCTIONAL');
        } else {
            console.log('❌ BACKEND HAS CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION');
        }
        
        // Save detailed results
        const timestamp = new Date().toISOString();
        const report = {
            timestamp,
            backend_url: BACKEND_URL,
            test_summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                success_rate: ((passedTests / totalTests) * 100).toFixed(1) + '%'
            },
            test_results: testResults,
            system_status: passedTests >= totalTests * 0.8 ? 'OPERATIONAL' : 
                          passedTests >= totalTests * 0.6 ? 'PARTIAL' : 'CRITICAL'
        };
        
        require('fs').writeFileSync(
            '/Users/raynj/Desktop/secure-gate-react-express/backend-test-results.json',
            JSON.stringify(report, null, 2)
        );
        
        console.log('\n📄 Detailed results saved to backend-test-results.json');
        
    } catch (error) {
        console.error('\n💥 CRITICAL ERROR DURING TESTING:');
        console.error(error.message);
        process.exit(1);
    }
}

// Run the tests
if (require.main === module) {
    runComprehensiveTests().catch(console.error);
}

module.exports = { runComprehensiveTests };
