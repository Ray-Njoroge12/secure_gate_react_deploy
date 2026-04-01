// Simple HTTP server to generate a trace for Datadog dd-trace verification
// Run with: ENABLE_DD_TRACE=true node --import ./load-env.js scripts/dd-trace-test.js

const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/test') {
    // Simulate some work
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    }, 50);
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(0, '127.0.0.1', () => {
  const addr = server.address();
  const port = addr && addr.port ? addr.port : 8127;
  console.log('Test HTTP server listening on', port);

  const options = {
    hostname: '127.0.0.1',
    port,
    path: '/test',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log('Response status:', res.statusCode);
    res.on('data', () => {});
    res.on('end', () => {
      console.log('Request completed, closing server');
      server.close(() => process.exit(0));
    });
  });

  req.on('error', (err) => {
    console.error('Error during test request:', err);
    process.exit(1);
  });

  req.end();
});
