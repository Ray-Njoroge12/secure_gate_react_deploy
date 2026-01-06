#!/bin/bash

# =============================================================================
# MAILHOG - QUICK START SCRIPT
# =============================================================================
# This script helps you quickly start MailHog and the development server
# for testing email functionality locally
#
# Usage: bash start-mailhog-dev.sh
# =============================================================================

set -e  # Exit on error

echo "🚀 Starting Secure Gate Development Environment with MailHog"
echo "=============================================================="
echo ""

# Check if MailHog is installed
if ! command -v mailhog &> /dev/null; then
    echo "❌ MailHog not found!"
    echo "📦 Installing MailHog..."
    brew install mailhog
    echo "✅ MailHog installed successfully"
    echo ""
fi

# Check if MailHog is already running
if pgrep -x "mailhog" > /dev/null; then
    echo "✅ MailHog is already running"
else
    echo "🚀 Starting MailHog..."
    mailhog > /dev/null 2>&1 &
    MAILHOG_PID=$!
    echo "✅ MailHog started (PID: $MAILHOG_PID)"
fi

echo ""
echo "📧 MailHog Web UI: http://localhost:8025"
echo "📨 SMTP Server: localhost:1025"
echo ""

# Wait a moment for MailHog to start
sleep 2

# Check if server is already running
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  Port 3001 is already in use"
    read -p "Kill existing process and restart? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Stopping existing server..."
        pkill -f "node.*server.js" || true
        sleep 2
    else
        echo "ℹ️  Keeping existing server running"
        SERVER_ALREADY_RUNNING=true
    fi
fi

# Start the server if not already running
if [ "$SERVER_ALREADY_RUNNING" != "true" ]; then
    echo "🚀 Starting development server..."
    cd "$(dirname "$0")"
    
    # Start server in background
    node --import ./load-env.js --inspect server.js > mailhog-dev.log 2>&1 &
    SERVER_PID=$!
    echo "✅ Server started (PID: $SERVER_PID)"
    
    # Wait for server to start
    echo "⏳ Waiting for server to initialize..."
    sleep 4
    
    # Check if server started successfully
    if lsof -i :3001 > /dev/null 2>&1; then
        echo "✅ Server is running on http://localhost:3001"
    else
        echo "❌ Server failed to start. Check mailhog-dev.log for details"
        exit 1
    fi
fi

echo ""
echo "=============================================================="
echo "🎉 Development Environment Ready!"
echo "=============================================================="
echo ""
echo "📊 Services Running:"
echo "   • MailHog Web UI:    http://localhost:8025"
echo "   • API Server:        http://localhost:3001"
echo "   • MailHog SMTP:      localhost:1025"
echo ""
echo "🧪 Test Registration:"
echo "   curl -X POST http://localhost:3001/api/auth/register \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{"
echo "       \"username\": \"testuser\","
echo "       \"email\": \"test@example.local\","
echo "       \"password\": \"Test123!\","
echo "       \"role\": \"resident\""
echo "     }'"
echo ""
echo "📧 Check emails at: http://localhost:8025"
echo ""
echo "📝 Server logs: tail -f mailhog-dev.log"
echo ""
echo "🛑 To stop services:"
echo "   pkill mailhog"
echo "   pkill -f 'node.*server.js'"
echo ""
echo "Press Ctrl+C to stop this script (services will continue running)"
echo "=============================================================="

# Keep script running (optional - you can remove this)
# wait
