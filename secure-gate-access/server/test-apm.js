#!/usr/bin/env node
/**
 * Quick APM test script - generates requests and checks metrics
 */

import http from 'http';

const makeRequest = (path, method = 'GET') => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' // Add token if needed
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: data,
                    path: path
                });
            });
        });

        req.on('error', reject);
        req.end();
    });
};

async function testAPM() {
    console.log('🚀 Testing APM Integration...\n');

    // Generate some traffic
    const requests = [
        '/health',
        '/health/detailed',
        '/api/auth/login', // This will fail but generate metrics
        '/api/visitors', // This will fail but generate metrics
        '/api/metrics', // This will fail (need auth) but generate metrics
        '/health', // Duplicate to show multiple requests
        '/nonexistent' // 404 to test error tracking
    ];

    console.log('📊 Generating test traffic...');
    for (const path of requests) {
        try {
            const result = await makeRequest(path);
            console.log(`${result.status} ${path}`);
        } catch (error) {
            console.log(`ERR ${path}: ${error.message}`);
        }
        // Small delay between requests
        await new Promise(r => setTimeout(r, 100));
    }

    console.log('\n📈 Checking APM metrics...');
    
    // Check the health endpoint (should work without auth)
    try {
        const health = await makeRequest('/health');
        console.log('Health check:', health.status === 200 ? '✅ OK' : '❌ FAIL');
    } catch (error) {
        console.log('Health check failed:', error.message);
    }

    console.log('\n✨ APM test complete! Check server logs for APM middleware output.');
}

testAPM().catch(console.error);