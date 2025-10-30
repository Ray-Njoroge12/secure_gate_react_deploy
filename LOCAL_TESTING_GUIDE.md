# Local System Testing Guide - Pre-Deployment

**Date:** October 29, 2025 at 6:10pm  
**Purpose:** Test all functionalities, icons, and UI elements before AWS deployment  
**Environment:** Local Docker setup  
**Browser:** Chrome (recommended)

---

## 🔗 APPLICATION URLS

### Frontend (React Application):
```
http://localhost:3002
```

### Backend API:
```
http://localhost:5001
Health Check: http://localhost:5001/health
API Base: http://localhost:5001/api
```

### Monitoring (Optional):
```
Grafana: http://localhost:3000
Kibana: http://localhost:5601
```

---

## ✅ SYSTEM STATUS

### Running Services:
- ✅ **PostgreSQL** - Port 5432 (healthy)
- ✅ **Redis** - Port 6379 (healthy)
- ✅ **Backend API** - Port 5001 (healthy)
- ✅ **Frontend** - Port 3002 (running)
- ✅ **Monitoring Stack** - Grafana, Kibana, Prometheus

---

## 🧪 TESTING CHECKLIST

### 1. HOMEPAGE & NAVIGATION (5 minutes)

**Navigate to:** http://localhost:3002

**Check:**
- [ ] Page loads correctly
- [ ] Logo displays properly
- [ ] Navigation menu visible
- [ ] All menu items clickable
- [ ] Icons display correctly (Lucide React icons)
- [ ] Responsive design (resize browser window)
- [ ] No console errors (F12 → Console tab)

**Icons to Verify:**
- [ ] Home icon
- [ ] Login icon
- [ ] User/Profile icon
- [ ] Settings icon (if visible)

---

### 2. LOGIN PAGE (10 minutes)

**Navigate to:** http://localhost:3002/login

**Visual Elements:**
- [ ] Login form displays centered
- [ ] Email/username input field
- [ ] Password input field with eye icon (show/hide)
- [ ] "Remember Me" checkbox
- [ ] "Forgot Password" link
- [ ] Login button with proper styling
- [ ] "Don't have an account? Sign up" link
- [ ] Background/branding looks professional
- [ ] All icons rendering (mail, lock, eye, eye-off)

**Functionality:**
- [ ] Can type in email field
- [ ] Can type in password field
- [ ] Eye icon toggles password visibility
- [ ] Form validation works (try empty submit)
- [ ] Error messages display properly
- [ ] Login button has hover effect
- [ ] Links are clickable

**Test Login:**
```
Username: admin@securegate.com
Password: Admin@123
```

**After Login:**
- [ ] Redirects to appropriate dashboard
- [ ] User profile shows in navbar
- [ ] Logout option visible
- [ ] Session maintained on refresh

---

### 3. SIGNUP/REGISTRATION (10 minutes)

**Navigate to:** http://localhost:3002/signup

**Visual Elements:**
- [ ] Registration form displays
- [ ] Full name input
- [ ] Email input
- [ ] Phone number input
- [ ] Password input with strength meter
- [ ] Confirm password input
- [ ] Role selection dropdown
- [ ] Terms & conditions checkbox
- [ ] Submit button
- [ ] "Already have account? Login" link

**Icons to Check:**
- [ ] User icon (name field)
- [ ] Mail icon (email field)
- [ ] Phone icon (phone field)
- [ ] Lock icon (password field)
- [ ] Shield icon (security features)
- [ ] Check/X icons (validation indicators)

**Functionality:**
- [ ] All input fields accept data
- [ ] Password strength meter works
- [ ] Validation messages appear
- [ ] Passwords must match
- [ ] Email format validation
- [ ] Phone number formatting
- [ ] Terms checkbox required
- [ ] Role dropdown populates

---

### 4. ADMIN DASHBOARD (15 minutes)

**Login as Admin, then check:**

**Navigate to:** http://localhost:3002/admin/dashboard

**Top Navigation:**
- [ ] Dashboard link/icon
- [ ] Users management icon
- [ ] Visitors icon
- [ ] Reports icon
- [ ] Settings icon
- [ ] Notifications bell icon
- [ ] Profile dropdown icon

**Dashboard Cards:**
- [ ] Total Users card (with icon)
- [ ] Active Visitors card (with icon)
- [ ] Pending Invitations card (with icon)
- [ ] System Health card (with icon)

**Icons to Verify:**
- [ ] Users icon (group/users)
- [ ] Activity icon (trending-up)
- [ ] Calendar icon (for dates)
- [ ] Bell icon (notifications)
- [ ] Settings/Gear icon
- [ ] Download icon (export)
- [ ] Upload icon (import)
- [ ] Plus icon (add new)

**Charts & Graphs:**
- [ ] Visitor statistics chart displays
- [ ] Data loads correctly
- [ ] Chart is interactive (hover tooltips)
- [ ] Legend displays properly

**Actions:**
- [ ] Search bar works
- [ ] Filter buttons work
- [ ] Action buttons have hover effects
- [ ] Icons in buttons visible

---

### 5. USER MANAGEMENT (10 minutes)

**Navigate to:** http://localhost:3002/admin/users

**Table Elements:**
- [ ] User table loads
- [ ] Column headers visible
- [ ] User avatars/icons display
- [ ] Status badges colored correctly
- [ ] Role badges visible
- [ ] Action buttons per row

**Icons in Table:**
- [ ] Edit icon (pencil)
- [ ] Delete icon (trash)
- [ ] View icon (eye)
- [ ] More options icon (three dots)
- [ ] Active/Inactive status icons
- [ ] Role icons (admin, guard, resident, visitor)

**Actions:**
- [ ] Click edit icon
- [ ] Modal/form opens
- [ ] Click delete icon
- [ ] Confirmation dialog appears
- [ ] Search users works
- [ ] Sort columns works
- [ ] Pagination works

---

### 6. VISITOR MANAGEMENT (15 minutes)

**Navigate to:** http://localhost:3002/admin/visitors

**Visitor List:**
- [ ] Visitor cards/table display
- [ ] Visitor status badges
- [ ] Check-in/out status icons
- [ ] QR code icons
- [ ] OTP display

**Icons to Check:**
- [ ] QR code icon
- [ ] Check-in icon (log-in)
- [ ] Check-out icon (log-out)
- [ ] Calendar icon (visit date)
- [ ] Clock icon (visit time)
- [ ] User icon (visitor info)
- [ ] Phone icon (contact)
- [ ] Mail icon (email)

**Create New Visitor Invitation:**
- [ ] Click "Invite Visitor" button
- [ ] Form modal opens
- [ ] All input fields visible
- [ ] Date/time pickers work
- [ ] Submit generates QR code
- [ ] QR code displays
- [ ] OTP generates
- [ ] Email/SMS options visible

---

### 7. GUARD DASHBOARD (10 minutes)

**Login as Guard:**
```
Username: guard@securegate.com
Password: Guard@123
```

**Navigate to:** http://localhost:3002/guard/dashboard

**Check Elements:**
- [ ] Today's visitors count card
- [ ] Checked-in visitors card
- [ ] Pending visitors card
- [ ] Active gates card

**Icons:**
- [ ] Scan QR icon
- [ ] Manual entry icon
- [ ] List view icon
- [ ] Grid view icon
- [ ] Filter icon
- [ ] Refresh icon

**QR Scanner:**
- [ ] Click "Scan QR Code" button
- [ ] Camera permission prompt (if applicable)
- [ ] Scanner interface loads
- [ ] Manual entry option visible

**Visitor Check-in:**
- [ ] Search visitor
- [ ] View visitor details
- [ ] Check-in button
- [ ] Check-out button
- [ ] Status updates in real-time

---

### 8. RESIDENT DASHBOARD (10 minutes)

**Login as Resident:**
```
Username: resident@securegate.com  
Password: Resident@123
```

**Navigate to:** http://localhost:3002/resident/dashboard

**Dashboard Elements:**
- [ ] My visitors card
- [ ] Pending invitations card
- [ ] Visitor history card
- [ ] Quick actions card

**Icons:**
- [ ] Home icon
- [ ] Add visitor icon (user-plus)
- [ ] Calendar icon
- [ ] History icon (clock)
- [ ] Settings icon

**Create Visitor Invitation:**
- [ ] Click "Invite Visitor"
- [ ] Single visitor form
- [ ] Bulk invite option
- [ ] Date/time selection
- [ ] Purpose of visit
- [ ] Generate QR/OTP
- [ ] Send invitation (email/SMS)

**My Visitors List:**
- [ ] Upcoming visitors
- [ ] Past visitors
- [ ] Status indicators
- [ ] Action buttons (edit, cancel, resend)

---

### 9. FORMS & INPUTS (10 minutes)

**Test Various Form Elements:**

**Input Fields:**
- [ ] Text inputs have proper borders
- [ ] Focus state highlights field
- [ ] Error state shows red border
- [ ] Success state shows green
- [ ] Placeholder text visible
- [ ] Icons inside inputs align correctly

**Buttons:**
- [ ] Primary buttons (blue background)
- [ ] Secondary buttons (outlined)
- [ ] Danger buttons (red)
- [ ] Success buttons (green)
- [ ] Disabled state grayed out
- [ ] Loading state shows spinner
- [ ] Hover effects work

**Dropdowns/Selects:**
- [ ] Select dropdown opens
- [ ] Options display
- [ ] Selected value shows
- [ ] Chevron icon rotates
- [ ] Search in select works (if applicable)

**Checkboxes:**
- [ ] Checkbox displays
- [ ] Check icon appears when clicked
- [ ] Unchecked state clear
- [ ] Disabled state grayed

**Date Pickers:**
- [ ] Calendar icon present
- [ ] Calendar popup opens
- [ ] Can select date
- [ ] Date displays in field
- [ ] Time picker (if applicable)

---

### 10. NOTIFICATIONS & ALERTS (5 minutes)

**Toast Notifications:**
- [ ] Success toast (green with check icon)
- [ ] Error toast (red with X icon)
- [ ] Warning toast (yellow with alert icon)
- [ ] Info toast (blue with info icon)
- [ ] Auto-dismiss works
- [ ] Close button works

**Modal Dialogs:**
- [ ] Modal opens centered
- [ ] Backdrop dims background
- [ ] Close icon (X) visible
- [ ] Modal title shows
- [ ] Action buttons at bottom
- [ ] Can close by clicking outside

**Confirmation Dialogs:**
- [ ] Warning icon displays
- [ ] Question asks clearly
- [ ] Yes/No or Confirm/Cancel buttons
- [ ] Proper colors (danger actions in red)

---

### 11. RESPONSIVE DESIGN (10 minutes)

**Desktop View (1920x1080):**
- [ ] All elements properly spaced
- [ ] Sidebars visible
- [ ] Tables show all columns
- [ ] No horizontal scroll

**Tablet View (768px):**
- [ ] Sidebar collapses/hamburger menu
- [ ] Cards stack vertically
- [ ] Table responsive (horizontal scroll or card view)
- [ ] Touch targets large enough

**Mobile View (375px):**
- [ ] Hamburger menu icon
- [ ] Navigation drawer works
- [ ] Forms single column
- [ ] Buttons full width
- [ ] Icons scale appropriately
- [ ] Text readable

**Test:**
1. Open DevTools (F12)
2. Click device toolbar icon
3. Select different devices
4. Check layouts

---

### 12. ICONS VERIFICATION (5 minutes)

**Lucide React Icons Used:**
```
Common Icons:
- Home, User, Users, UserPlus
- Mail, Phone, Lock, Unlock
- Eye, EyeOff
- Check, X, AlertCircle, AlertTriangle
- Calendar, Clock
- Search, Filter, Settings
- Bell, BellOff
- Download, Upload
- Edit (Pencil), Trash (Trash2)
- Plus, Minus
- ChevronDown, ChevronRight, ChevronLeft, ChevronUp
- Menu (hamburger), MoreVertical (three dots)
- LogIn, LogOut
- Shield, ShieldCheck
- QrCode
- TrendingUp, Activity
- FileText, Clipboard
```

**How to Check:**
1. Icons should be SVG (crisp at any size)
2. Icons should have consistent sizing
3. Icons should match their context
4. No broken icon images
5. Icons should have proper color (inherit from parent)

**If Icon Missing:**
- Broken image shows OR
- Text placeholder shows OR
- Console error in DevTools

---

### 13. ACCESSIBILITY (5 minutes)

**Keyboard Navigation:**
- [ ] Tab through forms works
- [ ] Focus indicator visible
- [ ] Enter submits forms
- [ ] Escape closes modals
- [ ] Arrow keys in dropdowns

**Screen Reader (Optional):**
- [ ] Alt text on images
- [ ] ARIA labels on buttons
- [ ] Form labels associated
- [ ] Error announcements

**Color Contrast:**
- [ ] Text readable on backgrounds
- [ ] Links distinguishable
- [ ] Disabled states clear

---

### 14. PERFORMANCE (5 minutes)

**Page Load:**
- [ ] Frontend loads in < 3 seconds
- [ ] No flash of unstyled content
- [ ] Smooth transitions
- [ ] Lazy loading works (scroll down)

**API Responses:**
- [ ] Dashboard data loads quickly
- [ ] No long wait times
- [ ] Loading indicators show during fetch
- [ ] Error handling if API slow/fails

**Browser Console:**
- [ ] No JavaScript errors
- [ ] No 404 errors (missing assets)
- [ ] No CORS errors
- [ ] Warnings acceptable (deprecations)

---

### 15. DATA OPERATIONS (10 minutes)

**CRUD Operations:**

**Create:**
- [ ] Add new visitor
- [ ] Form validation works
- [ ] Success message shows
- [ ] New item appears in list

**Read:**
- [ ] View visitor details
- [ ] All data displays correctly
- [ ] Images/QR codes load

**Update:**
- [ ] Edit visitor
- [ ] Changes save
- [ ] Success confirmation
- [ ] List updates

**Delete:**
- [ ] Delete visitor
- [ ] Confirmation required
- [ ] Item removed from list
- [ ] Success message

---

## 🐛 COMMON ISSUES TO CHECK

### Visual Issues:
- [ ] Missing icons → Check Lucide React imports
- [ ] Misaligned elements → Check CSS/Tailwind classes
- [ ] Overlapping text → Check responsive breakpoints
- [ ] Wrong colors → Check color scheme consistency

### Functional Issues:
- [ ] Form not submitting → Check API endpoint
- [ ] Login fails → Check credentials/database
- [ ] Data not loading → Check API connection
- [ ] Redirects not working → Check React Router

### Browser Specific:
- [ ] Test in Chrome
- [ ] Test in Firefox (if time permits)
- [ ] Test in Safari (if on Mac)

---

## 📊 TESTING RESULTS TEMPLATE

### Overall Assessment:
```
[ ] Excellent - No issues found
[ ] Good - Minor cosmetic issues
[ ] Fair - Some functional issues
[ ] Poor - Major issues blocking usage
```

### Issues Found:
```
1. [Issue Description]
   - Page: [URL]
   - Severity: [Critical/High/Medium/Low]
   - Screenshot: [If applicable]
   
2. [Issue Description]
   ...
```

### Recommendations:
```
- Fix before AWS deployment: [Critical issues]
- Fix after deployment: [Minor issues]
- Future enhancements: [Nice-to-have]
```

---

## 🚀 AFTER TESTING

### If Everything Looks Good:
1. ✅ Document test completion
2. ✅ Proceed with AWS task definition update
3. ✅ Continue with deployment

### If Issues Found:
1. 🐛 Document all issues
2. 🔧 Prioritize fixes
3. 🧪 Re-test after fixes
4. ✅ Then proceed with deployment

---

**Ready to Test!** Open Chrome and navigate to: http://localhost:3002

Let me know what you find! 🧪
