#!/usr/bin/env pwsh

param(
    [string]$ServerUrl = "http://localhost:3001",
    [string]$ClientUrl = "http://localhost:3000", 
    [switch]$SkipGuardTests,
    [switch]$SkipInviteTests,
    [switch]$SkipQrTests,
    [string]$OutputFile = "e2e-test-report.md"
)

function Write-Info { 
    param([string]$Message)
    Write-Host "INFO: $Message" -ForegroundColor Cyan 
}

function Write-Success { 
    param([string]$Message)
    Write-Host "SUCCESS: $Message" -ForegroundColor Green 
}

function Write-Failure { 
    param([string]$Message)
    Write-Host "FAILURE: $Message" -ForegroundColor Red 
}

# Test results tracking
$testResults = @{
    'Guard Operations' = @{ Status = 'Not Run'; ExitCode = -1; Error = $null; Duration = $null }
    'Visitor Invite Workflow' = @{ Status = 'Not Run'; ExitCode = -1; Error = $null; Duration = $null }
    'QR/OTP Verification' = @{ Status = 'Not Run'; ExitCode = -1; Error = $null; Duration = $null }
}

$overallResults = @{
    Total = 0; Passed = 0; Failed = 0; Partial = 0; Skipped = 0; Errors = 0; Missing = 0
}

Write-Info "Starting E2E Test Suite"
Write-Info "Server: $ServerUrl | Client: $ClientUrl"

# Pre-flight check
Write-Info "Checking server availability..."
try {
    Invoke-WebRequest -Uri "$ServerUrl/health" -TimeoutSec 5 -UseBasicParsing | Out-Null
    Write-Success "Backend server is responding"
} catch {
    Write-Failure "Backend server not accessible at $ServerUrl"
    exit 1
}

# Check test scripts exist
$testScripts = @(
    'e2e-guard-operations.ps1',
    'e2e-visitor-invite-workflow.ps1', 
    'e2e-qr-otp-verification.ps1'
)

foreach ($script in $testScripts) {
    if (-not (Test-Path $script)) {
        Write-Failure "Test script not found: $script"
        $overallResults.Missing++
    }
}

if ($overallResults.Missing -gt 0) {
    Write-Failure "Cannot proceed - missing test scripts"
    exit 1
}

Write-Success "Pre-flight checks completed"

# Run Guard Operations Tests
if (-not $SkipGuardTests) {
    Write-Info "Running Guard Operations Tests..."
    $overallResults.Total++
    
    try {
        $startTime = Get-Date
        $process = Start-Process -FilePath "pwsh" -ArgumentList "-File", "e2e-guard-operations.ps1", "-ServerUrl", $ServerUrl, "-ClientUrl", $ClientUrl -Wait -PassThru -NoNewWindow
        $endTime = Get-Date
        $duration = ($endTime - $startTime).ToString("mm\:ss")
        
        $testResults['Guard Operations'].ExitCode = $process.ExitCode
        $testResults['Guard Operations'].Duration = $duration
        
        switch ($process.ExitCode) {
            0 { 
                $testResults['Guard Operations'].Status = 'Passed'
                $overallResults.Passed++
                Write-Success "Guard Operations Tests: PASSED"
            }
            1 { 
                $testResults['Guard Operations'].Status = 'Partial'
                $overallResults.Partial++
                Write-Warning "Guard Operations Tests: PARTIAL"
            }
            default { 
                $testResults['Guard Operations'].Status = 'Failed'
                $overallResults.Failed++
                Write-Failure "Guard Operations Tests: FAILED"
            }
        }
    } catch {
        $testResults['Guard Operations'].Status = 'Error'
        $testResults['Guard Operations'].Error = $_.Exception.Message
        $overallResults.Errors++
        Write-Failure "Guard Operations Tests: ERROR"
    }
} else {
    $testResults['Guard Operations'].Status = 'Skipped'
    $overallResults.Skipped++
    Write-Warning "Guard Operations Tests: SKIPPED"
}

# Run Visitor Invite Tests  
if (-not $SkipInviteTests) {
    Write-Info "Running Visitor Invite Workflow Tests..."
    $overallResults.Total++
    
    try {
        $startTime = Get-Date
        $process = Start-Process -FilePath "pwsh" -ArgumentList "-File", "e2e-visitor-invite-workflow.ps1", "-ServerUrl", $ServerUrl, "-ClientUrl", $ClientUrl -Wait -PassThru -NoNewWindow
        $endTime = Get-Date
        $duration = ($endTime - $startTime).ToString("mm\:ss")
        
        $testResults['Visitor Invite Workflow'].ExitCode = $process.ExitCode
        $testResults['Visitor Invite Workflow'].Duration = $duration
        
        switch ($process.ExitCode) {
            0 { 
                $testResults['Visitor Invite Workflow'].Status = 'Passed'
                $overallResults.Passed++
                Write-Success "Visitor Invite Workflow Tests: PASSED"
            }
            1 { 
                $testResults['Visitor Invite Workflow'].Status = 'Partial'
                $overallResults.Partial++
                Write-Warning "Visitor Invite Workflow Tests: PARTIAL"
            }
            default { 
                $testResults['Visitor Invite Workflow'].Status = 'Failed'
                $overallResults.Failed++
                Write-Failure "Visitor Invite Workflow Tests: FAILED"
            }
        }
    } catch {
        $testResults['Visitor Invite Workflow'].Status = 'Error'
        $testResults['Visitor Invite Workflow'].Error = $_.Exception.Message
        $overallResults.Errors++
        Write-Failure "Visitor Invite Workflow Tests: ERROR"
    }
} else {
    $testResults['Visitor Invite Workflow'].Status = 'Skipped'
    $overallResults.Skipped++
    Write-Warning "Visitor Invite Workflow Tests: SKIPPED"
}

# Run QR/OTP Tests
if (-not $SkipQrTests) {
    Write-Info "Running QR/OTP Verification Tests..."
    $overallResults.Total++
    
    try {
        $startTime = Get-Date
        $process = Start-Process -FilePath "pwsh" -ArgumentList "-File", "e2e-qr-otp-verification.ps1", "-ServerUrl", $ServerUrl, "-ClientUrl", $ClientUrl -Wait -PassThru -NoNewWindow
        $endTime = Get-Date
        $duration = ($endTime - $startTime).ToString("mm\:ss")
        
        $testResults['QR/OTP Verification'].ExitCode = $process.ExitCode
        $testResults['QR/OTP Verification'].Duration = $duration
        
        switch ($process.ExitCode) {
            0 { 
                $testResults['QR/OTP Verification'].Status = 'Passed'
                $overallResults.Passed++
                Write-Success "QR/OTP Verification Tests: PASSED"
            }
            1 { 
                $testResults['QR/OTP Verification'].Status = 'Partial'
                $overallResults.Partial++
                Write-Warning "QR/OTP Verification Tests: PARTIAL"
            }
            default { 
                $testResults['QR/OTP Verification'].Status = 'Failed'
                $overallResults.Failed++
                Write-Failure "QR/OTP Verification Tests: FAILED"
            }
        }
    } catch {
        $testResults['QR/OTP Verification'].Status = 'Error'
        $testResults['QR/OTP Verification'].Error = $_.Exception.Message
        $overallResults.Errors++
        Write-Failure "QR/OTP Verification Tests: ERROR"
    }
} else {
    $testResults['QR/OTP Verification'].Status = 'Skipped'
    $overallResults.Skipped++
    Write-Warning "QR/OTP Verification Tests: SKIPPED"
}

# Generate report
Write-Info "Generating test report..."

$reportContent = "# E2E Test Suite Report`n`n"
$reportContent += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
$reportContent += "Server: $ServerUrl`n"
$reportContent += "Client: $ClientUrl`n`n"

$reportContent += "## Summary`n`n"
$reportContent += "Total Suites: $($overallResults.Total)`n"
$reportContent += "Passed: $($overallResults.Passed)`n"
$reportContent += "Failed: $($overallResults.Failed)`n"
$reportContent += "Partial: $($overallResults.Partial)`n"
$reportContent += "Skipped: $($overallResults.Skipped)`n"
$reportContent += "Errors: $($overallResults.Errors)`n`n"

$reportContent += "## Test Suite Details`n`n"

foreach ($suite in $testResults.GetEnumerator()) {
    $reportContent += "### " + $suite.Key + "`n`n"
    $reportContent += "Status: " + $suite.Value.Status + "`n"
    $reportContent += "Exit Code: " + $suite.Value.ExitCode + "`n"
    
    if ($suite.Value.Error) {
        $reportContent += "Error: " + $suite.Value.Error + "`n"
    }
    
    if ($suite.Value.Duration) {
        $reportContent += "Duration: " + $suite.Value.Duration + "`n"
    }
    $reportContent += "`n"
}

$reportContent += "## Test Coverage`n`n"
$reportContent += "This E2E test suite validates critical user flows:`n`n"
$reportContent += "1. Guard authentication and operations`n"
$reportContent += "2. Visitor invitation workflow`n"
$reportContent += "3. QR/OTP access verification`n`n"

$reportContent += "---`n"
$reportContent += "Generated by Secure Gate E2E Test Suite`n"

# Write report
$reportContent | Out-File -FilePath $OutputFile -Encoding UTF8
Write-Success "Test report saved to: $OutputFile"

# Determine exit code
$exitCode = if ($overallResults.Failed -gt 0 -or $overallResults.Errors -gt 0) {
    Write-Failure "E2E Test Suite FAILED"
    2
} elseif ($overallResults.Partial -gt 0) {
    Write-Warning "E2E Test Suite PARTIAL"
    1
} elseif ($overallResults.Passed -gt 0) {
    Write-Success "E2E Test Suite PASSED"
    0
} else {
    Write-Warning "E2E Test Suite completed with no executable tests"
    1
}

Write-Info "Test suite completed"
exit $exitCode