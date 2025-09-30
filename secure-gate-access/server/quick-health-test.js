// Quick health test for post-cleanup validation
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET'
};

console.log('🔍 Testing server health endpoint...');

const req = http.request(options, (res) => {
  console.log(`✅ Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📊 Response Body:', data);
    console.log('✅ Health check completed successfully');
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('❌ Health check failed:', error.message);
  console.log('⚠️  Server may not be running or endpoint may be unavailable');
  process.exit(1);
});

req.setTimeout(10000, () => {
  console.error('❌ Request timeout');
  req.destroy();
  process.exit(1);
});

req.end();