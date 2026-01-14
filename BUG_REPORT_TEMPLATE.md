# Bug Report Template

Use this template to document issues found during testing.

---

## Bug #1: [Short Description]

**Severity:** [ ] Critical  [ ] High  [ ] Medium  [ ] Low

**Type:** [ ] Functionality  [ ] UI/UX  [ ] Performance  [ ] Accessibility  [ ] Security

**Status:** [ ] New  [ ] In Progress  [ ] Fixed  [ ] Verified  [ ] Closed

### Environment
- Browser: 
- Viewport: 
- User Role: [ ] Admin  [ ] Guard  [ ] Resident  [ ] Guest  [ ] Public

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior


### Actual Behavior


### Screenshots/Videos
<!-- Attach or link screenshots/videos here -->

### Console Errors
```
<!-- Paste any console errors from browser DevTools (F12) -->
```

### Network Errors
```
<!-- Paste any network errors from browser DevTools Network tab -->
```

### Additional Context


### Possible Fix (Optional)


---

## Bug #2: [Short Description]

**Severity:** [ ] Critical  [ ] High  [ ] Medium  [ ] Low

**Type:** [ ] Functionality  [ ] UI/UX  [ ] Performance  [ ] Accessibility  [ ] Security

**Status:** [ ] New  [ ] In Progress  [ ] Fixed  [ ] Verified  [ ] Closed

### Environment
- Browser: 
- Viewport: 
- User Role: [ ] Admin  [ ] Guard  [ ] Resident  [ ] Guest  [ ] Public

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior


### Actual Behavior


### Screenshots/Videos


### Console Errors
```
```

### Network Errors
```
```

### Additional Context


### Possible Fix (Optional)


---

## Example Bug Report

**Severity:** [X] High

**Type:** [X] Functionality

**Status:** [X] New

### Environment
- Browser: Chrome 120
- Viewport: 1440x900 (Desktop)
- User Role: [X] Public

### Steps to Reproduce
1. Navigate to http://localhost:3000/login
2. Enter valid email: test@example.com
3. Enter valid password: Test123!
4. Observe login button

### Expected Behavior
Login button should be enabled and clickable after entering valid credentials.

### Actual Behavior
Login button remains disabled (grayed out) even with valid credentials. Cannot submit form.

### Screenshots/Videos
![Login Button Disabled](screenshots/login-button-disabled.png)

### Console Errors
```
No console errors visible
```

### Network Errors
```
No network requests made (form not submitting)
```

### Additional Context
This affects multiple pages with forms:
- Login page
- Password reset page
- Registration page (sometimes)

Automated Playwright tests also timeout on these pages waiting for button to enable.

### Possible Fix (Optional)
Check button disabled logic in form validation. May be related to form state management or validation trigger timing.

Likely files:
- `secure-gate-access/client/src/components/.../LoginForm.jsx`
- `secure-gate-access/client/src/components/.../Button.jsx`

---

## Severity Guidelines

### Critical 🔴
- System completely broken
- Security vulnerabilities
- Data loss possible
- No workaround available

### High 🟠  
- Major feature not working
- Significant impact on user experience
- Workaround exists but difficult

### Medium 🟡
- Feature partially working
- Minor impact on user experience
- Easy workaround available

### Low 🟢
- Cosmetic issues
- Typos or formatting
- Minor inconsistencies
- Nice-to-have improvements

---

## Quick Issue Tracking

| # | Description | Severity | Status | Assigned To |
|---|-------------|----------|--------|-------------|
| 1 | Login button disabled | High | New | - |
| 2 | Terms link broken | Medium | New | - |
| 3 | Duplicate error messages | Low | New | - |
| 4 | | | | |
| 5 | | | | |

---

## Testing Notes

### Session 1: [Date]
**Tester:**  
**Duration:**  
**Tests Completed:**  
**Bugs Found:**  
**Notes:**  


### Session 2: [Date]
**Tester:**  
**Duration:**  
**Tests Completed:**  
**Bugs Found:**  
**Notes:**  


---

## Tips for Good Bug Reports

1. ✅ **Be specific** - Include exact steps and error messages
2. ✅ **Be consistent** - Use the same format for all reports
3. ✅ **Be thorough** - Include all relevant information
4. ✅ **Attach evidence** - Screenshots, videos, logs
5. ✅ **Check first** - Make sure it's not already reported
6. ✅ **Categorize** - Use severity and type labels correctly
7. ✅ **Follow up** - Update status as bug gets fixed
8. ✅ **Verify fixes** - Re-test after bug is marked as fixed

---

## Where to Save Bug Reports

1. **During testing**: Keep notes in this file
2. **For tracking**: Create GitHub Issues (if using GitHub)
3. **For collaboration**: Share with team in project management tool
4. **For documentation**: Archive in project wiki or docs folder

---

**Template Version:** 1.0  
**Last Updated:** January 31, 2025
