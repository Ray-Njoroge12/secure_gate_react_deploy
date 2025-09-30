# Test basic server connectivity
$BASE_URL = "http://localhost:5000"

Write-Host "=== Server Connectivity Test ===" -ForegroundColor Cyan

# Test health endpoint
try {
    $health = Invoke-RestMethod -Uri "$BASE_URL/health" -Method GET
    Write-Host "✅ Health check: $($health | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test JWT validation with a simple endpoint
$JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJlc2lkZW50QHRlc3QuY29tIiwicm9sZSI6InJlc2lkZW50IiwiaWF0IjoxNzU3Njg4NDg5LCJleHAiOjE3NTc2OTIwODl9.9Ozp7enVd-zX3ZcbU_t6pXN1qeRZCdQW60DA4ubLLAQ"

$headers = @{
    "Authorization" = "Bearer $JWT_TOKEN"
}

# Try to get visitors list (should be empty but test auth)
try {
    $visitors = Invoke-RestMethod -Uri "$BASE_URL/api/visitors" -Method GET -Headers $headers
    Write-Host "✅ Auth test (GET visitors): $($visitors | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ Auth test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
