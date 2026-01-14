# 🚀 Secure Gate - Quick Start Guide

**Ready to test in 3 commands!**

---

## ⚡ Super Quick Start

```bash
# 1. Start all services
./quick-start-testing.sh

# 2. Open testing interfaces
./open-testing-tools.sh

# 3. Follow the checklist
# Open TESTING_CHECKLIST.md in your browser or editor
```

That's it! Your system is ready for testing.

---

## 🎯 What You Can Test Now

### 1. Manual UI Testing (Recommended for First Time)
- Register users (Admin, Guard, Resident)
- Create guest invites
- Check-in/out visitors
- View access logs
- Test all user workflows

**Start here**: Open http://localhost:3000 and follow `TESTING_CHECKLIST.md`

### 2. Automated E2E Testing
```bash
npx playwright test e2e/full-system-test.spec.js --headed
```

### 3. Database Verification
```bash
./verify-test-data.sh
```

---

## 📊 Testing URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Main application |
| Backend | http://localhost:5001 | API server |
| MailHog | http://localhost:8025 | Email viewer |

---

## 🔑 Test Credentials

Create these accounts during testing:

```
Admin User:
  Email: admin-manual@example.com
  Password: Admin@123

Guard User:
  Email: guard-manual@example.com
  Password: Guard@123

Resident User:
  Email: resident-manual@example.com
  Password: Resident@123
```

---

## 📋 Testing Workflow (30 minutes)

### Step 1: Start Services (2 min)
```bash
./quick-start-testing.sh
```

### Step 2: Open Browsers (1 min)
```bash
./open-testing-tools.sh
```

### Step 3: Register Users (5 min)
- Go to http://localhost:3000
- Register Admin, Guard, and Resident
- Check MailHog for verification emails
- Click verification links

### Step 4: Test Resident Flow (10 min)
- Log in as Resident
- Create single guest invite
- Create bulk invites (3 guests)
- View guest history
- Check emails in MailHog

### Step 5: Test Guard Flow (10 min)
- Log in as Guard
- View visitor list
- Check-in a visitor
- Check-out the visitor
- View access logs

### Step 6: Test Admin Flow (10 min)
- Log in as Admin
- View all visitors
- Review audit logs
- Test admin features

---

## 🐛 Troubleshooting

### Services not starting?
```bash
# Check what's running
./manual-testing-guide.sh
# Select option 1 (Check System Status)
```

### Need to verify test data?
```bash
./verify-test-data.sh
```

### Clear and start fresh?
```bash
./verify-test-data.sh
# Select option 2 (Clear test data)
```

---

## 📚 Full Documentation

For comprehensive testing instructions, see:
- **TESTING_CHECKLIST.md** - Complete step-by-step testing guide
- **TESTING_SUMMARY.md** - Overview of all testing tools and workflows
- **EMAIL_SETUP_GUIDE.md** - Email configuration details
- **RENDER_EMAIL_FIX.md** - Production deployment guide

---

## 🎓 Tips

1. **Keep MailHog open** - You'll need it to verify emails
2. **Use incognito mode** - For testing different users
3. **Follow the checklist** - Don't skip steps
4. **Document issues** - Take screenshots if something fails
5. **Test thoroughly** - Better to find bugs now than in production

---

## ✅ Success Checklist

After testing, you should have verified:
- ✅ User registration works for all roles
- ✅ Email verification works
- ✅ Login/logout functions
- ✅ Guest invites are created and emailed
- ✅ Guards can check-in/out visitors
- ✅ Access logs are recorded
- ✅ Admins can view all data
- ✅ Permissions are enforced

---

## 🚀 Next Steps

After successful local testing:
1. Run automated E2E tests
2. Check test coverage
3. Configure production email (Mailgun)
4. Deploy to Render
5. Run smoke tests on production

---

**Need help?** Check the full documentation or run `./manual-testing-guide.sh` for interactive assistance.

**Happy Testing! 🎉**
