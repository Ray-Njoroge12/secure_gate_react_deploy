#!/usr/bin/env pwsh

<#
.SYNOPSIS
Comprehensive E2E Test Suite Runner for Secure Gate Access System

.DESCRIPTION
Executes and orchestrates all end-to-end test scenarios for the complete system validation.
Covers guard operations, visitor invite workflows, and QR/OTP access verification.

.PARAMETER ServerUrl
Base URL of the backend server (default: http://localhost:3001)

.PARAMETER ClientUrl 
Base URL of the frontend client (default: http://localhost:3000)

.PARAMETER SkipGuardTests
Skip guard login and operations tests

.PARAMETER SkipInviteTests  
Skip visitor invite workflow tests

.PARAMETER SkipQrTests
Skip QR/OTP verification tests

.PARAMETER OutputFile
Path for the test report output (default: e2e-test-report.md)

.EXAMPLE
.\e2e-test-runner.ps1 -Verbose
Runs all tests with verbose output

.EXAMPLE
.\e2e-test-runner.ps1 -SkipGuardTests -OutputFile "reports\e2e-results.md"
Runs only invite and QR tests, outputs to custom file
#>

param(
    [string]$ServerUrl = "http://localhost:3001",
    [string]$ClientUrl = "http://localhost:3000", 
    [switch]$SkipGuardTests,
    [switch]$SkipInviteTests,
    [switch]$SkipQrTests,
    [string]$OutputFile = "e2e-test-report.md",
    [switch]$Verbose
)

# Enhanced logging functions
function Write-Info { 
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan 
}

function Write-Success { 
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green 
}

function Write-Failure { 
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red 
}

function Write-Warning { 
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow 
}

# Test result tracking
$testResults = @{
    'Guard Operations' = @{ Status = 'Not Run'; ExitCode = -1; Error = $null; Duration = $null }
    'Visitor Invite Workflow' = @{ Status = 'Not Run'; ExitCode = -1; Error = $null; Duration = $null }
    'QR/OTP Verification' = @{ Status = 'Not Run'; ExitCode = -1; Error = $null; Duration = $null }
}

# Summary counters
$overallResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Partial = 0
    Skipped = 0
    Errors = 0
    Missing = 0
}

Write-Info "Starting Comprehensive E2E Test Suite"
Write-Info "Server: $ServerUrl | Client: $ClientUrl"
Write-Host ""

# Pre-flight checks
Write-Info "Performing pre-flight checks..."

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "$ServerUrl/health" -TimeoutSec 5 -UseBasicParsing
    Write-Success "Backend server is responding"
} catch {
    Write-Failure "Backend server not accessible at $ServerUrl"
    Write-Warning "Please ensure the server is running before executing E2E tests"
    exit 1
}

# Check if individual test scripts exist
$testScripts = @{
    'Guard Operations' = 'e2e-guard-operations.ps1'
    'Visitor Invite Workflow' = 'e2e-visitor-invite-workflow.ps1'
    'QR/OTP Verification' = 'e2e-qr-otp-verification.ps1'
}

foreach ($script in $testScripts.Values) {
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
Write-Host ""

# Execute test suites
Write-Info "Executing E2E Test Suites..."
Write-Host ""

# Guard Operations Tests
if (-not $SkipGuardTests) {
    Write-Info "Running Guard Operations Tests..."
    $overallResults.Total++
    
    try {
        $startTime = Get-Date
        $guardProcess = Start-Process -FilePath "pwsh" -ArgumentList "-File", "e2e-guard-operations.ps1", "-ServerUrl", $ServerUrl, "-ClientUrl", $ClientUrl -Wait -PassThru -NoNewWindow
        $endTime = Get-Date
        $duration = ($endTime - $startTime).ToString("mm\:ss")
        
        $testResults['Guard Operations'].ExitCode = $guardProcess.ExitCode
        $testResults['Guard Operations'].Duration = $duration
        
        switch ($guardProcess.ExitCode) {
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
        Write-Failure "Guard Operations Tests: ERROR - $($_.Exception.Message)"
    }
} else {
    $testResults['Guard Operations'].Status = 'Skipped'
    $overallResults.Skipped++
    Write-Warning "Guard Operations Tests: SKIPPED"
}

# Visitor Invite Workflow Tests
if (-not $SkipInviteTests) {
    Write-Info "Running Visitor Invite Workflow Tests..."
    $overallResults.Total++
    
    try {
        $startTime = Get-Date
        $inviteProcess = Start-Process -FilePath "pwsh" -ArgumentList "-File", "e2e-visitor-invite-workflow.ps1", "-ServerUrl", $ServerUrl, "-ClientUrl", $ClientUrl -Wait -PassThru -NoNewWindow
        $endTime = Get-Date
        $duration = ($endTime - $startTime).ToString("mm\:ss")
        
        $testResults['Visitor Invite Workflow'].ExitCode = $inviteProcess.ExitCode
        $testResults['Visitor Invite Workflow'].Duration = $duration
        
        switch ($inviteProcess.ExitCode) {
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
        Write-Failure "Visitor Invite Workflow Tests: ERROR - $($_.Exception.Message)"
    }
} else {
    $testResults['Visitor Invite Workflow'].Status = 'Skipped'
    $overallResults.Skipped++
    Write-Warning "Visitor Invite Workflow Tests: SKIPPED"
}

# QR/OTP Verification Tests
if (-not $SkipQrTests) {
    Write-Info "Running QR/OTP Verification Tests..."
    $overallResults.Total++
    
    try {
        $startTime = Get-Date
        $qrProcess = Start-Process -FilePath "pwsh" -ArgumentList "-File", "e2e-qr-otp-verification.ps1", "-ServerUrl", $ServerUrl, "-ClientUrl", $ClientUrl -Wait -PassThru -NoNewWindow
        $endTime = Get-Date
        $duration = ($endTime - $startTime).ToString("mm\:ss")
        
        $testResults['QR/OTP Verification'].ExitCode = $qrProcess.ExitCode
        $testResults['QR/OTP Verification'].Duration = $duration
        
        switch ($qrProcess.ExitCode) {
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
        Write-Failure "QR/OTP Verification Tests: ERROR - $($_.Exception.Message)"
    }
} else {
    $testResults['QR/OTP Verification'].Status = 'Skipped'
    $overallResults.Skipped++
    Write-Warning "QR/OTP Verification Tests: SKIPPED"
}

Write-Host ""

# Generate test report
Write-Info "Generating test report..."

$reportContent = "# E2E Test Suite Report`n`n"
$reportContent += "**Generated**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
$reportContent += "**Server URL**: $ServerUrl`n"
$reportContent += "**Client URL**: $ClientUrl`n`n"

$reportContent += "## Summary`n`n"
$reportContent += "**Total Suites**: $($overallResults.Total)`n"
$reportContent += "**Passed**: $($overallResults.Passed)`n"
$reportContent += "**Failed**: $($overallResults.Failed)`n"
$reportContent += "**Partial**: $($overallResults.Partial)`n"
$reportContent += "**Skipped**: $($overallResults.Skipped)`n"
$reportContent += "**Errors**: $($overallResults.Errors)`n"
$reportContent += "**Missing**: $($overallResults.Missing)`n`n"

$reportContent += "## Test Suite Details`n`n"

foreach ($suite in $testResults.GetEnumerator()) {
    $reportContent += "### " + $suite.Key + "`n`n"
    $reportContent += "**Status**: " + $suite.Value.Status + "`n"
    $reportContent += "**Exit Code**: " + $suite.Value.ExitCode + "`n"
    
    if ($suite.Value.Error) {
        $reportContent += "**Error**: " + $suite.Value.Error + "`n"
    }
    
    if ($suite.Value.Duration) {
        $reportContent += "**Duration**: " + $suite.Value.Duration + "`n"
    }
    $reportContent += "`n"
}

$reportContent += "## Test Coverage Analysis`n`n"
$reportContent += "This comprehensive E2E test suite validates the three critical user flows:`n`n"
$reportContent += "1. Guard Login Operations: Authentication, role permissions, check-in/check-out operations, and dashboard functionality`n"
$reportContent += "2. Visitor Invite Workflow: Resident invitation creation, guest completion, OTP issuance, and pass generation`n"
$reportContent += "3. QR/OTP Access Verification: QR code generation, scanning simulation, OTP verification, and security protections`n`n"

$reportContent += "## Recommendations`n`n"
$reportContent += "### If All Tests Passed`n"
$reportContent += "- System is ready for production deployment`n"
$reportContent += "- All critical user journeys are working correctly`n"
$reportContent += "- Security measures are properly implemented`n`n"

$reportContent += "### If Tests Failed`n"
$reportContent += "- Review failed test details in individual test logs`n"
$reportContent += "- Address identified issues before production deployment`n"
$reportContent += "- Re-run specific test suites after fixes`n`n"

$reportContent += "### If Tests Partial`n"
$reportContent += "- Review warnings and partial results`n"
$reportContent += "- Consider if identified issues are acceptable for deployment`n"
$reportContent += "- Monitor identified areas closely in production`n`n"

$reportContent += "---`n"
$reportContent += "*Generated by Secure Gate E2E Test Suite Runner*`n"

# Write report to file
$reportContent | Out-File -FilePath $OutputFile -Encoding UTF8
Write-Success "Test report saved to: $OutputFile"

# Determine overall exit code and final status
$overallExitCode = if ($overallResults.Failed -gt 0 -or $overallResults.Errors -gt 0) {
    Write-Failure "E2E Test Suite FAILED - Critical issues detected"
    2
} elseif ($overallResults.Partial -gt 0) {
    Write-Warning "E2E Test Suite PARTIAL - Some warnings detected"
    1
} elseif ($overallResults.Passed -gt 0) {
    Write-Success "E2E Test Suite PASSED - All critical flows validated successfully!"
    0
} else {
    Write-Warning "E2E Test Suite completed with no executable tests"
    1
}

Write-Host ""
Write-Info "====================================================================="

exit $overallExitCode