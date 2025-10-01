#!/usr/bin/env node

const RedisServer = require('redis-server');

// Create Redis server instance
const server = new RedisServer({
  port: 6379,
  bin: process.platform === 'win32' ? 'redis-server.exe' : 'redis-server'
});

// Start Redis server
server.open((err) => {
  if (err === null) {
    console.log('✅ Redis server started on port 6379');
  } else {
    console.error('❌ Failed to start Redis server:', err.message);
    console.log('🔄 Attempting to start without binary...');

    // Fallback: try without specifying binary path
    const fallbackServer = new RedisServer(6379);
    fallbackServer.open((fallbackErr) => {
      if (fallbackErr === null) {
        console.log('✅ Redis server started on port 6379 (fallback mode)');
      } else {
        console.error('❌ Redis server startup failed completely:', fallbackErr.message);
        console.log('⚠️  Continuing without Redis - session management will use memory store');
        process.exit(1);
      }
    });
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Shutting down Redis server...');
  server.close(() => {
    console.log('✅ Redis server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🔄 Shutting down Redis server...');
  server.close(() => {
    console.log('✅ Redis server stopped');
    process.exit(0);
  });
});