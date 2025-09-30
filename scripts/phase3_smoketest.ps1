Param(
  [string]$BaseUrl = "http://localhost:5000"
)
Write-Host "Phase 3 Smoke Test starting..."
$health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET -ErrorAction Stop
Write-Output ($health | ConvertTo-Json -Compress)
Write-Host "OK"
