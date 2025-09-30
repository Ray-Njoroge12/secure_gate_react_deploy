# E2E Test Suite Orchestrator
# Comprehensive end-to-end testing orchestration for all critical user flows
# Runs guard operations, visitor invite workflow, and QR/OTP verification tests

param(
    [string]$ServerUrl = "http://localhost:3000",
    [string]$ClientUrl = "http://localhost:3001",
    [switch]$Verbose = $false,
    [switch]$SkipGuardTests = $false,
    [switch]$SkipInviteTests = $false,
    [switch]$SkipQrTests = $false,
    [switch]$StopOnFailure = $false,
    [switch]$GenerateReport = $true
)

# Color functions for output  
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Blue }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

# Test orchestration configuration
$TestSuiteResults = @{}
$StartTime = Get-Date
$TestsDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Info "====================================================================="
Write-Info "  SECURE GATE ACCESS - COMPREHENSIVE E2E TEST SUITE"
Write-Info "====================================================================="
Write-Info "Start Time: $($StartTime.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Info "Server URL: $ServerUrl"
Write-Info "Client URL: $ClientUrl"
Write-Host ""

# Pre-flight checks
Write-Info "Performing pre-flight checks..."

# Check server connectivity
try {
    $healthResponse = Invoke-RestMethod -Uri "$ServerUrl/health" -Method Get -TimeoutSec 10
    if ($healthResponse.status -eq "ok") {
        Write-Success "Server health check passed"
    } else {
        Write-Warning "Server health check returned: $($healthResponse.status)"
    }
} catch {
    Write-Error "Server health check failed: $($_.Exception.Message)"
    if ($StopOnFailure) {
        Write-Error "Stopping test suite due to server connectivity issues"
        exit 1
    }
}

# Check client accessibility
try {
    $clientResponse = Invoke-WebRequest -Uri $ClientUrl -Method Get -TimeoutSec 10 -UseBasicParsing
    if ($clientResponse.StatusCode -eq 200) {
        Write-Success "Client accessibility check passed"
    }
} catch {
    Write-Warning "Client accessibility check failed: $($_.Exception.Message)"
}

Write-Host ""

# Test Suite 1: Guard Login & Operations
if (-not $SkipGuardTests) {
    Write-Info "Running Test Suite 1: Guard Login & Operations"
    Write-Host "----------------------------------------"
    
    $guardTestScript = Join-Path $TestsDir "e2e-guard-operations.ps1"
    if (Test-Path $guardTestScript) {
        try {
            $guardTestArgs = @(
                "-ServerUrl", $ServerUrl,
                "-ClientUrl", $ClientUrl
            )
            if ($Verbose) { $guardTestArgs += "-Verbose" }
            
            $guardResult = & $guardTestScript @guardTestArgs
            $guardExitCode = $LASTEXITCODE
            
            $TestSuiteResults["GuardOperations"] = @{
                ExitCode = $guardExitCode
                Status = switch ($guardExitCode) {
                    0 { "PASS" }
                    1 { "PARTIAL" }
                    default { "FAIL" }
                }
                StartTime = Get-Date
                Duration = "Completed"
            }
            
            Write-Host ""
            switch ($guardExitCode) {
                0 { Write-Success "Guard Operations Test Suite: PASSED" }
                1 { Write-Warning "Guard Operations Test Suite: PARTIAL (warnings)" }
                default { 
                    Write-Error "Guard Operations Test Suite: FAILED"
                    if ($StopOnFailure) {
                        Write-Error "Stopping test suite due to critical guard test failures"
                        exit $guardExitCode
                    }
                }
            }
        } catch {
            Write-Error "Guard Operations Test Suite execution error: $($_.Exception.Message)"
            $TestSuiteResults["GuardOperations"] = @{
                ExitCode = -1
                Status = "ERROR"
                Error = $_.Exception.Message
            }
            if ($StopOnFailure) { exit 1 }
        }
    } else {
        Write-Error "Guard Operations test script not found: $guardTestScript"
        $TestSuiteResults["GuardOperations"] = @{ Status = "MISSING" }
    }
} else {
    Write-Info "Skipping Guard Operations tests"
    $TestSuiteResults["GuardOperations"] = @{ Status = "SKIPPED" }
}

Write-Host ""

# Test Suite 2: Visitor Invite Workflow
if (-not $SkipInviteTests) {
    Write-Info "Running Test Suite 2: Visitor Invite Workflow"
    Write-Host "---------------------------------------------"
    
    $inviteTestScript = Join-Path $TestsDir "e2e-visitor-invite-workflow.ps1"
    if (Test-Path $inviteTestScript) {
        try {
            $inviteTestArgs = @(
                "-ServerUrl", $ServerUrl,
                "-ClientUrl", $ClientUrl
            )
            if ($Verbose) { $inviteTestArgs += "-Verbose" }
            
            $inviteResult = & $inviteTestScript @inviteTestArgs
            $inviteExitCode = $LASTEXITCODE
            
            $TestSuiteResults["VisitorInviteWorkflow"] = @{
                ExitCode = $inviteExitCode
                Status = switch ($inviteExitCode) {
                    0 { "PASS" }
                    1 { "PARTIAL" }
                    default { "FAIL" }
                }
                StartTime = Get-Date
                Duration = "Completed"
            }
            
            Write-Host ""
            switch ($inviteExitCode) {
                0 { Write-Success "Visitor Invite Workflow Test Suite: PASSED" }
                1 { Write-Warning "Visitor Invite Workflow Test Suite: PARTIAL (warnings)" }
                default { 
                    Write-Error "Visitor Invite Workflow Test Suite: FAILED"
                    if ($StopOnFailure) {
                        Write-Error "Stopping test suite due to critical invite workflow failures"
                        exit $inviteExitCode
                    }
                }
            }
        } catch {
            Write-Error "Visitor Invite Workflow Test Suite execution error: $($_.Exception.Message)"
            $TestSuiteResults["VisitorInviteWorkflow"] = @{
                ExitCode = -1
                Status = "ERROR"
                Error = $_.Exception.Message
            }
            if ($StopOnFailure) { exit 1 }
        }
    } else {
        Write-Error "Visitor Invite Workflow test script not found: $inviteTestScript"
        $TestSuiteResults["VisitorInviteWorkflow"] = @{ Status = "MISSING" }
    }
} else {
    Write-Info "Skipping Visitor Invite Workflow tests"
    $TestSuiteResults["VisitorInviteWorkflow"] = @{ Status = "SKIPPED" }
}

Write-Host ""

# Test Suite 3: QR/OTP Verification
if (-not $SkipQrTests) {
    Write-Info "Running Test Suite 3: QR/OTP Access Verification"
    Write-Host "------------------------------------------------"
    
    $qrTestScript = Join-Path $TestsDir "e2e-qr-otp-verification.ps1"
    if (Test-Path $qrTestScript) {
        try {
            $qrTestArgs = @(
                "-ServerUrl", $ServerUrl,
                "-ClientUrl", $ClientUrl
            )
            if ($Verbose) { $qrTestArgs += "-Verbose" }
            
            $qrResult = & $qrTestScript @qrTestArgs
            $qrExitCode = $LASTEXITCODE
            
            $TestSuiteResults["QrOtpVerification"] = @{
                ExitCode = $qrExitCode
                Status = switch ($qrExitCode) {
                    0 { "PASS" }
                    1 { "PARTIAL" }
                    default { "FAIL" }
                }
                StartTime = Get-Date
                Duration = "Completed"
            }
            
            Write-Host ""
            switch ($qrExitCode) {
                0 { Write-Success "QR/OTP Access Verification Test Suite: PASSED" }
                1 { Write-Warning "QR/OTP Access Verification Test Suite: PARTIAL (warnings)" }
                default { 
                    Write-Error "QR/OTP Access Verification Test Suite: FAILED"
                    if ($StopOnFailure) {
                        Write-Error "Stopping test suite due to critical QR/OTP verification failures"
                        exit $qrExitCode
                    }
                }
            }
        } catch {
            Write-Error "QR/OTP Access Verification Test Suite execution error: $($_.Exception.Message)"
            $TestSuiteResults["QrOtpVerification"] = @{
                ExitCode = -1
                Status = "ERROR"
                Error = $_.Exception.Message
            }
            if ($StopOnFailure) { exit 1 }
        }
    } else {
        Write-Error "QR/OTP Access Verification test script not found: $qrTestScript"
        $TestSuiteResults["QrOtpVerification"] = @{ Status = "MISSING" }
    }
} else {
    Write-Info "Skipping QR/OTP Access Verification tests"
    $TestSuiteResults["QrOtpVerification"] = @{ Status = "SKIPPED" }
}

# Final Test Suite Results
$EndTime = Get-Date
$TotalDuration = $EndTime - $StartTime

Write-Host ""
Write-Info "====================================================================="
Write-Info "  E2E TEST SUITE EXECUTION COMPLETE"
Write-Info "====================================================================="
Write-Info "End Time: $($EndTime.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Info "Total Duration: $($TotalDuration.ToString('hh\:mm\:ss'))"
Write-Host ""

# Results Summary
Write-Info "Test Suite Results Summary:"
Write-Host ""

$overallResults = @{
    Total = 0
    Passed = 0
    Failed = 0
    Partial = 0
    Skipped = 0
    Errors = 0
    Missing = 0
}

foreach ($suite in $TestSuiteResults.GetEnumerator() | Sort-Object Name) {
    $overallResults.Total++
    
    $status = switch ($suite.Value.Status) {
        "PASS" { 
            $overallResults.Passed++
            Write-Host "✓ $($suite.Key): PASSED" -ForegroundColor Green
            break
        }
        "PARTIAL" { 
            $overallResults.Partial++
            Write-Host "⚠ $($suite.Key): PARTIAL" -ForegroundColor Yellow
            break
        }
        "FAIL" { 
            $overallResults.Failed++
            Write-Host "✗ $($suite.Key): FAILED" -ForegroundColor Red
            break
        }
        "SKIPPED" { 
            $overallResults.Skipped++
            Write-Host "⊝ $($suite.Key): SKIPPED" -ForegroundColor Cyan
            break
        }
        "ERROR" { 
            $overallResults.Errors++
            Write-Host "⚠ $($suite.Key): ERROR" -ForegroundColor Red
            if ($suite.Value.Error) {
                Write-Host "   Error: $($suite.Value.Error)" -ForegroundColor Red
            }
            break
        }
        "MISSING" { 
            $overallResults.Missing++
            Write-Host "? $($suite.Key): MISSING" -ForegroundColor Magenta
            break
        }
    }
}

Write-Host ""
Write-Host "Overall Summary:" -ForegroundColor Cyan
Write-Host "  Total Suites: $($overallResults.Total)"
Write-Host "  Passed: $($overallResults.Passed)" -ForegroundColor Green
Write-Host "  Failed: $($overallResults.Failed)" -ForegroundColor Red
Write-Host "  Partial: $($overallResults.Partial)" -ForegroundColor Yellow  
Write-Host "  Skipped: $($overallResults.Skipped)" -ForegroundColor Cyan
Write-Host "  Errors: $($overallResults.Errors)" -ForegroundColor Red
Write-Host "  Missing: $($overallResults.Missing)" -ForegroundColor Magenta

# Generate detailed report if requested
if ($GenerateReport) {
    $reportPath = Join-Path (Split-Path -Parent $TestsDir) "E2E_TEST_SUITE_REPORT_$(Get-Date -Format 'yyyyMMdd_HHmmss').md"
    
    $reportContent = @"
# End-to-End Test Suite Report

**Execution Date**: $($StartTime.ToString('yyyy-MM-dd HH:mm:ss'))  
**Total Duration**: $($TotalDuration.ToString('hh\:mm\:ss'))  
**Server URL**: $ServerUrl  
**Client URL**: $ClientUrl

## Summary

**Total Suites**: $($overallResults.Total)  
**Passed**: $($overallResults.Passed)  
**Failed**: $($overallResults.Failed)  
**Partial**: $($overallResults.Partial)  
**Skipped**: $($overallResults.Skipped)  
**Errors**: $($overallResults.Errors)  
**Missing**: $($overallResults.Missing)

## Test Suite Details

"@

    foreach ($suite in $TestSuiteResults.GetEnumerator() | Sort-Object Name) {
        $reportContent += @"

### $($suite.Key)

**Status**: $($suite.Value.Status)  
**Exit Code**: $($suite.Value.ExitCode)  
"@
        
        if ($suite.Value.Error) {
            $reportContent += "Error: " + $suite.Value.Error + "`n"
        }
        
        if ($suite.Value.Duration) {
            $reportContent += "Duration: " + $suite.Value.Duration + "`n"
        }
    }

    $reportContent += "`n## Test Coverage Analysis`n`n"
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
    $reportContent += "- Monitor identified areas closely in production`n"

## Technical Notes

- Tests create temporary user accounts and test data
- All test operations are logged and audited
- Security attack simulations validate protection mechanisms
- QR code generation and verification are fully tested

**Generated**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

    try {
        $reportContent | Out-File -FilePath $reportPath -Encoding UTF8
        Write-Success "Detailed report generated: $reportPath"
    } catch {
        Write-Warning "Failed to generate report: $($_.Exception.Message)"
    }
}

# Determine overall exit code
$overallExitCode = if ($overallResults.Failed -gt 0 -or $overallResults.Errors -gt 0) {
    Write-Error "❌ E2E Test Suite FAILED - Critical issues detected"
    2
} elseif ($overallResults.Partial -gt 0) {
    Write-Warning "⚠ E2E Test Suite PARTIAL - Some warnings detected"
    1
} elseif ($overallResults.Passed -gt 0) {
    Write-Success "🎉 E2E Test Suite PASSED - All critical flows validated successfully!"
    0
} else {
    Write-Warning "⊝ E2E Test Suite completed with no executable tests"
    1
}

Write-Host ""
Write-Info "====================================================================="

exit $overallExitCode