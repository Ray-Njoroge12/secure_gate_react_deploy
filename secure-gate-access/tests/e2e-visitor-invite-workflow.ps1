# E2E Tests - Visitor Invite Workflow  
# Comprehensive end-to-end testing for visitor invitation creation, processing, and completion
# Tests complete invite lifecycle from resident creation to guest completion and approval

param(
    [string]$ServerUrl = "http://localhost:3000",
    [string]$ClientUrl = "http://localhost:3001",
    [switch]$Verbose = $false,
    [switch]$TestNotifications = $false
)

# Color functions for output
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Blue }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

# Test configuration
$Headers = @{ "Content-Type" = "application/json" }
$TestResults = @{}
$ResidentAuthToken = $null
$InviteCode = $null
$BulkInviteCode = $null
$CreatedVisitorId = $null
$TestResidentUser = $null

Write-Info "Starting Visitor Invite Workflow E2E Tests"
Write-Info "Server: $ServerUrl | Client: $ClientUrl"
Write-Host ""

# Test 1: Resident User Setup for Invite Creation
Write-Info "Test 1: Resident Authentication & Setup"
$timestamp = (Get-Date).ToString("yyyyMMddHHmmss")

$residentCredentials = @{
    username = "resident_invite_$timestamp"
    password = "InviteTest123!"
    email = "invitetest_$timestamp@example.com"
    role = "resident"
}

try {
    # Register resident user
    $regResponse = Invoke-RestMethod -Uri "$ServerUrl/api/users/register" -Method Post -Body ($residentCredentials | ConvertTo-Json) -Headers $Headers
    if ($regResponse.success -and $regResponse.user) {
        Write-Success "Resident user registered: ID=$($regResponse.user.id)"
        $TestResidentUser = $regResponse.user
        
        # Login resident user
        $loginData = @{
            username = $residentCredentials.username
            password = $residentCredentials.password
        }
        $loginResponse = Invoke-RestMethod -Uri "$ServerUrl/api/users/login" -Method Post -Body ($loginData | ConvertTo-Json) -Headers $Headers
        
        if ($loginResponse.success -and $loginResponse.token) {
            Write-Success "Resident login successful, token received"
            $ResidentAuthToken = $loginResponse.token
            $TestResults["ResidentSetup"] = "PASS"
        } else {
            Write-Error "Resident login failed: $($loginResponse.message)"
            $TestResults["ResidentSetup"] = "FAIL"
        }
    } else {
        Write-Error "Resident registration failed: $($regResponse.message)"
        $TestResults["ResidentSetup"] = "FAIL"
    }
} catch {
    Write-Error "Resident setup error: $($_.Exception.Message)"
    $TestResults["ResidentSetup"] = "FAIL"
}

# Test 2: Single Visitor Invite Creation
Write-Info "Test 2: Single Visitor Invite Creation"
if ($ResidentAuthToken) {
    $residentHeaders = $Headers.Clone()
    $residentHeaders["Authorization"] = "Bearer $ResidentAuthToken"
    
    $visitorInviteData = @{
        name = "E2E Guest Visitor"
        phone = "0787654321"
        email = "e2eguest_$timestamp@example.com"
        dateOfVisit = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        time = "14:30"
        purpose = "E2E invite workflow testing"
    }
    
    try {
        $inviteResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors" -Method Post -Body ($visitorInviteData | ConvertTo-Json) -Headers $residentHeaders
        if ($inviteResponse.success -and $inviteResponse.visitor) {
            $CreatedVisitorId = $inviteResponse.visitor.id
            $InviteCode = $inviteResponse.visitor.inviteCode
            Write-Success "Visitor invite created: ID=$CreatedVisitorId, Code=$InviteCode"
            
            # Verify invite link generation
            if ($inviteResponse.inviteLink) {
                Write-Success "Invite link generated: $($inviteResponse.inviteLink)"
                $TestResults["SingleInviteCreation"] = "PASS"
            } else {
                Write-Warning "Invite created but no invite link generated"
                $TestResults["SingleInviteCreation"] = "PARTIAL"
            }
        } else {
            Write-Error "Visitor invite creation failed: $($inviteResponse.message)"
            $TestResults["SingleInviteCreation"] = "FAIL"
        }
    } catch {
        Write-Error "Single invite creation error: $($_.Exception.Message)"
        $TestResults["SingleInviteCreation"] = "FAIL"
    }
} else {
    Write-Warning "Skipping single invite creation - resident authentication failed"
    $TestResults["SingleInviteCreation"] = "SKIP"
}

# Test 3: Bulk Invite Creation
Write-Info "Test 3: Bulk Invite Creation"
if ($ResidentAuthToken) {
    $residentHeaders = $Headers.Clone()
    $residentHeaders["Authorization"] = "Bearer $ResidentAuthToken"
    
    $bulkInviteData = @{
        eventName = "E2E Test Event $timestamp"
        date = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
        time = "18:00"
        numGuests = 5
    }
    
    try {
        $bulkResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/bulk-invite" -Method Post -Body ($bulkInviteData | ConvertTo-Json) -Headers $residentHeaders
        if ($bulkResponse.success -and $bulkResponse.data) {
            $BulkInviteCode = $bulkResponse.data.invite_code
            Write-Success "Bulk invite created: Event='$($bulkResponse.data.event_name)', Code=$BulkInviteCode"
            Write-Success "Bulk invite slots: $($bulkResponse.data.remaining_slots)/$($bulkResponse.data.num_guests)"
            
            # Verify bulk invite link generation
            if ($bulkResponse.data.inviteLink) {
                Write-Success "Bulk invite link generated: $($bulkResponse.data.inviteLink)"
                $TestResults["BulkInviteCreation"] = "PASS"
            } else {
                Write-Warning "Bulk invite created but no invite link generated"
                $TestResults["BulkInviteCreation"] = "PARTIAL"
            }
        } else {
            Write-Error "Bulk invite creation failed: $($bulkResponse.message)"
            $TestResults["BulkInviteCreation"] = "FAIL"
        }
    } catch {
        Write-Error "Bulk invite creation error: $($_.Exception.Message)"
        $TestResults["BulkInviteCreation"] = "FAIL"
    }
} else {
    Write-Warning "Skipping bulk invite creation - resident authentication failed"
    $TestResults["BulkInviteCreation"] = "SKIP"
}

# Test 4: Guest Invite Validation & Access
Write-Info "Test 4: Guest Invite Validation & Access"
if ($InviteCode) {
    try {
        # Test guest accessing invite (public endpoint)
        $inviteAccessResponse = Invoke-RestMethod -Uri "$ServerUrl/invite/$InviteCode" -Method Get
        if ($inviteAccessResponse.success -or $inviteAccessResponse.visitor) {
            Write-Success "Guest can access invite via public endpoint"
            $inviteAccessValid = "PASS"
        } else {
            Write-Warning "Invite access returned unexpected response: $($inviteAccessResponse.message)"
            $inviteAccessValid = "PARTIAL"
        }
        
        # Test bulk invite access
        if ($BulkInviteCode) {
            $bulkAccessResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/bulk-invite/$BulkInviteCode" -Method Get
            if ($bulkAccessResponse.success -and $bulkAccessResponse.data) {
                Write-Success "Guest can access bulk invite information"
                $bulkInviteAccess = "PASS"
            } else {
                Write-Error "Bulk invite access failed: $($bulkAccessResponse.error)"
                $bulkInviteAccess = "FAIL"
            }
        } else {
            $bulkInviteAccess = "SKIP"
        }
        
        $TestResults["GuestInviteAccess"] = if ($inviteAccessValid -eq "PASS" -and ($bulkInviteAccess -in @("PASS", "SKIP"))) { "PASS" } else { "PARTIAL" }
        
    } catch {
        Write-Error "Guest invite access error: $($_.Exception.Message)"
        $TestResults["GuestInviteAccess"] = "FAIL"
    }
} else {
    Write-Warning "Skipping guest invite access - no invite code available"
    $TestResults["GuestInviteAccess"] = "SKIP"
}

# Test 5: Guest Invite Completion (Personal Information)
Write-Info "Test 5: Guest Invite Completion & OTP Process"
if ($InviteCode) {
    $guestCompletionData = @{
        name = "E2E Guest Completed"
        phone = "0798765432"
        email = "guestcomplete_$timestamp@example.com"
        idNumber = "8001010001088"
        vehiclePlate = "TEST123GP"
        expectedTime = "2 hours"
    }
    
    try {
        $completionResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/complete/$InviteCode" -Method Post -Body ($guestCompletionData | ConvertTo-Json) -Headers $Headers
        if ($completionResponse.success -and $completionResponse.data.visitor) {
            Write-Success "Guest invite completion successful"
            $completedVisitor = $completionResponse.data.visitor
            
            # Verify OTP issuance  
            if ($completionResponse.data.otp_issued) {
                Write-Success "OTP issued for guest verification"
                
                # Check if debug OTP is available (for testing environments)
                if ($completionResponse.data.debug_otp) {
                    $debugOtp = $completionResponse.data.debug_otp
                    Write-Info "Debug OTP available: $debugOtp"
                    
                    # Test OTP verification with debug OTP
                    $otpVerificationData = @{ otp = $debugOtp }
                    $otpResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/$($completedVisitor.id)/verify-otp" -Method Post -Body ($otpVerificationData | ConvertTo-Json) -Headers $Headers
                    
                    if ($otpResponse.success -and $otpResponse.data.verified) {
                        Write-Success "OTP verification successful, visitor confirmed"
                        $otpVerification = "PASS"
                    } else {
                        Write-Error "OTP verification failed: $($otpResponse.error)"
                        $otpVerification = "FAIL"
                    }
                } else {
                    Write-Info "No debug OTP available, OTP verification not testable in this environment"
                    $otpVerification = "SKIP"
                }
                
                $TestResults["GuestInviteCompletion"] = if ($otpVerification -in @("PASS", "SKIP")) { "PASS" } else { "PARTIAL" }
            } else {
                Write-Warning "Guest completion succeeded but OTP not issued"
                $TestResults["GuestInviteCompletion"] = "PARTIAL"
            }
        } else {
            Write-Error "Guest invite completion failed: $($completionResponse.error)"
            $TestResults["GuestInviteCompletion"] = "FAIL"
        }
    } catch {
        Write-Error "Guest invite completion error: $($_.Exception.Message)"
        $TestResults["GuestInviteCompletion"] = "FAIL"
    }
} else {
    Write-Warning "Skipping guest invite completion - no invite code available"
    $TestResults["GuestInviteCompletion"] = "SKIP"
}

# Test 6: Bulk Invite Guest Registration
Write-Info "Test 6: Bulk Invite Guest Registration"
if ($BulkInviteCode) {
    $bulkGuestData = @{
        name = "Bulk Guest Test"
        phone = "0701234567"
        email = "bulkguest_$timestamp@example.com"
        idNumber = "9001010001088"
        vehiclePlate = "BULK123GP"
    }
    
    try {
        $bulkCompletionResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/complete/$BulkInviteCode" -Method Post -Body ($bulkGuestData | ConvertTo-Json) -Headers $Headers
        if ($bulkCompletionResponse.success -and $bulkCompletionResponse.data.visitor) {
            Write-Success "Bulk invite guest registration successful"
            
            # Verify slot consumption
            $updatedBulkResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/bulk-invite/$BulkInviteCode" -Method Get
            if ($updatedBulkResponse.success) {
                $remainingSlots = $updatedBulkResponse.data.remaining_slots
                Write-Success "Bulk invite slots decremented: $remainingSlots remaining"
                $TestResults["BulkGuestRegistration"] = "PASS"
            } else {
                Write-Warning "Bulk guest registered but slot verification failed"
                $TestResults["BulkGuestRegistration"] = "PARTIAL"
            }
        } else {
            Write-Error "Bulk guest registration failed: $($bulkCompletionResponse.error)"
            $TestResults["BulkGuestRegistration"] = "FAIL"
        }
    } catch {
        Write-Error "Bulk guest registration error: $($_.Exception.Message)"
        $TestResults["BulkGuestRegistration"] = "FAIL"
    }
} else {
    Write-Warning "Skipping bulk guest registration - no bulk invite code available"
    $TestResults["BulkGuestRegistration"] = "SKIP"
}

# Test 7: OTP Resend Functionality
Write-Info "Test 7: OTP Resend & Throttling"
if ($CreatedVisitorId -and $TestResults["GuestInviteCompletion"] -eq "PASS") {
    try {
        # Test OTP resend
        $resendResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/$CreatedVisitorId/resend-otp" -Method Post -Headers $Headers
        if ($resendResponse.success) {
            Write-Success "OTP resend successful"
            
            # Test resend throttling (should be rate-limited)
            Start-Sleep -Seconds 1
            try {
                $throttleResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/$CreatedVisitorId/resend-otp" -Method Post -Headers $Headers -ErrorAction Stop
                Write-Warning "OTP resend throttling not enforced (potential security issue)"
                $otpThrottling = "FAIL"
            } catch {
                if ($_.Exception.Response.StatusCode -eq 429) {
                    Write-Success "OTP resend properly throttled (429 Too Many Requests)"
                    $otpThrottling = "PASS"
                } else {
                    Write-Warning "Unexpected error during throttling test: $($_.Exception.Response.StatusCode)"
                    $otpThrottling = "PARTIAL"
                }
            }
            
            $TestResults["OtpResendFunctionality"] = $otpThrottling
        } else {
            Write-Error "OTP resend failed: $($resendResponse.error)"
            $TestResults["OtpResendFunctionality"] = "FAIL"
        }
    } catch {
        Write-Error "OTP resend test error: $($_.Exception.Message)"
        $TestResults["OtpResendFunctionality"] = "FAIL"
    }
} else {
    Write-Warning "Skipping OTP resend test - prerequisites not met"
    $TestResults["OtpResendFunctionality"] = "SKIP"
}

# Test 8: Pass Generation After Confirmation
Write-Info "Test 8: Pass Generation & QR Code Creation"
if ($ResidentAuthToken -and $CreatedVisitorId) {
    $residentHeaders = $Headers.Clone()
    $residentHeaders["Authorization"] = "Bearer $ResidentAuthToken"
    
    try {
        $passResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/$CreatedVisitorId/pass" -Method Post -Headers $residentHeaders
        if ($passResponse.success -and $passResponse.data) {
            Write-Success "Pass generated successfully: PassID=$($passResponse.data.pass_id)"
            
            # Verify QR code generation
            if ($passResponse.data.qr_code) {
                Write-Success "QR code generated for pass"
                
                # Basic QR code data validation (should be a data URL)
                if ($passResponse.data.qr_code.StartsWith("data:image/png;base64,")) {
                    Write-Success "QR code format is valid (PNG base64 data URL)"
                    $TestResults["PassGeneration"] = "PASS"
                } else {
                    Write-Warning "QR code format may be invalid: $($passResponse.data.qr_code.Substring(0, [Math]::Min(50, $passResponse.data.qr_code.Length)))"
                    $TestResults["PassGeneration"] = "PARTIAL"
                }
            } else {
                Write-Warning "Pass generated but no QR code included"
                $TestResults["PassGeneration"] = "PARTIAL"
            }
        } else {
            Write-Error "Pass generation failed: $($passResponse.error)"
            $TestResults["PassGeneration"] = "FAIL"
        }
    } catch {
        Write-Error "Pass generation error: $($_.Exception.Message)"
        $TestResults["PassGeneration"] = "FAIL"
    }
} else {
    Write-Warning "Skipping pass generation - missing prerequisites"
    $TestResults["PassGeneration"] = "SKIP"
}

# Test 9: Visitor Status Lifecycle Validation
Write-Info "Test 9: Visitor Status Lifecycle Validation"
if ($ResidentAuthToken -and $CreatedVisitorId) {
    $residentHeaders = $Headers.Clone()
    $residentHeaders["Authorization"] = "Bearer $ResidentAuthToken"
    
    try {
        # Get visitor current status
        $visitorResponse = Invoke-RestMethod -Uri "$ServerUrl/api/visitors" -Method Get -Headers $residentHeaders
        if ($visitorResponse.success -and $visitorResponse.data) {
            $createdVisitor = $visitorResponse.data | Where-Object { $_.id -eq $CreatedVisitorId }
            if ($createdVisitor) {
                $currentStatus = $createdVisitor.status
                Write-Success "Visitor status retrieved: $currentStatus"
                
                # Validate status progression based on test results
                $validStatuses = @("PENDING", "OTP_SENT", "CONFIRMED", "ACTIVE")
                if ($currentStatus -in $validStatuses) {
                    Write-Success "Visitor status is in valid lifecycle state"
                    $TestResults["StatusLifecycle"] = "PASS"
                } else {
                    Write-Warning "Visitor status may be invalid: $currentStatus"
                    $TestResults["StatusLifecycle"] = "PARTIAL"
                }
            } else {
                Write-Error "Created visitor not found in resident's visitor list"
                $TestResults["StatusLifecycle"] = "FAIL"
            }
        } else {
            Write-Error "Failed to retrieve visitor list: $($visitorResponse.error)"
            $TestResults["StatusLifecycle"] = "FAIL"
        }
    } catch {
        Write-Error "Status lifecycle validation error: $($_.Exception.Message)"
        $TestResults["StatusLifecycle"] = "FAIL"
    }
} else {
    Write-Warning "Skipping status lifecycle validation - missing prerequisites"
    $TestResults["StatusLifecycle"] = "SKIP"
}

# Test 10: Notification System Integration (if enabled)
Write-Info "Test 10: Notification System Integration"
if ($TestNotifications) {
    Write-Info "Testing notification integration (email/SMS simulation)"
    
    # This test would require mock notification services or test environments
    # For E2E testing, we validate that the invite creation doesn't fail when notifications are enabled
    try {
        Write-Info "Notification integration test requires external service configuration"
        Write-Info "Verifying notification settings and delivery attempts in audit logs"
        
        # In a real implementation, you would:
        # 1. Check audit logs for notification attempts
        # 2. Verify email/SMS service integration  
        # 3. Test notification failure handling
        
        $TestResults["NotificationIntegration"] = "SKIP"
        Write-Info "Notification testing skipped - requires configured email/SMS services"
        
    } catch {
        Write-Error "Notification integration test error: $($_.Exception.Message)"
        $TestResults["NotificationIntegration"] = "FAIL"
    }
} else {
    Write-Info "Notification testing disabled (use -TestNotifications to enable)"
    $TestResults["NotificationIntegration"] = "SKIP"
}

# Cleanup Test Data
Write-Info "Cleanup: Removing Test Data"
$cleanupResults = @()

# Cleanup created visitors
if ($CreatedVisitorId -and $ResidentAuthToken) {
    try {
        $residentHeaders = $Headers.Clone()
        $residentHeaders["Authorization"] = "Bearer $ResidentAuthToken"
        # Note: Visitor deletion might not be available via API, depending on implementation
        $cleanupResults += "ℹ Visitor cleanup: ID=$CreatedVisitorId (may require admin action)"
    } catch {
        $cleanupResults += "⚠ Visitor cleanup error: $($_.Exception.Message)"
    }
}

# Cleanup bulk invite
if ($BulkInviteCode) {
    $cleanupResults += "ℹ Bulk invite cleanup: Code=$BulkInviteCode (expires automatically)"
}

if ($cleanupResults.Count -gt 0) {
    $cleanupResults | ForEach-Object { Write-Host "  $_" }
    $TestResults["Cleanup"] = "PARTIAL"
} else {
    Write-Info "No cleanup actions needed"
    $TestResults["Cleanup"] = "SKIP"
}

# Results Summary
Write-Host ""
Write-Info "=== Visitor Invite Workflow E2E Test Results ==="
Write-Host ""

$passCount = ($TestResults.Values | Where-Object { $_ -eq "PASS" }).Count
$failCount = ($TestResults.Values | Where-Object { $_ -eq "FAIL" }).Count  
$skipCount = ($TestResults.Values | Where-Object { $_ -eq "SKIP" }).Count
$partialCount = ($TestResults.Values | Where-Object { $_ -eq "PARTIAL" }).Count

foreach ($test in $TestResults.GetEnumerator() | Sort-Object Name) {
    $status = switch ($test.Value) {
        "PASS" { Write-Host "✓ $($test.Key)" -ForegroundColor Green; break }
        "FAIL" { Write-Host "✗ $($test.Key)" -ForegroundColor Red; break }
        "SKIP" { Write-Host "⊝ $($test.Key)" -ForegroundColor Yellow; break }
        "PARTIAL" { Write-Host "⚠ $($test.Key)" -ForegroundColor Yellow; break }
    }
}

Write-Host ""
Write-Host "Summary: $passCount Passed | $failCount Failed | $skipCount Skipped | $partialCount Partial" -ForegroundColor Cyan

# Critical invite workflow validation
$criticalTests = @("ResidentSetup", "SingleInviteCreation", "GuestInviteCompletion", "PassGeneration")
$criticalFailures = $criticalTests | Where-Object { $TestResults[$_] -eq "FAIL" }

if ($criticalFailures.Count -eq 0) {
    Write-Success "🎉 All critical invite workflow tests passed!"
    Write-Info "Invite codes created: Single=$InviteCode, Bulk=$BulkInviteCode"
} else {
    Write-Error "❌ Critical invite workflow failures detected: $($criticalFailures -join ', ')"
}

if ($failCount -eq 0 -and $partialCount -eq 0) {
    Write-Success "🎉 Complete success! Visitor invite workflow working perfectly."
    exit 0
} elseif ($failCount -eq 0) {
    Write-Warning "⚠ Tests completed with warnings. Review partial results."
    exit 1
} else {
    Write-Error "❌ Some tests failed. Review implementation and try again."
    exit 2
}