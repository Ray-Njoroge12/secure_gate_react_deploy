# Test User Credentials - Local Testing

**Environment:** Local Development  
**URL:** http://localhost:3002

---

## 🔑 TEST ACCOUNTS

### Administrator Account:
```
Email: admin@securegate.com
Password: Admin@123
Role: Administrator
Access: Full system access
```

**What to Test:**
- Admin dashboard
- User management
- Visitor management
- System settings
- Reports & analytics
- Bulk operations

---

### Guard Account:
```
Email: guard@securegate.com
Password: Guard@123
Role: Security Guard
Access: Visitor check-in/out, gate management
```

**What to Test:**
- Guard dashboard
- QR code scanner
- Manual visitor check-in
- Check-out procedures
- Today's visitor list
- Search visitors

---

### Resident Account:
```
Email: resident@securegate.com
Password: Resident@123
Role: Resident
Access: Personal visitor management
```

**What to Test:**
- Resident dashboard
- Invite visitors (single & bulk)
- View my visitors
- Edit/cancel invitations
- Visitor history
- QR code generation

---

### Visitor Account (if applicable):
```
Email: visitor@test.com
Password: Visitor@123
Role: Visitor
Access: Limited to registration & check-in confirmation
```

**What to Test:**
- Visitor registration via link
- QR code display
- OTP verification
- Check-in status
- Visit details

---

## 🧪 QUICK TEST SCENARIOS

### Scenario 1: Admin Creates User
1. Login as admin
2. Go to Users → Add User
3. Fill form, assign role
4. Save and verify

### Scenario 2: Resident Invites Visitor
1. Login as resident
2. Go to Dashboard → Invite Visitor
3. Enter visitor details
4. Generate QR/OTP
5. Verify email/SMS sent (check logs)

### Scenario 3: Guard Checks In Visitor
1. Login as guard
2. Go to Check-In
3. Scan QR or manual entry
4. Verify visitor details
5. Complete check-in
6. Verify status updated

### Scenario 4: Visitor Registration
1. Use invitation link
2. Fill registration form
3. Verify OTP
4. View QR code
5. Confirm registration

---

## 📋 DATABASE TEST DATA

If you need to verify data directly:

```bash
# Connect to PostgreSQL
docker exec -it secure-gate-postgres-prod psql -U secure_gate_user -d secure_gate

# Check users
SELECT id, email, role, is_active FROM users;

# Check visitors
SELECT id, name, email, status, check_in_time FROM visitors ORDER BY created_at DESC LIMIT 10;

# Check invitations
SELECT id, visitor_name, resident_id, visit_date, status FROM visitor_invitations ORDER BY created_at DESC LIMIT 10;

# Exit
\q
```

---

## 🔍 API TESTING (Optional)

### Test API Directly:

```bash
# Health Check
curl http://localhost:5001/health

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@securegate.com",
    "password": "Admin@123"
  }'

# Get Users (with token)
curl http://localhost:5001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ✅ POST-TEST CHECKLIST

After testing each account:
- [ ] Login works
- [ ] Dashboard loads
- [ ] Main features functional
- [ ] Icons display correctly
- [ ] No console errors
- [ ] Logout works
- [ ] Session maintained on refresh

---

**All accounts ready for testing!** Start with admin account for full system overview.
