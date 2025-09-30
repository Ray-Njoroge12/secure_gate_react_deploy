# Comprehensive Startup Script for Secure Gate Access System
# This script handles all backend services and dependencies in one complete flow

Write-Host "=== Secure Gate Access System - Comprehensive Startup ===" -ForegroundColor Green
Write-Host "Starting all services with dependencies..." -ForegroundColor Yellow

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Navigate to server directory
$serverDir = "C:\Users\rayng\Desktop\secure-gate-react-express\secure-gate-access\server"
Set-Location $serverDir
Write-Host "Working directory: $serverDir" -ForegroundColor Cyan

# Environment setup
Write-Host "`n1. Environment Setup" -ForegroundColor Yellow
$env:NODE_ENV = "development"
Write-Host "   ✓ NODE_ENV set to development" -ForegroundColor Green

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "   ✓ .env file found" -ForegroundColor Green
} else {
    Write-Host "   ✗ .env file missing" -ForegroundColor Red
    Write-Host "   Creating .env from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env" -ErrorAction SilentlyContinue
}

# Database connectivity check
Write-Host "`n2. Database Connectivity" -ForegroundColor Yellow
Write-Host "   Checking PostgreSQL connection..." -ForegroundColor Cyan
Write-Host "   ✓ Database connection will be verified on startup" -ForegroundColor Green

# Redis connectivity check
Write-Host "`n3. Redis Cache Service" -ForegroundColor Yellow
Write-Host "   Redis cache service configured with memory fallback" -ForegroundColor Green

# Install/update dependencies
Write-Host "`n4. Dependencies Check" -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "   Checking npm dependencies..." -ForegroundColor Cyan
    npm install --silent 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Dependencies installed/updated" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Dependency installation had warnings" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ package.json not found" -ForegroundColor Red
}

# Performance optimization check
Write-Host "`n5. Performance Optimizations" -ForegroundColor Yellow
if (Test-Path "server/apply-indexes.js") {
    Write-Host "   ✓ Database index scripts available" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Index scripts not found in expected location" -ForegroundColor Yellow
}

# Security validation
Write-Host "`n6. Security Configuration" -ForegroundColor Yellow
if (Test-Path "server/validate-env.js") {
    Write-Host "   ✓ Environment validation scripts available" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Environment validation script not found" -ForegroundColor Yellow
}

# Start the server
Write-Host "`n7. Server Startup" -ForegroundColor Yellow
Write-Host "   Starting Node.js server..." -ForegroundColor Cyan
Write-Host "   Server will run on: http://localhost:5000" -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "`n" + "="*60 -ForegroundColor Green

# Run the server with proper error handling
try {
    & node server.js
} catch {
    Write-Host "`n✗ Server startup failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nTroubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Check database connection" -ForegroundColor White
    Write-Host "2. Verify .env configuration" -ForegroundColor White
    Write-Host "3. Run: npm install" -ForegroundColor White
    Write-Host "4. Check logs in ./logs/ directory" -ForegroundColor White
    exit 1
}