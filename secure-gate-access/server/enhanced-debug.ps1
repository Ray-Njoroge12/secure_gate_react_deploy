# Enhanced test to capture detailed error responses
Write-Host "=== Enhanced Visitor Creation Debug ===" -ForegroundColor Cyan

$BASE_URL = "http://localhost:5000"
$JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJlc2lkZW50QHRlc3QuY29tIiwicm9sZSI6InJlc2lkZW50IiwiaWF0IjoxNzU3Njg4NDg5LCJleHAiOjE3NTc2OTIwODl9.9Ozp7enVd-zX3ZcbU_t6pXN1qeRZCdQW60DA4ubLLAQ"

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $JWT_TOKEN"
}

$visitDateTime = (Get-Date).AddHours(2)
$visitorData = @{
    name = "Enhanced Test Visitor"
    phone = "+1234567890"
    email = "enhanced@test.com"
    purpose = "Enhanced Debug Test"
    dateOfVisit = $visitDateTime.ToString("yyyy-MM-dd")
    time = $visitDateTime.ToString("HH:mm")
}

$jsonData = $visitorData | ConvertTo-Json
Write-Host "JSON Data:" -ForegroundColor Yellow
Write-Host $jsonData -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/visitors" -Method POST -Headers $headers -Body $jsonData -UseBasicParsing
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Request failed:" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
    
    if ($_.Exception.Response.ContentLength -gt 0) {
        try {
            $responseStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($responseStream)
            $responseContent = $reader.ReadToEnd()
            Write-Host "Response Content: $responseContent" -ForegroundColor Yellow
        } catch {
            Write-Host "Could not read response content" -ForegroundColor Gray
        }
    } else {
        Write-Host "No response content" -ForegroundColor Gray
    }
    
    # Try with different Content-Type
    Write-Host "`nTrying with different headers..." -ForegroundColor Cyan
    $altHeaders = @{
        "Content-Type" = "application/x-www-form-urlencoded"
        "Authorization" = "Bearer $JWT_TOKEN"
    }
    
    try {
        $altResponse = Invoke-WebRequest -Uri "$BASE_URL/api/visitors" -Method POST -Headers $altHeaders -Body $jsonData -UseBasicParsing
        Write-Host "✅ Alternative headers worked!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Alternative headers also failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
