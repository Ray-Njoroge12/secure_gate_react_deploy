# PowerShell script to test OTP resend limits on live server
# Make sure the server is running on localhost:5000

# Configuration
$BASE_URL = "http://localhost:5000"
$JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJlc2lkZW50QHRlc3QuY29tIiwicm9sZSI6InJlc2lkZW50IiwiaWF0IjoxNzU3Njg2MTQ2LCJleHAiOjE3NTc2ODk3NDZ9.3jgdtBYt1i8w9cSbnZPZhNzFSR_pPY-uww1IVP-ZX1s"

# Headers for all requests
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $JWT_TOKEN"
}

Write-Host "=== OTP Resend Limits Test ===" -ForegroundColor Cyan
Write-Host "Server: $BASE_URL" -ForegroundColor Yellow
Write-Host "Testing with JWT token for resident@test.com" -ForegroundColor Yellow
Write-Host ""

# Step 1: Create a visitor first
Write-Host "Step 1: Creating a test visitor..." -ForegroundColor Green

$visitDateTime = (Get-Date).AddHours(1)
$visitorData = @{
    name = "Test Visitor"
    phone = "+1234567890"
    email = "visitor@test.com"
    purpose = "Testing OTP limits"
    dateOfVisit = $visitDateTime.ToString("yyyy-MM-dd")
    time = $visitDateTime.ToString("HH:mm")
} | ConvertTo-Json

try {
    $visitorResponse = Invoke-RestMethod -Uri "$BASE_URL/api/visitors" -Method POST -Headers $headers -Body $visitorData
    $visitorId = $visitorResponse.visitor.id
    Write-Host "✅ Visitor created with ID: $visitorId" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create visitor: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response | ConvertTo-Json -Depth 3)" -ForegroundColor Red
    exit 1
}

# Step 2: Test first OTP resend (should succeed)
Write-Host "`nStep 2: Testing first OTP resend (should succeed)..." -ForegroundColor Green

try {
    $resendResponse1 = Invoke-RestMethod -Uri "$BASE_URL/api/visitors/$visitorId/resend-otp" -Method POST -Headers $headers
    Write-Host "✅ First resend successful: $($resendResponse1.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ First resend failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 429) {
        Write-Host "Rate limit already hit - this visitor may have been used before" -ForegroundColor Yellow
    }
}

# Step 3: Test immediate second resend (should fail with 429)
Write-Host "`nStep 3: Testing immediate second resend (should fail with 429)..." -ForegroundColor Green

try {
    $resendResponse2 = Invoke-RestMethod -Uri "$BASE_URL/api/visitors/$visitorId/resend-otp" -Method POST -Headers $headers
    Write-Host "⚠️ Second resend unexpectedly succeeded: $($resendResponse2.message)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 429) {
        Write-Host "✅ Second resend correctly blocked with 429 (Too Many Requests)" -ForegroundColor Green
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error message: $errorBody" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Second resend failed with unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 4: Wait for cooldown and test again
Write-Host "`nStep 4: Waiting 60 seconds for cooldown period..." -ForegroundColor Green
for ($i = 60; $i -gt 0; $i--) {
    Write-Host "⏱️ Waiting... $i seconds remaining" -ForegroundColor Yellow
    Start-Sleep 1
}

Write-Host "`nStep 5: Testing resend after cooldown (should succeed)..." -ForegroundColor Green

try {
    $resendResponse3 = Invoke-RestMethod -Uri "$BASE_URL/api/visitors/$visitorId/resend-otp" -Method POST -Headers $headers
    Write-Host "✅ Resend after cooldown successful: $($resendResponse3.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Resend after cooldown failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 429) {
        Write-Host "Rate limit still active - cooldown may not have expired" -ForegroundColor Yellow
    }
}

# Step 6: Test daily limit by rapid resends
Write-Host "`nStep 6: Testing daily limit (attempting multiple resends)..." -ForegroundColor Green

$successCount = 0
$rateLimitCount = 0

for ($i = 1; $i -le 6; $i++) {
    Write-Host "Attempt $i..." -ForegroundColor Cyan
    
    try {
        $resendResponse = Invoke-RestMethod -Uri "$BASE_URL/api/visitors/$visitorId/resend-otp" -Method POST -Headers $headers
        Write-Host "  ✅ Success: $($resendResponse.message)" -ForegroundColor Green
        $successCount++
    } catch {
        if ($_.Exception.Response.StatusCode -eq 429) {
            Write-Host "  ⚠️ Rate limited (429)" -ForegroundColor Yellow
            $rateLimitCount++
        } else {
            Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Wait 61 seconds between attempts to avoid cooldown
    if ($i -lt 6) {
        Write-Host "  Waiting 61 seconds..." -ForegroundColor Gray
        Start-Sleep 61
    }
}

Write-Host "`n=== Test Results ===" -ForegroundColor Cyan
Write-Host "Successful resends: $successCount" -ForegroundColor Green
Write-Host "Rate limited: $rateLimitCount" -ForegroundColor Yellow
Write-Host "Visitor ID used: $visitorId" -ForegroundColor Cyan

if ($successCount -le 5 -and $rateLimitCount -gt 0) {
    Write-Host "✅ Daily limit appears to be working correctly!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Daily limit behavior may need review" -ForegroundColor Yellow
}

Write-Host "`nTest completed!" -ForegroundColor Cyan
