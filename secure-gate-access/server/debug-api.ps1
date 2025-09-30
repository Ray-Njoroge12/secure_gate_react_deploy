# Debug script to see the actual API error response
$BASE_URL = "http://localhost:5000"
$JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJlc2lkZW50QHRlc3QuY29tIiwicm9sZSI6InJlc2lkZW50IiwiaWF0IjoxNzU3Njg4NDg5LCJleHAiOjE3NTc2OTIwODl9.9Ozp7enVd-zX3ZcbU_t6pXN1qeRZCdQW60DA4ubLLAQ"

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $JWT_TOKEN"
}

$visitDateTime = (Get-Date).AddHours(1)
$visitorData = @{
    name = "Debug Visitor"
    phone = "+1234567892"
    email = "debug@test.com"
    purpose = "Debug test"
    dateOfVisit = $visitDateTime.ToString("yyyy-MM-dd")
    time = $visitDateTime.ToString("HH:mm")
} | ConvertTo-Json

Write-Host "=== Debug API Test ===" -ForegroundColor Cyan
Write-Host "JWT Token: $JWT_TOKEN" -ForegroundColor Yellow
Write-Host "Visitor Data: $visitorData" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/visitors" -Method POST -Headers $headers -Body $visitorData
    Write-Host "✅ Success: $($response | ConvertTo-Json -Depth 5)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    # Try to get the response body
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response Body: $errorBody" -ForegroundColor Yellow
    } catch {
        Write-Host "Could not read error response body" -ForegroundColor Gray
    }
}
