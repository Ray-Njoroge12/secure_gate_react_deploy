# Redis Setup for Development
# This script helps set up Redis for local development

# Check if Redis is available
Write-Host "🔍 Checking Redis availability..." -ForegroundColor Yellow

# Test Redis connection
try {
    $redisTest = docker ps --filter "name=redis" --format "{{.Names}}" 2>$null
    if ($redisTest -eq "redis") {
        Write-Host "✅ Redis container already running" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "⚠️  Docker not available or Redis not running" -ForegroundColor Yellow
}

# Try to start Redis using Docker
Write-Host "🚀 Starting Redis using Docker..." -ForegroundColor Blue

try {
    docker run -d --name redis -p 6379:6379 redis:7-alpine
    Start-Sleep -Seconds 3
    
    # Test connection
    docker exec redis redis-cli ping
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Redis is now running on port 6379" -ForegroundColor Green
        Write-Host "   - Host: localhost" -ForegroundColor Gray
        Write-Host "   - Port: 6379" -ForegroundColor Gray
        Write-Host "   - No password required for development" -ForegroundColor Gray
    } else {
        throw "Redis ping failed"
    }
} catch {
    Write-Host "❌ Failed to start Redis with Docker" -ForegroundColor Red
    Write-Host "   Please install Redis manually or ensure Docker is available" -ForegroundColor Yellow
    Write-Host "   Download Redis from: https://redis.io/download" -ForegroundColor Yellow
    exit 1
}