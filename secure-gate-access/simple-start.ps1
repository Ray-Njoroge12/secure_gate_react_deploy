#!/usr/bin/env powershell
# Simple Comprehensive Server Startup

Write-Host "=== Starting Secure Gate Access Server ===" -ForegroundColor Green

# Navigate to server directory  
Set-Location "C:\Users\rayng\Desktop\secure-gate-react-express\secure-gate-access\server"

# Set environment
$env:NODE_ENV = "development"
Write-Host "Environment: development" -ForegroundColor Yellow

# Start server with all components
Write-Host "Starting server on http://localhost:5000..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

node server.js