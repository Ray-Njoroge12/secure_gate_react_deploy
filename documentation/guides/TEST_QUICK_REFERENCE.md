# 🎯 Quick Test Reference Card

## 🔑 Test Credentials

### Admin
```
Email:    admin_test_2025_01_31@example.com
Password: AdminPass123!
```

### Guard
```
Email:    guard_test_2025_01_31@example.com  
Password: GuardPass123!
```

### Resident
```
Email:    resident_test_2025_01_31@example.com
Password: ResidentPass123!
```

---

## 🌐 Quick Links

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:3001/api |
| **MailHog** | http://localhost:8025 |
| **Login** | http://localhost:3000/login |
| **Register** | http://localhost:3000/register |

---

## 📋 Quick Test Commands

### Start UI Testing
```bash
./start-ui-testing.sh
```

### Check Services
```bash
# Frontend
curl http://localhost:3000

# Backend  
curl http://localhost:3001/health

# MailHog
curl http://localhost:8025
```

### Login via API (get token)
```bash
# Login as Resident
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"resident_test_2025_01_31@example.com","password":"ResidentPass123!"}'

# Save token
TOKEN="<paste_token_here>"

# Use token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/residents/visitors
```

### Check Database
```bash
cd secure-gate-access/server
PGPASSWORD=secure_gate_password psql -U secure_gate_user -d secure_gate_db -c "SELECT COUNT(*) FROM users;"
```

### Run Playwright Tests
```bash
# All tests
npx playwright test

# Specific test file
npx playwright test e2e/auth/login.spec.js

# With UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

---

## ✅ Quick Test Checklist

### Public Pages
- [ ] Login page loads
- [ ] Register page loads
- [ ] Privacy policy accessible
- [ ] Terms of service accessible

### Authentication
- [ ] Login works for Admin
- [ ] Login works for Guard  
- [ ] Login works for Resident
- [ ] Logout works
- [ ] Password reset works

### Resident Tests
- [ ] Dashboard loads
- [ ] Create guest invite
- [ ] View visitor history
- [ ] Update settings

### Guard Tests
- [ ] Dashboard loads
- [ ] View visitor list
- [ ] Check in visitor
- [ ] Check out visitor

### Admin Tests
- [ ] Dashboard loads
- [ ] View all users
- [ ] View audit logs
- [ ] Generate reports

---

## 🐛 Known Issues

1. **Login button disabled** - Some tests timeout
2. **Backend port 3001** - Tests expect 5001
3. **Terms link** - May not navigate from register
4. **Duplicate error messages** - Guest invite page

---

## 📊 Test Results

```
✅ 357 Passed (73.6%)
❌ 8 Failed (1.6%)
⏭️ 101 Skipped (20.8%)
Total: 485 tests in 7.6 minutes
```

---

## 📖 Full Guides

| Guide | Purpose |
|-------|---------|
| `FRONTEND_UI_TEST_GUIDE.md` | Complete manual testing checklist |
| `TESTING_SESSION_SUMMARY.md` | Full test results and analysis |
| `start-ui-testing.sh` | Quick start script |

---

## 🎯 Today's Goal

**Complete comprehensive manual UI testing**

1. Use `FRONTEND_UI_TEST_GUIDE.md`
2. Test all user roles
3. Document any issues
4. Report findings

---

**Happy Testing! 🧪**
