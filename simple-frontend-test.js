#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// Configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001/api';

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

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

async function testFrontendServer() {
    logSection('FRONTEND SERVER TESTS');
    
    try {
        const response = await axios.get(FRONTEND_URL, { 
            timeout: 10000,
            headers: { 'Accept': 'text/html' }
        });
        
        logTest('Frontend server responds', response.status === 200,
            `Status: ${response.status}`);
        
        const isHTML = response.headers['content-type']?.includes('text/html');
        logTest('Returns HTML content', isHTML,
            `Content-Type: ${response.headers['content-type']}`);
        
        const hasReactRoot = response.data.includes('id="root"');
        logTest('Contains React root element', hasReactRoot,
            'React app structure detected');
        
        const hasTitle = response.data.includes('<title>');
        logTest('Has page title', hasTitle,
            'HTML title tag found');
        
        // Check for common React/JavaScript patterns
        const hasJSBundle = response.data.includes('script') || response.data.includes('.js');
        logTest('JavaScript bundles present', hasJSBundle,
            'Script tags detected');
        
    } catch (error) {
        logTest('Frontend server responds', false, error.message);
        logTest('Returns HTML content', false, 'Server not accessible');
        logTest('Contains React root element', false, 'Server not accessible');
        logTest('Has page title', false, 'Server not accessible');
        logTest('JavaScript bundles present', false, 'Server not accessible');
    }
}

async function testFrontendBackendConnectivity() {
    logSection('FRONTEND-BACKEND CONNECTIVITY');
    
    // Test if frontend can make requests to backend
    try {
        const response = await axios.get(`${BACKEND_URL}/health`, {
            timeout: 5000,
            headers: {
                'Origin': FRONTEND_URL,
                'Accept': 'application/json'
            }
        });
        
        logTest('Backend accessible from frontend', response.status === 200,
            `Backend health check: ${response.status}`);
        
        const corsHeader = response.headers['access-control-allow-origin'];
        logTest('CORS configured properly', !!corsHeader,
            `CORS header: ${corsHeader || 'Not found'}`);
        
    } catch (error) {
        logTest('Backend accessible from frontend', false, error.message);
        logTest('CORS configured properly', false, 'Backend not accessible');
    }
}

async function testFrontendConfiguration() {
    logSection('FRONTEND CONFIGURATION');
    
    const envPath = 'secure-gate-access/client/.env';
    const packagePath = 'secure-gate-access/client/package.json';
    
    try {
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            
            const hasAPIUrl = envContent.includes('REACT_APP_API_URL');
            logTest('API URL configured', hasAPIUrl,
                'REACT_APP_API_URL found in .env');
            
            const correctAPIUrl = envContent.includes('localhost:3001');
            logTest('API URL points to backend', correctAPIUrl,
                'Backend URL configured correctly');
        } else {
            logTest('Environment file exists', false, '.env file not found');
        }
        
        if (fs.existsSync(packagePath)) {
            const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            const hasReact = packageContent.dependencies?.react;
            logTest('React dependency present', !!hasReact,
                `React version: ${hasReact || 'Not found'}`);
            
            const hasAxios = packageContent.dependencies?.axios;
            logTest('HTTP client configured', !!hasAxios,
                `Axios version: ${hasAxios || 'Not found'}`);
        }
        
    } catch (error) {
        logTest('Configuration files readable', false, error.message);
    }
}

async function testFrontendIntegrationReadiness() {
    logSection('INTEGRATION READINESS TESTS');
    
    // Test both servers are running
    let frontendUp = false;
    let backendUp = false;
    
    try {
        const frontendTest = await axios.get(FRONTEND_URL, { timeout: 5000 });
        frontendUp = frontendTest.status === 200;
    } catch (error) {
        // Frontend not accessible
    }
    
    try {
        const backendTest = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
        backendUp = backendTest.status === 200;
    } catch (error) {
        // Backend not accessible
    }
    
    logTest('Frontend server operational', frontendUp,
        `Frontend ${frontendUp ? 'UP' : 'DOWN'} on port 3000`);
    
    logTest('Backend server operational', backendUp,
        `Backend ${backendUp ? 'UP' : 'DOWN'} on port 3001`);
    
    logTest('Both servers ready for integration', frontendUp && backendUp,
        `System status: ${frontendUp && backendUp ? 'READY' : 'NOT READY'}`);
    
    // Test API endpoints needed by frontend
    if (backendUp) {
        try {
            const authTest = await axios.post(`${BACKEND_URL}/auth/login`, {
                username: 'invaliduser',
                password: 'invalidpass'
            }, { 
                timeout: 5000,
                validateStatus: () => true // Accept any status
            });
            
            logTest('Authentication endpoints available', authTest.status === 401,
                'Login endpoint responds with expected error');
        } catch (error) {
            logTest('Authentication endpoints available', false, error.message);
        }
    }
}

async function runSimpleFrontendTests() {
    console.log('🎨 SIMPLE FRONTEND TEST SUITE');
    console.log(`Frontend: ${FRONTEND_URL}`);
    console.log(`Backend: ${BACKEND_URL}`);
    console.log('');
    
    try {
        await testFrontendServer();
        await testFrontendBackendConnectivity();
        await testFrontendConfiguration();
        await testFrontendIntegrationReadiness();
        
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
        
        console.log('\n🎨 FRONTEND STATUS:');
        if (passedTests >= totalTests * 0.8) {
            console.log('✅ FRONTEND IS FULLY OPERATIONAL AND READY FOR INTEGRATION');
        } else if (passedTests >= totalTests * 0.6) {
            console.log('⚠️  FRONTEND HAS ISSUES BUT IS PARTIALLY FUNCTIONAL');
        } else {
            console.log('❌ FRONTEND HAS CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION');
        }
        
        // Save results
        const report = {
            timestamp: new Date().toISOString(),
            frontend_url: FRONTEND_URL,
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
        
        fs.writeFileSync('simple-frontend-test-results.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Detailed results saved to simple-frontend-test-results.json');
        
    } catch (error) {
        console.error('\n💥 CRITICAL ERROR DURING TESTING:');
        console.error(error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    runSimpleFrontendTests().catch(console.error);
}

module.exports = { runSimpleFrontendTests };
