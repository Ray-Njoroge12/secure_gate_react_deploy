#!/bin/bash

# Test Runner Script
# Starts server and runs integration tests

echo "🚀 Starting Secure Gate Backend Server..."
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server

# Start server in background
NODE_ENV=development npm start > server.log 2>&1 &
SERVER_PID=$!

echo "✅ Server started with PID: $SERVER_PID"
echo "⏳ Waiting for server to be ready..."

# Wait for server to be ready
sleep 5

# Check if server is running
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Server is ready on port 3001"
else
    echo "❌ Server failed to start"
    cat server.log
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Run integration tests
echo ""
echo "🧪 Running Integration Tests..."
npm run test:integration

# Store exit code
TEST_EXIT_CODE=$?

# Show server log if tests failed
if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "📋 Server Log:"
    tail -50 server.log
fi

# Cleanup: Kill server
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "✅ Cleanup complete"
exit $TEST_EXIT_CODE
