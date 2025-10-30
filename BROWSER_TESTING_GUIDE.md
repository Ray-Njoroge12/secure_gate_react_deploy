# 🌐 Browser-Based Interactive Testing Guide

## System URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **Backend Health**: http://localhost:5001/health

## Pre-Created Test Accounts

### Resident Account
- **Email**: nn0200774@gmail.com
- **Username**: resident_test
- **Password**: SecurePass123!@#
- **Role**: resident
- **Phone**: +254748192563

### Test Visitor Created
- **Name**: John Test Visitor
- **Phone**: +254748192563
- **Email**: nn0200774@gmail.com
- **Invite Code**: INVITE-c91cbe12-c69f-4b58-b90c-fdd031211b37
- **Invite Link**: http://localhost:5001/invite/INVITE-c91cbe12-c69f-4b58-b90c-fdd031211b37

---

## Test Flow 1: User Authentication

### Step 1: Access Homepage
1. Open browser to: http://localhost:3001
2. **Expected**: Landing page with login/signup options
3. **Verify**: Page loads without errors

### Step 2: Test Registration (New User)
1. Click "Sign Up" or navigate to http://localhost:3001/signup
2. Fill in form:
   - **Email**: Use a different email or nn0200774+test2@gmail.com
   - **Username**: guard_test_user
   - **Password**: SecurePass123!@#
   - **Role**: guard
   - **Phone**: +254113917509
3. Click "Register" button
4. **Expected**: Success message, redirect to login or dashboard
5. **Verify**: Check browser console for any errors

### Step 3: Test Login (Existing User)
1. Navigate to http://localhost:3001/login
2. Enter credentials:
   - **Username**: resident_test
   - **Password**: SecurePass123!@#
3. Click "Login" button
4. **Expected**: Redirect to resident dashboard
5. **Verify**: 
   - User info displayed correctly
   - JWT token stored in localStorage
   - Dashboard loads without errors

---

## Test Flow 2: Visitor Management

### Step 4: Create Visitor Invitation
1. From resident dashboard, navigate to "Create Visitor" or "Invite Visitor"
2. Fill in visitor details:
   - **Name**: Alice Test Visitor
   - **Phone**: +254748192563
   - **Email**: nn0200774@gmail.com
   - **Purpose**: Browser Testing
   - **Date**: Tomorrow's date
   - **Time**: 14:00
3. Click "Send Invitation"
4. **Expected**: 
   - Success message
   - Invite code generated
   - Invite link shown
5. **Verify**:
   - Check email inbox for invitation email (Mailgun)
   - Check phone for invitation SMS (Africa's Talking)
   - Note the invite code

### Step 5: Complete Visitor Invitation
1. Copy the invite link from Step 4
2. Open in new tab/incognito window
3. Fill in visitor confirmation form:
   - **Name**: Alice Test Visitor
   - **Phone**: +254748192563
   - **Email**: nn0200774@gmail.com
   - **ID Number**: 12345678
   - **Vehicle Plate**: KAA 123B (optional)
4. Submit form
5. **Expected**: 
   - OTP generation message
   - OTP sent notification
6. **Verify**:
   - Check email for OTP code
   - Check phone for OTP SMS

### Step 6: Verify OTP
1. Enter OTP code from email/SMS
2. Click "Verify"
3. **Expected**: 
   - Success message
   - QR code displayed
   - Status changed to VERIFIED
4. **Verify**:
   - QR code visible
   - Can download/print pass

---

## Test Flow 3: Guard Operations

### Step 7: Guard Login
1. Logout current user
2. Navigate to http://localhost:3001/login
3. Login with guard account:
   - **Username**: guard_test_user
   - **Password**: SecurePass123!@#
4. **Expected**: Redirect to guard dashboard
5. **Verify**: Guard-specific UI elements visible

### Step 8: Check-In Visitor
1. Navigate to "Pending Visitors" or visitor list
2. Find "Alice Test Visitor" with VERIFIED status
3. Click "Check In" button
4. **Expected**: 
   - Check-in timestamp recorded
   - Status changed to ON_PREMISE
   - Real-time update if SSE enabled
5. **Verify**: Visit logged correctly

### Step 9: Check-Out Visitor
1. Navigate to "Active Visitors" or on-premise list
2. Find "Alice Test Visitor"
3. Click "Check Out" button
4. **Expected**:
   - Check-out timestamp recorded
   - Status changed to CHECKED_OUT
   - Visit completed
5. **Verify**: Visit duration calculated

---

## Test Flow 4: Bulk Invitations

### Step 10: Create Bulk Invitation
1. Login as resident
2. Navigate to "Bulk Invitation" page
3. Create bulk invite:
   - **Event Name**: Monthly Team Meeting
   - **Purpose**: Team Collaboration
   - **Date**: Tomorrow
   - **Time**: 10:00 AM
   - **Max Visitors**: 5
4. Submit
5. **Expected**: Bulk invite code generated
6. **Verify**: Bulk invite link works

### Step 11: Use Bulk Invitation
1. Open bulk invite link
2. Complete details for visitor #1
3. Submit and verify OTP
4. **Expected**: Visitor added, slots decremented (4/5 remaining)
5. **Repeat** for another visitor
6. **Verify**: Slot count updates correctly

---

## Verification Checklist

### Authentication ✅
- [ ] Registration works
- [ ] Login works
- [ ] JWT tokens generated
- [ ] Token stored in browser
- [ ] Logout works
- [ ] Token refresh works

### Visitor Management ⏳
- [ ] Create invitation
- [ ] Email notification sent
- [ ] SMS notification sent
- [ ] Complete invitation
- [ ] OTP sent
- [ ] OTP verification works
- [ ] QR code generated

### Guard Operations ⏳
- [ ] Guard can login
- [ ] Can view pending visitors
- [ ] Can check-in visitors
- [ ] Can check-out visitors
- [ ] Real-time updates work

### Notifications ⏳
- [ ] Email received (Mailgun)
- [ ] SMS received (Africa's Talking)
- [ ] Email formatting correct
- [ ] SMS content correct

### Security ⏳
- [ ] Unauthorized access blocked
- [ ] Role-based access working
- [ ] Invalid token rejected
- [ ] Error messages appropriate

---

## Known Issues & Workarounds

### Issue #1: Audit Logging Disabled
- **Impact**: No audit trail for actions
- **Workaround**: Temporarily disabled
- **Fix Needed**: Implement async audit logging

### Issue #2: Rate Limiting Disabled
- **Impact**: No protection against brute force
- **Workaround**: Temporarily disabled
- **Fix Needed**: Add memory store fallback

### Issue #3: Session Middleware Disabled
- **Impact**: No session tracking
- **Workaround**: Using JWT tokens instead
- **Fix Needed**: Re-enable with timeout protection

---

## Expected Browser Behavior

### On Login Success:
- Redirect to role-based dashboard
- User info displayed in header/sidebar
- Navigation menu shows role-appropriate options

### On Creating Visitor:
- Form clears
- Success toast notification
- Invite code displayed
- Option to copy link

### On Errors:
- Clear error messages displayed
- No browser console errors (check F12)
- Appropriate HTTP status codes

---

## Testing Commands (For Reference)

### API Test Commands:
```bash
# Health Check
curl http://localhost:5001/health

# Register
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"test","password":"Test123!@#","role":"resident"}'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"resident_test","password":"SecurePass123!@#"}'

# Create Visitor (with token)
TOKEN="your-token-here"
curl -X POST http://localhost:5001/api/visitors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"+254712345678","email":"test@example.com","purpose":"Testing","dateOfVisit":"2025-10-16","time":"14:00"}'
```

### Docker Commands:
```bash
# Check container health
docker ps | grep secure-gate

# View backend logs
docker logs secure-gate-backend-prod --tail 100 -f

# Restart backend
docker restart secure-gate-backend-prod

# Check database
docker exec secure-gate-postgres-prod psql -U secure_gate_user -d secure_gate
```

---

## Notification Testing

### Check Email (nn0200774@gmail.com):
1. Login to Gmail
2. Look for emails from:
   - noreply@sandboxcd6106b9f4d54da78846462008c1678b.mailgun.org
3. Expected emails:
   - Visitor invitation email
   - OTP verification email

### Check SMS (+254748192563, +254113917509):
1. Check phone messages
2. Expected SMS from:
   - Africa's Talking (sender may vary in sandbox)
3. Expected messages:
   - Visitor invitation SMS
   - OTP verification SMS

---

## Success Criteria

✅ **System is Ready for Testing When:**
- Frontend loads without errors
- Login works in browser
- Dashboard displays correctly
- Visitor invitations can be created
- Email/SMS notifications are sent
- OTP verification works
- Check-in/check-out functions properly

---

*Start testing at: http://localhost:3001*




