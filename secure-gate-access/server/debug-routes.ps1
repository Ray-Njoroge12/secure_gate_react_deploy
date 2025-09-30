# Debug route availability
$BASE_URL = "http://localhost:5000"

Write-Host "=== Route Debug Test ===" -ForegroundColor Cyan

# Test 1: Health check
Write-Host "1. Testing health check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method GET
    Write-Host "✅ Health check works: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Try OTP resend without auth (it's a public route)
Write-Host "`n2. Testing OTP resend (public route)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/visitors/316/resend-otp" -Method POST
    Write-Host "✅ OTP resend works: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ OTP resend failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    # Get response body for more details
    try {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $streamReader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    } catch {}
}

# Test 3: Test visitor verification (another public route)
Write-Host "`n3. Testing visitor OTP verification (public route)..." -ForegroundColor Yellow
try {
    $body = @{ otp = "123456" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/visitors/316/verify-otp" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ OTP verify works: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ OTP verify failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
