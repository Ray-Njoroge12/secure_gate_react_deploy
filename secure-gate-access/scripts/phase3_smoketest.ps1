Param(
  [string]$BaseUrl = "http://localhost:5000"
)

Write-Host "Phase 3 Smoke Test starting..."
$health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET -ErrorAction Stop
Write-Host "Health:" ($health | ConvertTo-Json -Compress)

# Add additional steps as needed; uses existing Phase 2 flows
Write-Host "Phase 3 basic check complete"
