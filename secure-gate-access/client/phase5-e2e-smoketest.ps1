# Phase 5 End-to-End Smoke Test Script
# Tests all client-server flows for visitor management system
# Requirements: Server must be running on localhost:3000, client on localhost:3001

param(
    [string]$ServerUrl = "http://localhost:3000",
    [string]$ClientUrl = "http://localhost:3001",
    [switch]$Verbose = $false
)

# Color functions for output
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Blue }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

# Test configuration
$Headers = @{ "Content-Type" = "application/json" }
$TestResults = @{}
$AuthToken = $null
$TestUserId = $null
$CreatedVisitorId = $null
$InviteCode = $null

Write-Info "Starting Phase 5 End-to-End Smoke Tests"
Write-Info "Server: $ServerUrl | Client: $ClientUrl"
Write-Host ""

# Test 1: Server Health Check
Write-Info "Test 1: Server Health Check"
try {
    $response = Invoke-RestMethod -Uri "$ServerUrl/health" -Method Get -TimeoutSec 5
    if ($response.status -eq "ok") {
        Write-Success "Server is running and healthy"
        $TestResults["ServerHealth"] = "PASS"
    } else {
        Write-Error "Server responded but status is not ok: $($response.status)"
        $TestResults["ServerHealth"] = "FAIL"
    }
} catch {
    Write-Error "Server health check failed: $($_.Exception.Message)"
    $TestResults["ServerHealth"] = "FAIL"
}

# Test 2: Client Accessibility 
Write-Info "Test 2: Client Accessibility Check"
try {
    $response = Invoke-WebRequest -Uri $ClientUrl -Method Get -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Success "Client is accessible"
        $TestResults["ClientAccessibility"] = "PASS"
    } else {
        Write-Error "Client returned status: $($response.StatusCode)"
        $TestResults["ClientAccessibility"] = "FAIL"
    }
} catch {
    Write-Error "Client accessibility check failed: $($_.Exception.Message)"
    $TestResults["ClientAccessibility"] = "FAIL"
}

# Test 3: User Registration
Write-Info "Test 3: User Registration"
$timestamp = (Get-Date).ToString("yyyyMMddHHmmss")
$testUser = @{
    username = "testuser_$timestamp"
    password = "TestPassword123!"
    email = "test_$timestamp@example.com"
    role = "resident"
}

try {
    $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/register" -Method Post -Body ($testUser | ConvertTo-Json) -Headers $Headers
    if ($response.success -and $response.user.id) {
        Write-Success "User registration successful: ID=$($response.user.id)"
        $TestResults["UserRegistration"] = "PASS"
        $TestUserId = $response.user.id
    } else {
        Write-Error "User registration failed: $($response.message)"
        $TestResults["UserRegistration"] = "FAIL"
    }
} catch {
    Write-Error "User registration error: $($_.Exception.Message)"
    $TestResults["UserRegistration"] = "FAIL"
}

# Test 4: User Login & Authentication
Write-Info "Test 4: User Login & Authentication"
if ($TestUserId) {
    $loginData = @{
        username = $testUser.username
        password = $testUser.password
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/auth/login" -Method Post -Body ($loginData | ConvertTo-Json) -Headers $Headers
        if ($response.success -and $response.token) {
            Write-Success "Login successful, token received"
            $TestResults["UserLogin"] = "PASS"
            $AuthToken = $response.token
            $Headers["Authorization"] = "Bearer $AuthToken"
        } else {
            Write-Error "Login failed: $($response.message)"
            $TestResults["UserLogin"] = "FAIL"
        }
    } catch {
        Write-Error "Login error: $($_.Exception.Message)"
        $TestResults["UserLogin"] = "FAIL"
    }
} else {
    Write-Warning "Skipping login test - user registration failed"
    $TestResults["UserLogin"] = "SKIP"
}

# Test 5: Visitor Creation
Write-Info "Test 5: Visitor Creation"
if ($AuthToken) {
    $visitorData = @{
        name = "Test Visitor $timestamp"
        phone = "0712345678"
        email = "visitor_$timestamp@example.com"
        dateOfVisit = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
        time = "14:30"
        purpose = "Testing Phase 5 flows"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/visitors" -Method Post -Body ($visitorData | ConvertTo-Json) -Headers $Headers
        if ($response.success -and $response.visitor.id) {
            Write-Success "Visitor created successfully: ID=$($response.visitor.id)"
            $TestResults["VisitorCreation"] = "PASS"
            $CreatedVisitorId = $response.visitor.id
            
            # Check for invite code in response
            if ($response.visitor.inviteCode) {
                $InviteCode = $response.visitor.inviteCode
                Write-Success "Invite code generated: $InviteCode"
            } else {
                Write-Warning "No invite code in response"
            }
        } else {
            Write-Error "Visitor creation failed: $($response.message)"
            $TestResults["VisitorCreation"] = "FAIL"
        }
    } catch {
        Write-Error "Visitor creation error: $($_.Exception.Message)"
        $TestResults["VisitorCreation"] = "FAIL"
    }
} else {
    Write-Warning "Skipping visitor creation - not authenticated"
    $TestResults["VisitorCreation"] = "SKIP"
}

# Test 6: Pass Generation
Write-Info "Test 6: Pass Generation"
if ($CreatedVisitorId -and $AuthToken) {
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/$CreatedVisitorId/pass" -Method Post -Headers $Headers
        if ($response.success -and $response.pass.passId) {
            Write-Success "Pass generated successfully: PassID=$($response.pass.passId)"
            $TestResults["PassGeneration"] = "PASS"
            
            if ($response.pass.qrCode) {
                Write-Success "QR code generated for pass"
            }
        } else {
            Write-Error "Pass generation failed: $($response.message)"
            $TestResults["PassGeneration"] = "FAIL"
        }
    } catch {
        Write-Error "Pass generation error: $($_.Exception.Message)"
        $TestResults["PassGeneration"] = "FAIL"
    }
} else {
    Write-Warning "Skipping pass generation - visitor creation failed or not authenticated"
    $TestResults["PassGeneration"] = "SKIP"
}

# Test 7: Guest Invitation Completion (if invite code available)
Write-Info "Test 7: Guest Invitation Completion"
if ($InviteCode) {
    # First, check if the invitation endpoint is accessible
    try {
        $inviteCheckResponse = Invoke-RestMethod -Uri "$ServerUrl/api/invites/$InviteCode" -Method Get
        if ($inviteCheckResponse.success) {
            Write-Success "Invite code is valid and accessible"
            
            # Now try to complete the invitation
            $completionData = @{
                personalInfo = @{
                    nationality = "South African"
                    idNumber = "8001010001088"
                    company = "Test Company"
                }
                terms = $true
            }
            
            $completeResponse = Invoke-RestMethod -Uri "$ServerUrl/api/invites/$InviteCode/complete" -Method Post -Body ($completionData | ConvertTo-Json) -Headers $Headers
            if ($completeResponse.success) {
                Write-Success "Guest invitation completed successfully"
                $TestResults["GuestInviteCompletion"] = "PASS"
            } else {
                Write-Error "Guest invitation completion failed: $($completeResponse.message)"
                $TestResults["GuestInviteCompletion"] = "FAIL"
            }
        } else {
            Write-Error "Invite code validation failed: $($inviteCheckResponse.message)"
            $TestResults["GuestInviteCompletion"] = "FAIL"
        }
    } catch {
        Write-Error "Guest invitation completion error: $($_.Exception.Message)"
        $TestResults["GuestInviteCompletion"] = "FAIL"
    }
} else {
    Write-Warning "Skipping guest invitation completion - no invite code available"
    $TestResults["GuestInviteCompletion"] = "SKIP"
}

# Test 8: Bulk Invitation Upload (CSV simulation)
Write-Info "Test 8: Bulk Invitation Upload"
if ($AuthToken) {
    # Simulate CSV data as would be processed by papaparse
    $bulkData = @{
        visitors = @(
            @{
                name = "Bulk Visitor 1"
                phone = "0723456789"
                email = "bulk1_$timestamp@example.com"
                dateOfVisit = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
                time = "10:00"
                purpose = "Bulk test visit"
            },
            @{
                name = "Bulk Visitor 2"
                phone = "0734567890"
                email = "bulk2_$timestamp@example.com"
                dateOfVisit = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
                time = "15:00"
                purpose = "Bulk test visit"
            }
        )
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/visitors/bulk" -Method Post -Body ($bulkData | ConvertTo-Json -Depth 3) -Headers $Headers
        if ($response.success -and $response.results) {
            $successCount = ($response.results | Where-Object { $_.success }).Count
            $totalCount = $response.results.Count
            Write-Success "Bulk upload completed: $successCount/$totalCount successful"
            $TestResults["BulkUpload"] = "PASS"
        } else {
            Write-Error "Bulk upload failed: $($response.message)"
            $TestResults["BulkUpload"] = "FAIL"
        }
    } catch {
        Write-Error "Bulk upload error: $($_.Exception.Message)"
        $TestResults["BulkUpload"] = "FAIL"
    }
} else {
    Write-Warning "Skipping bulk upload - not authenticated"
    $TestResults["BulkUpload"] = "SKIP"
}

# Test 9: Error Mapping & HTTP Status Codes
Write-Info "Test 9: Error Mapping & HTTP Status Codes"
try {
    # Test 401 Unauthorized
    $unauthorizedHeaders = @{ "Content-Type" = "application/json" }
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/visitors" -Method Get -Headers $unauthorizedHeaders -ErrorAction Stop
        Write-Error "Expected 401 but got success response"
        $TestResults["ErrorMapping"] = "FAIL"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Success "401 Unauthorized correctly returned"
            $TestResults["ErrorMapping"] = "PASS"
        } else {
            Write-Error "Expected 401 but got: $($_.Exception.Response.StatusCode)"
            $TestResults["ErrorMapping"] = "FAIL"
        }
    }
} catch {
    Write-Error "Error mapping test error: $($_.Exception.Message)"
    $TestResults["ErrorMapping"] = "FAIL"
}

# Test 10: Frontend Route Accessibility
Write-Info "Test 10: Frontend Route Accessibility"
$routes = @(
    "/",
    "/login", 
    "/guest-invite/sample-code"
)

$routeResults = @()
foreach ($route in $routes) {
    try {
        $response = Invoke-WebRequest -Uri "$ClientUrl$route" -Method Get -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $routeResults += "✓ $route"
        } else {
            $routeResults += "✗ $route (Status: $($response.StatusCode))"
        }
    } catch {
        $routeResults += "✗ $route (Error: $($_.Exception.Message))"
    }
}

if (($routeResults | Where-Object { $_ -like "✓*" }).Count -eq $routes.Count) {
    Write-Success "All frontend routes accessible"
    $TestResults["FrontendRoutes"] = "PASS"
} else {
    Write-Warning "Some frontend routes failed:"
    $routeResults | ForEach-Object { Write-Host "  $_" }
    $TestResults["FrontendRoutes"] = "PARTIAL"
}

# Cleanup: Delete test user (optional)
Write-Info "Test 11: Cleanup"
if ($TestUserId -and $AuthToken) {
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/users/$TestUserId" -Method Delete -Headers $Headers
        if ($response.success) {
            Write-Success "Test user cleanup successful"
            $TestResults["Cleanup"] = "PASS"
        } else {
            Write-Warning "Test user cleanup failed but test data may remain"
            $TestResults["Cleanup"] = "PARTIAL"
        }
    } catch {
        Write-Warning "Cleanup error: $($_.Exception.Message) - Test data may remain"
        $TestResults["Cleanup"] = "PARTIAL"
    }
} else {
    Write-Info "No cleanup needed - test user was not created"
    $TestResults["Cleanup"] = "SKIP"
}

# Results Summary
Write-Host ""
Write-Info "=== Phase 5 E2E Test Results Summary ==="
Write-Host ""

$passCount = ($TestResults.Values | Where-Object { $_ -eq "PASS" }).Count
$failCount = ($TestResults.Values | Where-Object { $_ -eq "FAIL" }).Count  
$skipCount = ($TestResults.Values | Where-Object { $_ -eq "SKIP" }).Count
$partialCount = ($TestResults.Values | Where-Object { $_ -eq "PARTIAL" }).Count

foreach ($test in $TestResults.GetEnumerator()) {
    $status = switch ($test.Value) {
        "PASS" { Write-Host "✓ $($test.Key)" -ForegroundColor Green; break }
        "FAIL" { Write-Host "✗ $($test.Key)" -ForegroundColor Red; break }
        "SKIP" { Write-Host "⊝ $($test.Key)" -ForegroundColor Yellow; break }
        "PARTIAL" { Write-Host "⚠ $($test.Key)" -ForegroundColor Yellow; break }
    }
}

Write-Host ""
Write-Host "Summary: $passCount Passed | $failCount Failed | $skipCount Skipped | $partialCount Partial" -ForegroundColor Cyan

if ($failCount -eq 0 -and $partialCount -eq 0) {
    Write-Success "🎉 All tests passed! Phase 5 implementation is working correctly."
    exit 0
} elseif ($failCount -eq 0) {
    Write-Warning "⚠ Tests completed with warnings. Review partial results."
    exit 1
} else {
    Write-Error "❌ Some tests failed. Review implementation and try again."
    exit 2
}