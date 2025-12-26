# User Acceptance Testing (UAT) Plan
## Secure Gate Visitor Management System
**Version:** 1.0  
**Date:** December 25, 2025

---

## 1. UAT Overview

### 1.1 Objectives
- Validate system functionality meets business requirements
- Confirm user workflows are intuitive and complete
- Verify Kenya DPA 2019 compliance from user perspective
- Gather user feedback for final refinements

### 1.2 Scope
| Module | In Scope | Out of Scope |
|--------|----------|--------------|
| Visitor Pre-registration | ✅ | |
| Walk-in Visitor Approval | ✅ | |
| Recurring Passes | ✅ | |
| QR Code Check-in | ✅ | |
| Delivery Management | ✅ | |
| Admin Dashboard | ✅ | |
| SMS/WhatsApp Notifications | ✅ | Actual SMS delivery (mocked) |
| Mobile Responsiveness | ✅ | |

---

## 2. UAT Participants

| Role | Count | Responsibilities |
|------|-------|------------------|
| Residents | 5 | Test visitor registration, approvals, recurring passes |
| Guards | 3 | Test check-in flows, QR scanning, walk-in registration |
| Admins | 2 | Test admin dashboard, reports, user management |
| Estate Manager | 1 | Overall workflow validation, compliance check |

---

## 3. Test Scenarios

### 3.1 Resident Scenarios

#### UAT-R01: Register a One-Time Visitor
**Preconditions:** Resident logged in  
**Steps:**
1. Navigate to "Register Visitor"
2. Enter visitor name, phone, purpose
3. Select visit date
4. Submit registration
5. Verify QR code is displayed
6. Copy/share invite link

**Expected Results:**
- [ ] Form submits successfully
- [ ] QR code is generated and displayed
- [ ] SMS notification sent to visitor (check logs)
- [ ] Visitor appears in "My Visitors" list

---

#### UAT-R02: Create Recurring Pass for Daily Worker
**Preconditions:** Resident logged in  
**Steps:**
1. Navigate to "Recurring Passes"
2. Click "Create New Pass"
3. Enter worker details (name, phone, ID number)
4. Set validity period (6 months)
5. Configure schedule (Mon-Fri, 7am-6pm)
6. Submit

**Expected Results:**
- [ ] Pass created successfully
- [ ] 6-digit PIN displayed (for SMS)
- [ ] QR code generated
- [ ] Pass appears in list with "Active" status

---

#### UAT-R03: Approve Walk-In Visitor
**Preconditions:** Resident logged in, guard has registered walk-in  
**Steps:**
1. Receive notification of pending visitor
2. Click notification or navigate to "Pending Approvals"
3. Review visitor details
4. Click "Approve" or "Reject"
5. Optionally add notes

**Expected Results:**
- [ ] Notification received in real-time
- [ ] Visitor details displayed correctly
- [ ] Approval/rejection updates visitor status
- [ ] Guard receives notification of decision

---

### 3.2 Guard Scenarios

#### UAT-G01: Check In Pre-Registered Visitor via QR
**Preconditions:** Guard logged in, visitor has valid QR  
**Steps:**
1. Navigate to "Scan QR"
2. Scan visitor's QR code
3. Verify visitor identity against displayed info
4. Click "Check In"
5. Optionally add notes or vehicle plate

**Expected Results:**
- [ ] QR code validates successfully
- [ ] Visitor details displayed
- [ ] Check-in recorded with timestamp
- [ ] Resident notified of check-in
- [ ] QR code marked as used (one-time)

---

#### UAT-G02: Validate Recurring Pass via PIN
**Preconditions:** Guard logged in, worker has valid PIN  
**Steps:**
1. Navigate to "Recurring Passes" > "Validate"
2. Enter 6-digit PIN
3. Verify worker identity
4. Record entry

**Expected Results:**
- [ ] PIN validates successfully
- [ ] Worker details and photo displayed
- [ ] Schedule restrictions enforced
- [ ] Entry recorded in log

---

#### UAT-G03: Register Walk-In Visitor
**Preconditions:** Guard logged in  
**Steps:**
1. Navigate to "Walk-In Registration"
2. Enter visitor details
3. Search for resident
4. Request approval
5. Wait for resident response
6. Complete check-in upon approval

**Expected Results:**
- [ ] Walk-in form works correctly
- [ ] Resident search functional
- [ ] Approval request sent successfully
- [ ] Real-time status updates received

---

### 3.3 Admin Scenarios

#### UAT-A01: View Access Logs
**Preconditions:** Admin logged in  
**Steps:**
1. Navigate to "Reports" > "Access Logs"
2. Filter by date range
3. Filter by type (visitor, recurring, walk-in)
4. Export to CSV

**Expected Results:**
- [ ] Logs display correctly
- [ ] Filters work as expected
- [ ] Export generates valid CSV file
- [ ] All required fields included

---

#### UAT-A02: Manage User Accounts
**Preconditions:** Admin logged in  
**Steps:**
1. Navigate to "User Management"
2. Create new guard account
3. Edit existing user
4. Disable/enable user
5. Reset user password

**Expected Results:**
- [ ] User creation successful
- [ ] Role assignment works
- [ ] Account enable/disable functional
- [ ] Password reset triggers email

---

## 4. DPA Compliance Scenarios

#### UAT-DPA01: Export Personal Data
**Steps:**
1. Navigate to "Privacy Settings"
2. Click "Export My Data"
3. Download export file
4. Verify contents

**Expected Results:**
- [ ] Export completes within 30 seconds
- [ ] File contains all personal data
- [ ] Data in machine-readable format (JSON)
- [ ] Export logged in audit trail

---

#### UAT-DPA02: Withdraw Consent
**Steps:**
1. Navigate to "Privacy Settings"
2. Toggle off marketing consent
3. Confirm withdrawal
4. Verify no marketing communications

**Expected Results:**
- [ ] Consent withdrawal recorded
- [ ] Settings update immediately
- [ ] Audit log entry created

---

## 5. Sign-Off Criteria

| Criterion | Threshold |
|-----------|-----------|
| Critical scenarios passed | 100% |
| High priority scenarios passed | 95% |
| Medium priority scenarios passed | 90% |
| User satisfaction score | ≥ 4.0/5.0 |
| No blocking issues | Yes |

---

## 6. UAT Schedule

| Phase | Duration | Activities |
|-------|----------|------------|
| Preparation | 2 days | Environment setup, test data |
| Execution | 5 days | Run test scenarios |
| Defect Resolution | 3 days | Fix critical issues |
| Re-test | 2 days | Verify fixes |
| Sign-off | 1 day | Stakeholder approval |

---

## 7. Issue Tracking

| Priority | Response Time | Resolution Time |
|----------|---------------|-----------------|
| Critical | 2 hours | 24 hours |
| High | 4 hours | 48 hours |
| Medium | 8 hours | 72 hours |
| Low | 24 hours | Next release |

---

## 8. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| QA Lead | | | |
| Development Lead | | | |
| Estate Manager | | | |
