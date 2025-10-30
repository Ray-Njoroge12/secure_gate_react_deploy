# Local Testing - Quick Reference Card

**Started:** October 29, 2025 at 6:10pm  
**Chrome opened to:** http://localhost:3002  

---

## 🚀 QUICK START

### 1. Chrome is Open
- Browser should be showing the application
- If not, manually navigate to: http://localhost:3002

### 2. First Login
```
Email: admin@securegate.com
Password: Admin@123
```

### 3. What to Test
✅ Visual appearance (icons, layout, colors)  
✅ Navigation (menu, links, routing)  
✅ Forms (inputs, buttons, validation)  
✅ User interactions (click, hover, scroll)  
✅ Responsive design (resize window)

---

## 📁 TESTING FILES

### Main Guide:
**`LOCAL_TESTING_GUIDE.md`** - Complete testing checklist (15 sections)

### Credentials:
**`TEST_CREDENTIALS.md`** - All test account logins

### Quick Ref:
**`TESTING_QUICK_REF.md`** - This file (quick access)

---

## 🎯 KEY AREAS TO CHECK

### Homepage:
- Logo displays
- Navigation menu works
- Icons render correctly
- No console errors (F12)

### Login Page:
- Email/password fields
- Eye icon (show/hide password)
- Login button works
- Forgot password link
- Sign up link

### Dashboard:
- Cards display with icons
- Charts/graphs load
- Data shows correctly
- All icons present

### Navigation:
- Sidebar icons
- Menu items clickable
- Page transitions smooth
- Back button works

---

## 🐛 WHAT TO LOOK FOR

### Visual Issues:
- ❌ Missing icons (blank spaces)
- ❌ Misaligned elements
- ❌ Overlapping text
- ❌ Wrong colors
- ❌ Broken images

### Functional Issues:
- ❌ Buttons don't click
- ❌ Forms don't submit
- ❌ Pages don't load
- ❌ Data doesn't show
- ❌ Login fails

### Console Errors:
1. Open DevTools: Press F12
2. Click "Console" tab
3. Look for red errors
4. Note any warnings

---

## ✅ TESTING SHORTCUTS

### Test All Roles:
1. **Admin:** Full access
   - Login: admin@securegate.com / Admin@123
   
2. **Guard:** Check-in/out
   - Login: guard@securegate.com / Guard@123
   
3. **Resident:** Visitor invites
   - Login: resident@securegate.com / Resident@123

### Test Responsive:
1. Open DevTools (F12)
2. Click device icon (Ctrl+Shift+M)
3. Select:
   - iPhone 12 (mobile)
   - iPad (tablet)
   - Responsive (desktop)

### Test Icons:
- Look for Lucide React icons
- Should be SVG (crisp, scalable)
- Common: Home, User, Mail, Lock, Eye, Calendar, Clock, Bell, Settings, Plus, Edit, Trash, Check, X

---

## 📊 REPORT FINDINGS

### Format:
```
Issue: [Brief description]
Page: [Which page/URL]
Severity: [Critical/High/Medium/Low]
Steps: [How to reproduce]
Screenshot: [Optional]
```

### Example:
```
Issue: Login button not clickable
Page: /login
Severity: Critical
Steps: 
  1. Go to http://localhost:3002/login
  2. Enter credentials
  3. Click login button - nothing happens
Screenshot: [attach if needed]
```

---

## 🔄 NEXT STEPS

### After Testing:
1. ✅ Document all findings
2. 🐛 Fix critical issues (if any)
3. ✅ Re-test fixes
4. 🚀 Proceed with AWS deployment

### If Everything Good:
1. ✅ Mark testing complete
2. 📝 Tell me: "Testing complete, no issues"
3. 🚀 Continue with AWS task definition update

### If Issues Found:
1. 📋 List all issues
2. 🔧 Prioritize fixes
3. 🛠️ Fix together
4. 🧪 Re-test
5. 🚀 Then deploy

---

## 💡 TIPS

### Take Your Time:
- Don't rush through testing
- Click around, explore
- Try different scenarios
- Think like an end user

### Compare to Expectations:
- Does it look professional?
- Is it easy to use?
- Are icons intuitive?
- Is navigation clear?

### Document Everything:
- Note even small issues
- Take screenshots
- List steps to reproduce
- Prioritize by severity

---

## 🆘 NEED HELP?

### Common Questions:

**Q: App won't load?**
A: Check http://localhost:5001/health - backend should be healthy

**Q: Login fails?**
A: Use exact credentials from TEST_CREDENTIALS.md

**Q: Icons missing?**
A: Check console for errors, might be import issue

**Q: Page blank?**
A: Check console, might be JavaScript error

**Q: Can't click buttons?**
A: Check if button is disabled or loading state

---

## 📞 STATUS CHECK

### Services Running:
```bash
# Check backend
curl http://localhost:5001/health

# Check frontend  
curl http://localhost:3002 | head -5

# Check database
docker exec secure-gate-postgres-prod pg_isready
```

### All should return success!

---

**Chrome is open!** Start testing at http://localhost:3002

**Login:** admin@securegate.com / Admin@123

**Guide:** See LOCAL_TESTING_GUIDE.md for detailed checklist

Let me know what you find! 🧪
