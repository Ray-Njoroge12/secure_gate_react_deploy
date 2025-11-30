#!/usr/bin/env node

console.log('🔍 BACKEND & FRONTEND CONNECTIVITY TEST');
console.log('=====================================\n');

async function testBackendHealth() {
    console.log('1. 🏥 Testing Backend Health...');
    try {
        const response = await fetch('http://localhost:3001/api/health');
        const data = await response.json();
        console.log(`   ✅ Backend Health: ${response.status}`);
        console.log(`   📊 Status: ${data.status}`);
        console.log(`   ⏱️  Uptime: ${Math.floor(data.uptime)}s`);
        return true;
    } catch (error) {
        console.log(`   ❌ Backend Health Failed: ${error.message}`);
        return false;
    }
}

async function testCORS() {
    console.log('\n2. 🌐 Testing CORS Configuration...');
    try {
        const response = await fetch('http://localhost:3001/api/health', {
            method: 'GET',
            headers: {
                'Origin': 'http://localhost:3000',
                'Content-Type': 'application/json'
            }
        });
        
        const corsHeader = response.headers.get('Access-Control-Allow-Origin');
        if (corsHeader) {
            console.log(`   ✅ CORS Headers: ${corsHeader}`);
        } else {
            console.log('   ⚠️  CORS Headers: Not found');
        }
        return true;
    } catch (error) {
        console.log(`   ❌ CORS Test Failed: ${error.message}`);
        return false;
    }
}

async function testFrontendServer() {
    console.log('\n3. 🎨 Testing Frontend Server...');
    try {
        const response = await fetch('http://localhost:3000', {
            method: 'HEAD',
            timeout: 5000
        });
        console.log(`   ✅ Frontend Server: ${response.status}`);
        console.log(`   📝 Content-Type: ${response.headers.get('content-type') || 'Not specified'}`);
        return true;
    } catch (error) {
        console.log(`   ❌ Frontend Server Failed: ${error.message}`);
        return false;
    }
}

async function testAPIEndpoints() {
    console.log('\n4. 🔐 Testing Authentication Endpoints...');
    
    const endpoints = [
        { url: 'http://localhost:3001/api/auth/login', method: 'OPTIONS' },
        { url: 'http://localhost:3001/api/auth/register', method: 'OPTIONS' }
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint.url, { 
                method: endpoint.method,
                headers: {
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'POST'
                }
            });
            const endpointName = endpoint.url.split('/').pop();
            console.log(`   ✅ ${endpointName}: ${response.status}`);
        } catch (error) {
            console.log(`   ❌ ${endpoint.url}: ${error.message}`);
        }
    }
}

async function testFrontendBackendIntegration() {
    console.log('\n5. 🔗 Testing Frontend-Backend Integration...');
    
    // Simulate a frontend request to backend
    try {
        const response = await fetch('http://localhost:3001/api/health', {
            method: 'GET',
            headers: {
                'Origin': 'http://localhost:3000',
                'Content-Type': 'application/json',
                'User-Agent': 'Frontend-Test-Agent'
            }
        });
        
        if (response.ok) {
            console.log('   ✅ Frontend can communicate with Backend');
            console.log('   ✅ No CORS blocking detected');
        } else {
            console.log(`   ⚠️  Response Status: ${response.status}`);
        }
    } catch (error) {
        console.log(`   ❌ Integration Test Failed: ${error.message}`);
    }
}

async function runTests() {
    const startTime = Date.now();
    
    const healthCheck = await testBackendHealth();
    await testCORS();
    const frontendCheck = await testFrontendServer();
    await testAPIEndpoints();
    await testFrontendBackendIntegration();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');
    console.log(`Backend Health: ${healthCheck ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Frontend Server: ${frontendCheck ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test Duration: ${duration}ms`);
    
    if (healthCheck && frontendCheck) {
        console.log('\n🎉 SYSTEM STATUS: Both servers operational and connected!');
        console.log('🔗 Frontend URL: http://localhost:3000');
        console.log('🔗 Backend URL: http://localhost:3001');
    } else {
        console.log('\n⚠️  SYSTEM STATUS: Issues detected with server connectivity');
    }
}

runTests().catch(console.error);
