# 🌐 BROWSER-BASED MANUAL TESTING GUIDE

**Project:** Secure Gate Access Control System  
**Date:** October 15, 2025  
**Frontend URL:** http://localhost:3000  
**Backend URL:** http://localhost:5000  

---

## 📋 PRE-TESTING SETUP

### **1. Start Required Services**

```bash
# Terminal 1: Start Docker containers
docker-compose -f secure-gate-access/docker-compose.prod.yml up -d postgres redis

# Terminal 2: Start Backend
cd secure-gate-access/server
NODE_ENV=development PORT=5000 npm start

# Terminal 3: Start Frontend
cd secure-gate-access/client
npm start
```

### **2. Verify Services Running**
- Backend Health: http://localhost:5000/health
- Frontend: http://localhost:3000

---

## 🧪 MANUAL TESTING CHECKLIST

### **PHASE 1: LANDING & AUTHENTICATION**

#### **1.1 Landing Page**
- [ ] Navigate to http://localhost:3000
- [ ] **Verify Elements:**
  - [ ] Application logo/branding visible
  - [ ] "Secure Gate Access Control System" title
  - [ ] Login form present
  - [ ] Registration link available
  - [ ] Clean, professional UI design
  - [ ] No console errors (F12 → Console)

#### **1.2 User Registration**
- [ ] Click "Register" or "Sign Up" link
- [ ] **Test Registration Form:**
  - [ ] All fields visible (Username, Email, Phone, Password, Role)
  - [ ] Field validation indicators (red asterisks)
  - [ ] Password strength indicator
  - [ ] Terms & Conditions checkbox
  - [ ] Privacy Policy link (opens new page)

- [ ] **Test Invalid Inputs:**
  - [ ] Submit empty form → Error: "All fields required"
  - [ ] Invalid email (test@test) → Error: "Invalid email format"
  - [ ] Weak password (123) → Error: "Password must be 8+ characters"
  - [ ] Duplicate email → Error: "Email already exists"
  - [ ] Terms not checked → Error: "Must accept terms"

- [ ] **Test Valid Registration:**
  ```
  Username: testuser_manual
  Email: manual@test.com
  Phone: +254712345678
  Password: SecurePass123!
  Role: Resident
  ✓ Accept Terms
  ```
  - [ ] Success message displayed
  - [ ] Redirect to login page
  - [ ] Confirmation email sent (if configured)

#### **1.3 User Login**
- [ ] Navigate to login page
- [ ] **Test Invalid Login:**
  - [ ] Wrong password → Error: "Invalid credentials"
  - [ ] Non-existent user → Error: "Invalid credentials"
  - [ ] Empty fields → Error: "All fields required"

- [ ] **Test Valid Login:**
  ```
  Username: testuser_manual
  Password: SecurePass123!
  ```
  - [ ] Success message
  - [ ] Redirect to dashboard
  - [ ] JWT token stored (F12 → Application → Local Storage)
  - [ ] User info displayed in header

#### **1.4 Session Management**
- [ ] Refresh page → Still logged in
- [ ] Check "Remember Me" functionality
- [ ] Logout button visible
- [ ] Click logout → Redirect to login
- [ ] Try accessing protected route → Redirect to login

---

### **PHASE 2: RESIDENT DASHBOARD**

#### **2.1 Dashboard Overview**
- [ ] **Verify Dashboard Elements:**
  - [ ] Welcome message with username
  - [ ] Navigation menu (sidebar/top)
  - [ ] Quick stats (visitors today, pending, approved)
  - [ ] Recent visitors list
  - [ ] "Add Visitor" button prominent

#### **2.2 Add New Visitor**
- [ ] Click "Add Visitor" button
- [ ] **Test Visitor Form:**
  - [ ] Fields: Name, Email, Phone, ID Number, Purpose, Visit Date/Time
  - [ ] Date picker functional
  - [ ] Time picker functional
  - [ ] Consent checkbox for data processing

- [ ] **Test Invalid Visitor Data:**
  - [ ] Past date → Error: "Cannot select past date"
  - [ ] Invalid phone → Error: "Invalid phone format"
  - [ ] Missing required fields → Validation errors

- [ ] **Test Valid Visitor:**
  ```
  Name: John Doe
  Email: john@example.com
  Phone: +254723456789
  ID: 12345678
  Purpose: Business Meeting
  Date: Tomorrow
  Time: 10:00 AM
  ✓ Consent to data processing
  ```
  - [ ] Success notification
  - [ ] Visitor appears in list
  - [ ] Unique invite code generated
  - [ ] SMS/Email sent (if configured)

#### **2.3 Manage Visitors**
- [ ] **Visitor List View:**
  - [ ] Table with columns: Name, Phone, Date, Status, Actions
  - [ ] Pagination (if >10 visitors)
  - [ ] Search functionality
  - [ ] Filter by status (Pending, Approved, Checked-in)
  - [ ] Sort by date/name

- [ ] **Individual Visitor Actions:**
  - [ ] View details → Modal with full info
  - [ ] Edit visitor → Update form
  - [ ] Cancel invitation → Confirmation dialog
  - [ ] Resend invite → Success notification
  - [ ] Copy invite code → Clipboard confirmation

---

### **PHASE 3: GUARD INTERFACE**

#### **3.1 Guard Login**
- [ ] Login with guard credentials
- [ ] **Guard Dashboard:**
  - [ ] Simplified interface
  - [ ] Check-in/Check-out focus
  - [ ] Today's expected visitors
  - [ ] Real-time updates

#### **3.2 Visitor Check-in**
- [ ] **Check-in Methods:**
  - [ ] Enter invite code manually
  - [ ] Scan QR code (if available)
  - [ ] Search by name/phone

- [ ] **Check-in Process:**
  - [ ] Enter valid code → Visitor details displayed
  - [ ] Verify ID matches
  - [ ] Click "Check In" → Success
  - [ ] Timestamp recorded
  - [ ] Status updated to "Checked In"

#### **3.3 Visitor Check-out**
- [ ] View checked-in visitors
- [ ] Select visitor
- [ ] Click "Check Out"
- [ ] Confirmation dialog
- [ ] Exit time recorded
- [ ] Duration calculated

---

### **PHASE 4: ADMIN PANEL**

#### **4.1 Admin Dashboard**
- [ ] Login with admin credentials
- [ ] **Comprehensive Dashboard:**
  - [ ] System statistics
  - [ ] User management
  - [ ] Visitor analytics
  - [ ] Gate management
  - [ ] Reports section

#### **4.2 User Management**
- [ ] **View All Users:**
  - [ ] Table with: Username, Email, Role, Status, Actions
  - [ ] Search users
  - [ ] Filter by role
  - [ ] Pagination

- [ ] **User Actions:**
  - [ ] Add new user
  - [ ] Edit user details
  - [ ] Change user role
  - [ ] Activate/Deactivate user
  - [ ] Reset password
  - [ ] Delete user (with confirmation)

#### **4.3 Reports & Analytics**
- [ ] **Available Reports:**
  - [ ] Daily visitor report
  - [ ] Weekly/Monthly summaries
  - [ ] Peak hours analysis
  - [ ] Visitor purpose breakdown
  - [ ] Guard activity logs

- [ ] **Export Options:**
  - [ ] Export as PDF
  - [ ] Export as Excel
  - [ ] Email report
  - [ ] Print preview

#### **4.4 System Settings**
- [ ] **Configuration Options:**
  - [ ] Gate settings
  - [ ] Notification templates
  - [ ] Working hours
  - [ ] Auto-approval rules
  - [ ] Data retention policies

---

### **PHASE 5: SECURITY & ERROR HANDLING**

#### **5.1 Security Features**
- [ ] **Test Rate Limiting:**
  - [ ] Rapid login attempts → "Too many requests"
  - [ ] Wait time displayed
  - [ ] Progressive delays

- [ ] **Test Authorization:**
  - [ ] Try accessing admin routes as resident → Forbidden
  - [ ] Try accessing guard routes as resident → Forbidden
  - [ ] Direct URL manipulation → Proper redirects

#### **5.2 Error Handling**
- [ ] **Test Error Scenarios:**
  - [ ] Network offline → Friendly error message
  - [ ] Server down → "Service unavailable"
  - [ ] 404 pages → Custom not found page
  - [ ] Session expired → Redirect to login
  - [ ] Invalid data → Clear validation messages

---

### **PHASE 6: RESPONSIVE DESIGN**

#### **6.1 Mobile Testing**
- [ ] **Test on Mobile (F12 → Toggle Device):**
  - [ ] iPhone SE (375px)
  - [ ] iPhone 12 (390px)
  - [ ] Samsung Galaxy (360px)

- [ ] **Verify Mobile UI:**
  - [ ] Hamburger menu works
  - [ ] Forms fit screen
  - [ ] Tables scroll horizontally
  - [ ] Buttons are tappable
  - [ ] Text is readable

#### **6.2 Tablet Testing**
- [ ] iPad (768px)
  - [ ] Layout adjusts properly
  - [ ] Sidebar behavior
  - [ ] Modal dialogs fit

#### **6.3 Desktop Testing**
- [ ] 1920x1080 resolution
  - [ ] Full layout visible
  - [ ] No horizontal scroll
  - [ ] Proper spacing

---

### **PHASE 7: PERFORMANCE & ACCESSIBILITY**

#### **7.1 Performance Testing**
- [ ] **Chrome DevTools Performance:**
  - [ ] Page load time < 3 seconds
  - [ ] No memory leaks
  - [ ] Smooth scrolling
  - [ ] Fast form submissions

#### **7.2 Accessibility Testing**
- [ ] **Keyboard Navigation:**
  - [ ] Tab through all elements
  - [ ] Enter key submits forms
  - [ ] Escape closes modals
  - [ ] Focus indicators visible

- [ ] **Screen Reader (if available):**
  - [ ] Alt text on images
  - [ ] ARIA labels present
  - [ ] Form labels associated
  - [ ] Error messages announced

---

### **PHASE 8: DATA PRIVACY FEATURES**

#### **8.1 Privacy Policy**
- [ ] Navigate to Privacy Policy
- [ ] Verify content includes:
  - [ ] Data controller info
  - [ ] Types of data collected
  - [ ] Purpose of processing
  - [ ] User rights
  - [ ] Contact information

#### **8.2 Data Subject Rights**
- [ ] **Test DSR Features:**
  - [ ] Request data export → Download personal data
  - [ ] Request data deletion → Account removal
  - [ ] Update personal info → Changes saved
  - [ ] Withdraw consent → Processing stopped

---

## 📊 TEST RESULTS SUMMARY

### **Functionality Matrix**

| Feature | Working | Partial | Failed | Notes |
|---------|---------|---------|--------|-------|
| User Registration | ☐ | ☐ | ☐ | |
| User Login | ☐ | ☐ | ☐ | |
| Visitor Management | ☐ | ☐ | ☐ | |
| Check-in/Check-out | ☐ | ☐ | ☐ | |
| Admin Panel | ☐ | ☐ | ☐ | |
| Reports | ☐ | ☐ | ☐ | |
| Mobile Responsive | ☐ | ☐ | ☐ | |
| Security Features | ☐ | ☐ | ☐ | |
| Privacy Compliance | ☐ | ☐ | ☐ | |

### **Browser Compatibility**

| Browser | Version | Status | Issues |
|---------|---------|--------|--------|
| Chrome | Latest | ☐ | |
| Firefox | Latest | ☐ | |
| Safari | Latest | ☐ | |
| Edge | Latest | ☐ | |

### **Performance Metrics**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Page Load | < 3s | ___s | ☐ |
| API Response | < 500ms | ___ms | ☐ |
| Memory Usage | < 50MB | ___MB | ☐ |

---

## 🐛 ISSUES FOUND

### **Critical Issues**
1. _________________________________
2. _________________________________

### **Major Issues**
1. _________________________________
2. _________________________________

### **Minor Issues**
1. _________________________________
2. _________________________________

### **UI/UX Improvements**
1. _________________________________
2. _________________________________

---

## ✅ FINAL ASSESSMENT

**Overall Score: ___/100**

**Deployment Ready: YES ☐ / NO ☐**

**Tester Name:** _________________  
**Date:** _________________  
**Time Spent:** _________________  

---

## 📝 NOTES

_Additional observations and recommendations:_

_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

*This guide provides comprehensive manual testing coverage for the Secure Gate Access Control System. Follow each step systematically and document all findings for development team review.*




