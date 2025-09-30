# Test JWT-protected visitor routes 
$BASE_URL = "http://localhost:5000"
$JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJlc2lkZW50QHRlc3QuY29tIiwicm9sZSI6InJlc2lkZW50IiwiaWF0IjoxNzU3Njg4NDg5LCJleHAiOjE3NTc2OTIwODl9.9Ozp7enVd-zX3ZcbU_t6pXN1qeRZCdQW60DA4ubLLAQ"

$headers = @{
    "Authorization" = "Bearer $JWT_TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "=== JWT Authentication Test ===" -ForegroundColor Cyan

# Test 1: GET /api/visitors (protected route)
Write-Host "1. Testing GET /api/visitors (JWT protected)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/visitors" -Method GET -Headers $headers
    Write-Host "✅ GET visitors works: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Green
} catch {
    Write-Host "❌ GET visitors failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Test 2: Test other API routes to see what's mounted
Write-Host "`n2. Testing GET /api/users (should work)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/users/profile" -Method GET -Headers $headers
    Write-Host "✅ GET users profile works: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ GET users profile failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Test 3: Check if we can hit any visitor endpoint
Write-Host "`n3. Testing visitor creation (POST /api/visitors)..." -ForegroundColor Yellow
try {
    $visitorData = @{
        name = "PowerShell Test User"
        phone = "+1234567890"
        email = "ps.test@example.com"
        id_number = "PS123456"
        dateOfVisit = "2025-09-13"
        time = "14:00"
        purpose = "Testing PowerShell integration"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/api/visitors" -Method POST -Headers $headers -Body $visitorData
    Write-Host "✅ Visitor creation works: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "❌ Visitor creation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    # Try to get response body
    try {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $streamReader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    } catch {}
}
