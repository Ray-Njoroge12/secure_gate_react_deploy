# PowerShell OTP Resend API Test Commands
# Copy and paste these one by one in your PowerShell terminal

# Step 1: Set up variables
$jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJlc2lkZW50QHRlc3QuY29tIiwicm9sZSI6InJlc2lkZW50IiwiaWF0IjoxNzU3Njg1Njk5LCJleHAiOjE3NTc2ODkyOTl9.J_m_-A9jbhhFGRYHk_GS4sPPsCR6-9X32QsQxdgAw2c"

# Step 2: Create bulk invite
$bulkPayload = @{
    eventName = "Test Event"
    date = "2099-12-31"
    time = "12:00"
    numGuests = 1
} | ConvertTo-Json

$bulkResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/visitors/bulk-invite" -Method POST -Body $bulkPayload -ContentType "application/json" -Headers @{ Authorization = "Bearer $jwt" }

Write-Host "Bulk invite created! Invite code: $($bulkResponse.data.invite_code)"
$inviteCode = $bulkResponse.data.invite_code

# Step 3: Complete the invite
$guestPayload = @{
    name = "Test User"
    phone = "0700000000"
    email = "test@example.com"
} | ConvertTo-Json

$visitorResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/visitors/complete/$inviteCode" -Method POST -Body $guestPayload -ContentType "application/json"

Write-Host "Visitor created! ID: $($visitorResponse.data.visitor.id)"
$visitorId = $visitorResponse.data.visitor.id

# Step 4: Test OTP resend limits
Write-Host "`nTesting OTP resend limits..."

# First resend - should succeed
Write-Host "1. First resend (should succeed)..."
try {
    $r1 = Invoke-RestMethod -Uri "http://localhost:5000/api/visitors/$visitorId/resend-otp" -Method POST
    Write-Host "   SUCCESS: $($r1.message)" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Immediate second resend - should be 429
Write-Host "2. Immediate second resend (should be 429)..."
try {
    $r2 = Invoke-RestMethod -Uri "http://localhost:5000/api/visitors/$visitorId/resend-otp" -Method POST
    Write-Host "   UNEXPECTED SUCCESS: $($r2.message)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 429) {
        Write-Host "   SUCCESS: Correctly blocked (429)" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nVisitor ID for further testing: $visitorId"
