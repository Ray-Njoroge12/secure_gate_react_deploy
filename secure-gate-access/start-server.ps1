# Comprehensive Secure Gate Server Startup Script
# This script starts the backend server with full configuration validation and monitoring

Write-Host "🚀 Starting Secure Gate Access Server..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Set working directory to server folder
$ServerPath = "c:\Users\rayng\Desktop\secure-gate-react-express\secure-gate-access\server"
Set-Location $ServerPath

Write-Host "📂 Working Directory: $ServerPath" -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please ensure .env file exists in the server directory" -ForegroundColor Yellow
    Write-Host "You can copy from .env.example and configure with your values" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Environment file found" -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

# Set development environment
Write-Host "🔍 Setting up development environment..." -ForegroundColor Yellow
$env:NODE_ENV = "development"
Write-Host "✅ Environment set to development mode" -ForegroundColor Green

# Test database connection
Write-Host "🗄️  Testing database connection..." -ForegroundColor Yellow
node check-tables.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database connection failed!" -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is running and properly configured" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ Database connection verified" -ForegroundColor Green
}

# Apply database optimizations if needed
Write-Host "⚡ Applying database performance optimizations..." -ForegroundColor Yellow
node apply-indexes.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Some database optimizations failed - server will still start" -ForegroundColor Yellow
} else {
    Write-Host "✅ Database optimizations applied" -ForegroundColor Green
}

# Display startup information
Write-Host "" -ForegroundColor White
Write-Host "🔧 Server Configuration:" -ForegroundColor Cyan
Write-Host "   • Environment: $env:NODE_ENV" -ForegroundColor White
Write-Host "   • Port: 5000" -ForegroundColor White
Write-Host "   • Database: PostgreSQL" -ForegroundColor White
Write-Host "   • Caching: Redis (with memory fallback)" -ForegroundColor White
Write-Host "   • Security: Enhanced with rate limiting" -ForegroundColor White
Write-Host "   • Monitoring: Real-time metrics & logging" -ForegroundColor White
Write-Host "" -ForegroundColor White

Write-Host "🎯 Starting server with Redis caching enabled..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Green
Write-Host "" -ForegroundColor White

# Start the server (this will keep running in the same terminal)
node server.js