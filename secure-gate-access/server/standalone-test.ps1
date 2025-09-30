# Standalone test script that can be run independently
# This script will test visitor creation and show server logs

Write-Host "=== Testing Visitor Creation API ===" -ForegroundColor Cyan

$BASE_URL = "http://localhost:5000"
$JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJlc2lkZW50QHRlc3QuY29tIiwicm9sZSI6InJlc2lkZW50IiwiaWF0IjoxNzU3Njg4NDg5LCJleHAiOjE3NTc2OTIwODl9.9Ozp7enVd-zX3ZcbU_t6pXN1qeRZCdQW60DA4ubLLAQ"

# Test 1: Health check
Write-Host "`n1. Health Check:" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$BASE_URL/health" -Method GET
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server not responding: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: JWT Auth test (GET visitors)
Write-Host "`n2. JWT Authentication Test:" -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $JWT_TOKEN"
}

try {
    $visitors = Invoke-RestMethod -Uri "$BASE_URL/api/visitors" -Method GET -Headers $headers
    Write-Host "✅ JWT authentication working, found $($visitors.data.Count) visitors" -ForegroundColor Green
} catch {
    Write-Host "❌ JWT auth failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Visitor Creation
Write-Host "`n3. Visitor Creation Test:" -ForegroundColor Yellow
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $JWT_TOKEN"
}

$visitDateTime = (Get-Date).AddHours(2)
$visitorData = @{
    name = "Test Visitor $(Get-Random)"
    phone = "+1234567890"
    email = "test$(Get-Random)@test.com"
    purpose = "API Test"
    dateOfVisit = $visitDateTime.ToString("yyyy-MM-dd")
    time = $visitDateTime.ToString("HH:mm")
} | ConvertTo-Json

Write-Host "Sending visitor data:" -ForegroundColor Cyan
Write-Host $visitorData -ForegroundColor Gray

try {
    $visitorResponse = Invoke-RestMethod -Uri "$BASE_URL/api/visitors" -Method POST -Headers $headers -Body $visitorData
    Write-Host "✅ Visitor created successfully!" -ForegroundColor Green
    Write-Host "Visitor ID: $($visitorResponse.visitor.id)" -ForegroundColor Cyan
    
    # Test 4: OTP Resend
    Write-Host "`n4. OTP Resend Test:" -ForegroundColor Yellow
    $visitorId = $visitorResponse.visitor.id
    
    try {
        $otpResponse = Invoke-RestMethod -Uri "$BASE_URL/api/visitors/$visitorId/resend-otp" -Method POST
        Write-Host "✅ OTP resend successful!" -ForegroundColor Green
        Write-Host "Response: $($otpResponse | ConvertTo-Json)" -ForegroundColor Cyan
    } catch {
        if ($_.Exception.Response.StatusCode -eq 429) {
            Write-Host "✅ OTP rate limiting working (429 status)!" -ForegroundColor Green
        } else {
            Write-Host "❌ OTP resend failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "❌ Visitor creation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    # Try to get error details
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        if ($errorBody) {
            Write-Host "Error Response: $errorBody" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Could not read detailed error response" -ForegroundColor Gray
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
