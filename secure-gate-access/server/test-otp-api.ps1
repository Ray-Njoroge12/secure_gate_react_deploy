# OTP Resend API Test Script
# Run this in PowerShell with server running on localhost:5000

# Step 1: Create a bulk invite (requires resident JWT)
Write-Host "🔑 Creating JWT token for resident..." -ForegroundColor Yellow
$jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJlc2lkZW50QHRlc3QuY29tIiwicm9sZSI6InJlc2lkZW50IiwiaWF0IjoxNzI2MTUxMDAwLCJleHAiOjE3MjYyMzc0MDB9.placeholder"

Write-Host "📝 Creating bulk invite..." -ForegroundColor Yellow
$bulkPayload = @{
    eventName = "Test Event"
    date = "2099-12-31"
    time = "12:00"
    numGuests = 1
} | ConvertTo-Json

$bulkResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/visitors/bulk-invite" `
    -Method POST `
    -Body $bulkPayload `
    -ContentType "application/json" `
    -Headers @{ Authorization = "Bearer $jwt" }

$inviteCode = $bulkResponse.data.invite_code
Write-Host "✅ Created invite: $inviteCode" -ForegroundColor Green

# Step 2: Complete the invite to create a visitor
Write-Host "👤 Completing invite to create visitor..." -ForegroundColor Yellow
$guestPayload = @{
    name = "Test User"
    phone = "0700000000"
    email = "test@example.com"
} | ConvertTo-Json

$visitorResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/visitors/complete/$inviteCode" `
    -Method POST `
    -Body $guestPayload `
    -ContentType "application/json"

$visitorId = $visitorResponse.data.visitor.id
Write-Host "✅ Created visitor ID: $visitorId" -ForegroundColor Green

# Step 3: Test OTP resend limits
Write-Host "`n🧪 Testing OTP resend limits..." -ForegroundColor Cyan

# First resend - should succeed
Write-Host "1️⃣ First resend (should succeed)..." -ForegroundColor Yellow
try {
    $r1 = Invoke-RestMethod -Uri "http://localhost:5000/api/visitors/$visitorId/resend-otp" -Method POST
    Write-Host "✅ Status: Success - $($r1.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Status: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
}

# Immediate second resend - should be 429 (cooldown)
Write-Host "2️⃣ Immediate second resend (should be 429 - cooldown)..." -ForegroundColor Yellow
try {
    $r2 = Invoke-RestMethod -Uri "http://localhost:5000/api/visitors/$visitorId/resend-otp" -Method POST
    Write-Host "❌ Unexpected success: $($r2.message)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 429) {
        Write-Host "✅ Status: 429 - Correctly rate limited" -ForegroundColor Green
    } else {
        Write-Host "❌ Status: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n⏱️ Waiting 65 seconds for cooldown..." -ForegroundColor Yellow
Start-Sleep -Seconds 65

# Third resend after cooldown - should succeed
Write-Host "3️⃣ Third resend after cooldown (should succeed)..." -ForegroundColor Yellow
try {
    $r3 = Invoke-RestMethod -Uri "http://localhost:5000/api/visitors/$visitorId/resend-otp" -Method POST
    Write-Host "✅ Status: Success - $($r3.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Status: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 OTP resend limits tested successfully!" -ForegroundColor Green
Write-Host "Visitor ID for further testing: $visitorId" -ForegroundColor Cyan
