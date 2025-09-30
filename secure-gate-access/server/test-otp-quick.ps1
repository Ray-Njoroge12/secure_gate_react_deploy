# Quick OTP resend test - basic functionality
# Make sure the server is running on localhost:5000

$BASE_URL = "http://localhost:5000"
$JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJlc2lkZW50QHRlc3QuY29tIiwicm9sZSI6InJlc2lkZW50IiwiaWF0IjoxNzU3Njg4NDg5LCJleHAiOjE3NTc2OTIwODl9.9Ozp7enVd-zX3ZcbU_t6pXN1qeRZCdQW60DA4ubLLAQ"

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $JWT_TOKEN"
}

Write-Host "=== Quick OTP Resend Test ===" -ForegroundColor Cyan

# Create a visitor
Write-Host "Creating visitor..." -ForegroundColor Green
$visitDateTime = (Get-Date).AddHours(1)
$visitorData = @{
    name = "Quick Test Visitor"
    phone = "+1234567891"
    email = "quicktest@test.com"
    purpose = "Quick OTP test"
    dateOfVisit = $visitDateTime.ToString("yyyy-MM-dd")
    time = $visitDateTime.ToString("HH:mm")
} | ConvertTo-Json

try {
    $visitorResponse = Invoke-RestMethod -Uri "$BASE_URL/api/visitors" -Method POST -Headers $headers -Body $visitorData
    $visitorId = $visitorResponse.visitor.id
    Write-Host "✅ Visitor created: $visitorId" -ForegroundColor Green
    
    # Test first resend
    Write-Host "Testing first OTP resend..." -ForegroundColor Green
    $resend1 = Invoke-RestMethod -Uri "$BASE_URL/api/visitors/$visitorId/resend-otp" -Method POST -Headers $headers
    Write-Host "✅ First resend: $($resend1.message)" -ForegroundColor Green
    
    # Test immediate second resend (should fail)
    Write-Host "Testing immediate second resend..." -ForegroundColor Green
    try {
        $resend2 = Invoke-RestMethod -Uri "$BASE_URL/api/visitors/$visitorId/resend-otp" -Method POST -Headers $headers
        Write-Host "⚠️ Second resend unexpectedly succeeded: $($resend2.message)" -ForegroundColor Yellow
    } catch {
        if ($_.Exception.Response.StatusCode -eq 429) {
            Write-Host "✅ Second resend correctly blocked with 429" -ForegroundColor Green
        } else {
            Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "Quick test completed!" -ForegroundColor Cyan
