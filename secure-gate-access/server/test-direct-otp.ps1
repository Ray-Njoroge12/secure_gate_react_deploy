# Test OTP resend directly using a visitor ID from automated test
$BASE_URL = "http://localhost:5000"
$JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJlc2lkZW50QHRlc3QuY29tIiwicm9sZSI6InJlc2lkZW50IiwiaWF0IjoxNzU3Njg4NDg5LCJleHAiOjE3NTc2OTIwODl9.9Ozp7enVd-zX3ZcbU_t6pXN1qeRZCdQW60DA4ubLLAQ"

$headers = @{
    "Authorization" = "Bearer $JWT_TOKEN"
}

Write-Host "=== Direct OTP Resend Test ===" -ForegroundColor Cyan

# Test OTP resend on visitor ID 316 (from our most recent automated test)
$visitorId = 316

Write-Host "Testing OTP resend for visitor ID: $visitorId" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/visitors/$visitorId/resend-otp" -Method POST -Headers $headers
    Write-Host "✅ OTP resend successful: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ OTP resend failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 429) {
        Write-Host "✅ This is expected - rate limiting is working!" -ForegroundColor Green
    }
}
