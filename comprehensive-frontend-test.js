#!/usr/bin/env node

console.log('🎨 COMPREHENSIVE FRONTEND ANALYSIS & TESTING SUITE');
console.log('================================================\n');

async function testFrontendServerHealth() {
    console.log('📡 1. FRONTEND SERVER HEALTH TESTS');
    console.log('==================================');
    
    const tests = [];
    
    // Test 1: Basic HTTP Response
    try {
        const response = await fetch('http://localhost:3000', {
            method: 'HEAD',
            timeout: 10000
        });
        console.log(`   ✅ HTTP Response: ${response.status} ${response.statusText}`);
        console.log(`   📄 Content-Type: ${response.headers.get('content-type') || 'Not specified'}`);
        tests.push({ name: 'HTTP Response', status: 'PASS' });
    } catch (error) {
        console.log(`   ❌ HTTP Response Failed: ${error.message}`);
        tests.push({ name: 'HTTP Response', status: 'FAIL' });
    }
    
    // Test 2: HTML Content Delivery
    try {
        const response = await fetch('http://localhost:3000');
        const html = await response.text();
        
        if (html.includes('<div id="root">') || html.includes('react')) {
            console.log('   ✅ React App Container: Found');
            tests.push({ name: 'React Container', status: 'PASS' });
        } else {
            console.log('   ❌ React App Container: Not found');
            tests.push({ name: 'React Container', status: 'FAIL' });
        }
        
        if (html.includes('<title>')) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1] : 'Found but empty';
            console.log(`   ✅ Page Title: "${title}"`);
            tests.push({ name: 'Page Title', status: 'PASS' });
        } else {
            console.log('   ❌ Page Title: Not found');
            tests.push({ name: 'Page Title', status: 'FAIL' });
        }
        
    } catch (error) {
        console.log(`   ❌ HTML Content Test Failed: ${error.message}`);
        tests.push({ name: 'HTML Content', status: 'FAIL' });
    }
    
    // Test 3: Static Asset Loading
    try {
        const response = await fetch('http://localhost:3000/static/js/bundle.js');
        if (response.ok) {
            console.log('   ✅ JavaScript Bundle: Accessible');
            tests.push({ name: 'JS Bundle', status: 'PASS' });
        } else {
            console.log(`   ⚠️  JavaScript Bundle: ${response.status} (may be different path)`);
            tests.push({ name: 'JS Bundle', status: 'WARN' });
        }
    } catch (error) {
        console.log('   ⚠️  JavaScript Bundle: Path unknown (normal for dev)');
        tests.push({ name: 'JS Bundle', status: 'WARN' });
    }
    
    return tests;
}

async function testFrontendRouting() {
    console.log('\n🛣️  2. FRONTEND ROUTING & NAVIGATION TESTS');
    console.log('==========================================');
    
    const tests = [];
    const routes = [
        { path: '/', name: 'Home/Root' },
        { path: '/login', name: 'Login Page' },
        { path: '/register', name: 'Registration Page' },
        { path: '/dashboard', name: 'Dashboard' },
        { path: '/profile', name: 'Profile' }
    ];
    
    for (const route of routes) {
        try {
            const response = await fetch(`http://localhost:3000${route.path}`);
            const html = await response.text();
            
            if (response.ok) {
                // Check if it's a proper React route (not a 404)
                if (html.includes('<div id="root">') && html.includes('<!DOCTYPE html>')) {
                    console.log(`   ✅ ${route.name} (${route.path}): ${response.status}`);
                    tests.push({ name: route.name, status: 'PASS' });
                } else {
                    console.log(`   ⚠️  ${route.name} (${route.path}): ${response.status} (may be SPA route)`);
                    tests.push({ name: route.name, status: 'WARN' });
                }
            } else {
                console.log(`   ❌ ${route.name} (${route.path}): ${response.status}`);
                tests.push({ name: route.name, status: 'FAIL' });
            }
        } catch (error) {
            console.log(`   ❌ ${route.name} (${route.path}): ${error.message}`);
            tests.push({ name: route.name, status: 'FAIL' });
        }
    }
    
    return tests;
}

async function testFrontendAPIConfiguration() {
    console.log('\n🔧 3. FRONTEND API CONFIGURATION TESTS');
    console.log('======================================');
    
    const tests = [];
    
    // Test environment configuration
    console.log('   📋 Checking Frontend Environment Configuration:');
    
    // Since we can't directly access process.env from outside, we'll test API calls
    try {
        // Test if frontend can make requests to expected backend
        const response = await fetch('http://localhost:3000');
        const html = await response.text();
        
        // Look for API base URL in the HTML or check for common patterns
        if (html.includes('localhost:3001') || html.includes('3001')) {
            console.log('   ✅ Backend API URL: Configured for localhost:3001');
            tests.push({ name: 'API Configuration', status: 'PASS' });
        } else {
            console.log('   ⚠️  Backend API URL: Configuration unclear from HTML');
            tests.push({ name: 'API Configuration', status: 'WARN' });
        }
        
        // Check for development indicators
        if (html.includes('development') || html.includes('webpack')) {
            console.log('   ✅ Development Mode: Detected');
            tests.push({ name: 'Development Mode', status: 'PASS' });
        } else {
            console.log('   ⚠️  Development Mode: Not clearly indicated');
            tests.push({ name: 'Development Mode', status: 'WARN' });
        }
        
    } catch (error) {
        console.log(`   ❌ Configuration Test Failed: ${error.message}`);
        tests.push({ name: 'API Configuration', status: 'FAIL' });
    }
    
    return tests;
}

async function testFrontendSecurity() {
    console.log('\n🔒 4. FRONTEND SECURITY HEADERS TESTS');
    console.log('=====================================');
    
    const tests = [];
    
    try {
        const response = await fetch('http://localhost:3000');
        
        // Check security headers
        const securityHeaders = [
            'X-Content-Type-Options',
            'X-Frame-Options', 
            'X-XSS-Protection',
            'Strict-Transport-Security',
            'Content-Security-Policy'
        ];
        
        securityHeaders.forEach(header => {
            const value = response.headers.get(header);
            if (value) {
                console.log(`   ✅ ${header}: ${value}`);
                tests.push({ name: header, status: 'PASS' });
            } else {
                console.log(`   ⚠️  ${header}: Not set (normal for dev server)`);
                tests.push({ name: header, status: 'WARN' });
            }
        });
        
        // Check CORS headers
        const corsHeader = response.headers.get('Access-Control-Allow-Origin');
        if (corsHeader) {
            console.log(`   ⚠️  CORS Allow-Origin: ${corsHeader} (should be backend's job)`);
            tests.push({ name: 'CORS Headers', status: 'WARN' });
        } else {
            console.log('   ✅ CORS Headers: Not set (correct for frontend)');
            tests.push({ name: 'CORS Headers', status: 'PASS' });
        }
        
    } catch (error) {
        console.log(`   ❌ Security Headers Test Failed: ${error.message}`);
        tests.push({ name: 'Security Headers', status: 'FAIL' });
    }
    
    return tests;
}

async function testFrontendPerformance() {
    console.log('\n⚡ 5. FRONTEND PERFORMANCE TESTS');
    console.log('===============================');
    
    const tests = [];
    
    // Test response times
    const performanceTests = [
        { name: 'Initial Page Load', path: '/' },
        { name: 'Login Page Load', path: '/login' },
        { name: 'Register Page Load', path: '/register' }
    ];
    
    for (const test of performanceTests) {
        try {
            const startTime = Date.now();
            const response = await fetch(`http://localhost:3000${test.path}`);
            const endTime = Date.now();
            const loadTime = endTime - startTime;
            
            if (response.ok) {
                if (loadTime < 1000) {
                    console.log(`   ✅ ${test.name}: ${loadTime}ms (Fast)`);
                    tests.push({ name: test.name, status: 'PASS' });
                } else if (loadTime < 3000) {
                    console.log(`   ⚠️  ${test.name}: ${loadTime}ms (Acceptable)`);
                    tests.push({ name: test.name, status: 'WARN' });
                } else {
                    console.log(`   ❌ ${test.name}: ${loadTime}ms (Slow)`);
                    tests.push({ name: test.name, status: 'FAIL' });
                }
            } else {
                console.log(`   ❌ ${test.name}: HTTP ${response.status}`);
                tests.push({ name: test.name, status: 'FAIL' });
            }
        } catch (error) {
            console.log(`   ❌ ${test.name}: ${error.message}`);
            tests.push({ name: test.name, status: 'FAIL' });
        }
    }
    
    return tests;
}

async function generateFrontendReport(allTests) {
    console.log('\n📊 FRONTEND COMPREHENSIVE TEST SUMMARY');
    console.log('======================================');
    
    let totalTests = 0;
    let passedTests = 0;
    let warnings = 0;
    
    const categories = Object.keys(allTests);
    
    categories.forEach(category => {
        console.log(`\n📋 ${category}:`);
        allTests[category].forEach(test => {
            totalTests++;
            if (test.status === 'PASS') {
                passedTests++;
                console.log(`   ✅ ${test.name}`);
            } else if (test.status === 'WARN') {
                warnings++;
                console.log(`   ⚠️  ${test.name}`);
            } else {
                console.log(`   ❌ ${test.name}`);
            }
        });
    });
    
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    
    console.log('\n🎯 FRONTEND SYSTEM ASSESSMENT:');
    console.log(`   📈 Tests Passed: ${passedTests}/${totalTests} (${passRate}%)`);
    console.log(`   ⚠️  Warnings: ${warnings}`);
    
    if (passRate >= 80) {
        console.log('   🎉 FRONTEND STATUS: EXCELLENT - Ready for integration testing');
    } else if (passRate >= 60) {
        console.log('   ⚠️  FRONTEND STATUS: GOOD - Minor issues detected');
    } else {
        console.log('   ❌ FRONTEND STATUS: NEEDS ATTENTION - Multiple issues found');
    }
    
    return { totalTests, passedTests, warnings, passRate };
}

async function runFrontendTests() {
    const startTime = Date.now();
    
    const serverTests = await testFrontendServerHealth();
    const routingTests = await testFrontendRouting();
    const configTests = await testFrontendAPIConfiguration();
    const securityTests = await testFrontendSecurity();
    const performanceTests = await testFrontendPerformance();
    
    const allTests = {
        'Server Health': serverTests,
        'Routing & Navigation': routingTests,
        'API Configuration': configTests,
        'Security Headers': securityTests,
        'Performance': performanceTests
    };
    
    const results = await generateFrontendReport(allTests);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`\n⏱️  Total Test Duration: ${duration}ms`);
    console.log('🔗 Frontend Server: http://localhost:3000');
    
    return results;
}

// Run the comprehensive frontend tests
runFrontendTests().catch(console.error);
