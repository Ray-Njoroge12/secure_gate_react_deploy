Write-Host "🚀 Starting Phase 2 Smoke Test..."

# Configurable test users
$ResidentEmail = "resident1@test.com"
$ResidentPass  = "Password123!"
$GuardEmail    = "guard1@test.com"
$GuardPass     = "Password123!"

# Helpers
function Post-Json($uri, $obj, $headers=@{}) {
  try {
    $json = $obj | ConvertTo-Json -Depth 6
    return Invoke-RestMethod -UseBasicParsing -Method Post -Uri $uri -ContentType 'application/json' -Headers $headers -Body $json
  } catch {
    Write-Host "POST $uri failed: $($_.Exception.Message)" -ForegroundColor Yellow
    return $null
  }
}
function Get-Json($uri, $headers=@{}) {
  try { return Invoke-RestMethod -UseBasicParsing -Method Get -Uri $uri -Headers $headers } catch { return $null }
}
function Show($obj) { try { $obj | ConvertTo-Json -Depth 8 } catch { "" } }

# 1) Health check (with retry)
Write-Host "`n[1] Checking server health..."
$health = $null
for ($i=0; $i -lt 5 -and -not $health; $i++) {
  Start-Sleep -Milliseconds 300
  $health = Get-Json "http://localhost:5000/health"
}
if (-not $health) { Write-Error "Health check failed. Ensure the backend is running on :5000."; exit 1 }
Write-Host (Show $health)

# 2) Resident login (auto-register if needed)
Write-Host "`n[2] Ensuring resident exists and logging in..."
$loginObj  = Post-Json "http://localhost:5000/api/users/login" @{ email=$ResidentEmail; password=$ResidentPass }
if (-not $loginObj -or -not $loginObj.success) {
  Write-Host "Resident login failed; registering resident..."
  $regRes = Post-Json "http://localhost:5000/api/users/register" @{ email=$ResidentEmail; username="Resident One"; role="resident"; password=$ResidentPass }
  Write-Host ("Register response: " + (Show $regRes))
  $loginObj = Post-Json "http://localhost:5000/api/users/login" @{ email=$ResidentEmail; password=$ResidentPass }
}
if (-not $loginObj -or -not $loginObj.success) { Write-Error ("Resident login failed: " + (Show $loginObj)); exit 1 }
$residentToken = $loginObj.token
Write-Host "Resident JWT (truncated): $($residentToken.Substring(0,24))..."

# 3) Resident creates single invite
Write-Host "`n[3] Creating single invite as resident..."
$tomorrow = (Get-Date).AddDays(1).ToString('yyyy-MM-dd')
$inviteObj = Post-Json "http://localhost:5000/api/visitors/" @{
  name = "John Doe"
  phone = "0712345678"
  email = "john.doe@example.com"
  purpose = "Meeting"
  dateOfVisit = $tomorrow
  time = "12:00"
} @{ Authorization = "Bearer $residentToken" }
Write-Host ("Create invite response: " + (Show $inviteObj))
if (-not $inviteObj -or -not $inviteObj.success) { Write-Error "Invite creation failed"; exit 1 }
$visitorId = $inviteObj.data.id
$inviteCode = $inviteObj.data.invite_code
Write-Host "Visitor ID: $visitorId"
Write-Host "Invite Code: $inviteCode"

# 4) Guest completes invite (public)
Write-Host "`n[4] Completing invite as guest..."
$completeObj = Post-Json "http://localhost:5000/api/visitors/complete/$inviteCode" @{ name="John Doe"; phone="0712345678"; email="john.doe@example.com" }
Write-Host ("Complete invite response: " + (Show $completeObj))
if (-not $completeObj -or -not $completeObj.success) { Write-Error "Complete invite failed"; exit 1 }
$issuedData = $completeObj.data
$debugOtp = $issuedData.debug_otp
$issuedVisitor = $issuedData.visitor
$issuedVisitorId = $issuedVisitor.id
Write-Host "Issued Visitor ID: $issuedVisitorId"
if ($debugOtp) { Write-Host "Debug OTP (dev-only): $debugOtp" } else { Write-Host "No debug OTP in response (set OTP_DEBUG_ECHO=true in server .env for local testing)." }

# 5) Verify OTP (public)
Write-Host "`n[5] Verifying OTP..."
if (-not $debugOtp) {
  Write-Host "Skipping OTP verification since debug OTP is not available." -ForegroundColor Yellow
} else {
  $verifyObj = Post-Json "http://localhost:5000/api/visitors/$issuedVisitorId/verify-otp" @{ otp=$debugOtp }
  Write-Host ("Verify response: " + (Show $verifyObj))
}

# 6) Guard login (auto-register if needed)
Write-Host "`n[6] Ensuring guard exists and logging in..."
$gLoginObj  = Post-Json "http://localhost:5000/api/users/login" @{ email=$GuardEmail; password=$GuardPass }
if (-not $gLoginObj -or -not $gLoginObj.success) {
  Write-Host "Guard login failed; registering guard..."
  $gRegRes = Post-Json "http://localhost:5000/api/users/register" @{ email=$GuardEmail; username="Guard One"; role="guard"; password=$GuardPass }
  Write-Host ("Guard register response: " + (Show $gRegRes))
  $gLoginObj = Post-Json "http://localhost:5000/api/users/login" @{ email=$GuardEmail; password=$GuardPass }
}
if (-not $gLoginObj -or -not $gLoginObj.success) { Write-Error ("Guard login failed: " + (Show $gLoginObj)); exit 1 }
$guardToken = $gLoginObj.token
Write-Host "Guard JWT (truncated): $($guardToken.Substring(0,24))..."

# 7) Guard checks in visitor (protected: guard/admin)
Write-Host "`n[7] Guard check-in..."
$checkInObj = Post-Json "http://localhost:5000/api/visitors/$issuedVisitorId/check-in" @{} @{ Authorization = "Bearer $guardToken" }
Write-Host (Show $checkInObj)

# 8) Negative case — wrong OTP
Write-Host "`n[8] Wrong OTP verification..."
$wrongObj = Post-Json "http://localhost:5000/api/visitors/$issuedVisitorId/verify-otp" @{ otp = "999999" }
Write-Host (Show $wrongObj)

Write-Host "`n✅ Phase 2 Smoke Test complete."
