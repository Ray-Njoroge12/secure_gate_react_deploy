# Comprehensive Resident Functionality Analysis & Audit

This document provides an exhaustive detailed audit of all resident-facing functionalities within the Secure Gate Access Control System. For each feature, we analyze the current state, identify discrepancies between intended and actual behavior, highlight critical issues, and provide concrete technical recommendations.

## 1. User Registration (Signup) & Activation ✅ COMPLETED

### Description
The entry point for new residents. Security is paramount, so "Self-Service with Heavy Guardrails" is the chosen model.

### Intended Functionality
1.  **Resident**: Fills public "Register" form (Name, Email, House/Unit).
2.  **System**: Creates account with status `PENDING_APPROVAL`.
3.  **Admin**: Receives alert -> Verifies residency -> Clicks "Activate" on dashboard.
4.  **Resident**: Receives "Account Active" email -> Can now login.

### ✅ Implementation Complete (2026-01-19)
*   **Backend**: `POST /api/auth/register` is now PUBLIC, creates users with `account_status='pending'`
*   **Database**: `account_status` column added, `estate_id` allows NULL for pending users
*   **Admin API**: `PUT /api/admin/users/:id/status` activates users and sends emails
*   **Remaining**: Admin Dashboard UI widget (in progress)

---

## 2. Visitor Management (Consolidated "Quick Invite") ✅ COMPLETED

### Description
A single, streamlined flow for all invitations. "Less is More" for the resident.

### The "Resident Minimum Input" Model
*   **Resident**: Inputs ONLY `Name` and `Phone` (and optional `Date` if not "Today").
    *   *System*: Sends SMS link.
*   **Visitor**: Opens Link.
    *   *System*: Shows "Complete Your Details" form.
    *   **Visitor Inputs**: `ID Number` (Required), `Vehicle Plate` (Optional), `Purpose` (Optional).
    *   *System*: Generates QR Code.

### ✅ Implementation Complete (2026-01-19)
*   **Frontend**: `VisitorInvitePage.jsx` now has required "ID Number" field with validation
*   **QuickInvite**: URL parameter pre-filling implemented for favorites
*   **Navigation**: "Add Visitor" removed from all menus (Sidebar, QuickActions, etc.)
*   **Backend**: ID number encryption fully supported

---

## 3. Delivery Management ("Expected Delivery")

### Description
Allowing residents to pre-authorize food/package deliveries to speed up gate processing.

### Intended Functionality
*   **Resident**: Clicks "Expect Delivery" -> Selects "Uber Eats" / "Jumia".
*   **Guard**: Sees "Expected: Uber Eats for House B12" on their tablet.
*   **Action**: Guard just taps "Arrived" -> Resident notified.

### Current Gap
*   Feature does not exist. Guards must manually enter "Uber Eats" and "House B12" every time.

### Recommendation
*   **Backend**: access `deliveryRoutes` to add `POST /expected`.
*   **Frontend**: Add "Expect Delivery" modal to Resident Dashboard.

---

## 4. Cross-Cutting Technical Fixes

### 4.1 Data Privacy
*   **Transition**: Ensure all new flows write to `id_number_encrypted` (backend service already supports this).

### 4.2 Security
*   **Hardening**: Disable `OTP_DEBUG_ECHO` in production config.

### 4.3 Clean Up
*   **Dead Code**: Remove the unused "Standard Add Visitor" page code to prevent maintenance confusion.
