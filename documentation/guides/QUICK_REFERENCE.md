# 🎯 QUICK REFERENCE CARD

**Secure Gate Access Control - Testing Quick Reference**

---

## ⚡ INSTANT START (3 Commands)

```bash
./quick-start-testing.sh          # Start all services
./open-testing-tools.sh           # Open browsers  
cat TESTING_CHECKLIST.md          # Follow the guide
```

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5001 |
| MailHog | http://localhost:8025 |

---

## 🔑 Test Users (Create during testing)

```
Admin:    admin-manual@example.com    / Admin@123
Guard:    guard-manual@example.com    / Guard@123
Resident: resident-manual@example.com / Resident@123
```

---

## 🛠️ Essential Commands

```bash
# Start testing
./quick-start-testing.sh

# Interactive guide
./manual-testing-guide.sh

# Check database
./verify-test-data.sh

# Run E2E tests
npx playwright test e2e/full-system-test.spec.js --headed

# View test report
npx playwright show-report

# Check service status
pgrep -f "node.*server.js" && echo "Backend: ✓"
pgrep -f "react-scripts" && echo "Frontend: ✓"
pgrep -f mailhog && echo "MailHog: ✓"

# View logs
tail -f /tmp/backend.log
tail -f /tmp/frontend.log
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| QUICK_START_GUIDE.md | **Start here!** |
| TESTING_CHECKLIST.md | Complete test guide |
| TESTING_SUMMARY.md | All tools overview |
| FILE_INDEX.md | Find anything |
| TESTING_STATUS_REPORT.md | Session summary |

---

## 🧪 Testing Workflow

1. Start services → `./quick-start-testing.sh`
2. Open browsers → `./open-testing-tools.sh`
3. Register users (Admin, Guard, Resident)
4. Verify emails in MailHog
5. Test all features per checklist
6. Run automated tests
7. Review results

---

## 🆘 Troubleshooting

**Services won't start?**
```bash
./manual-testing-guide.sh  # Option 1: Check status
```

**Database issues?**
```bash
./verify-test-data.sh
```

**Email not working?**
- Check MailHog: `pgrep -f mailhog`
- View logs: `tail -f /tmp/backend.log`
- See: EMAIL_SETUP_GUIDE.md

---

## ✅ Success Checklist

- [ ] All services started
- [ ] 3 test users created and verified
- [ ] Guest invites sent
- [ ] Guard check-in/out tested
- [ ] Admin features verified
- [ ] All E2E tests passed
- [ ] Database state verified

---

## 🎯 Quick Actions

```bash
# Start everything now
./quick-start-testing.sh

# Open testing tools
./open-testing-tools.sh

# Get interactive help
./manual-testing-guide.sh
```

---

**Keep this card handy during testing!**

**Full documentation**: All .md files in project root

**Need help?** Run `./manual-testing-guide.sh`
