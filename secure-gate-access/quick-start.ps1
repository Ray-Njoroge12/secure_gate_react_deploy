# Quick Server Start - Development Mode
# Simple startup script for testing

Write-Host "🚀 Quick Start - Secure Gate Server" -ForegroundColor Green

# Navigate to server directory
Set-Location "c:\Users\rayng\Desktop\secure-gate-react-express\secure-gate-access\server"

# Set environment to development
$env:NODE_ENV = "development"

Write-Host "📂 Starting from: $(Get-Location)" -ForegroundColor Cyan
Write-Host "🔧 Environment: $env:NODE_ENV" -ForegroundColor Cyan
Write-Host "🎯 Starting server..." -ForegroundColor Green

# Start server directly
node server.js