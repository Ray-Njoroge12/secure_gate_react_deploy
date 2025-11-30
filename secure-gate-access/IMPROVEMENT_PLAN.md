# SecureGate Access Control System
## Comprehensive Improvement Plan

**Document Version:** 1.0  
**Created:** November 26, 2025  
**Status:** Planning Phase

---

## Executive Summary

This document provides a detailed analysis and implementation plan for improving the SecureGate Access Control System. Improvements are categorized by:
1. **User Role-Specific Enhancements** (Resident, Guard, Admin)
2. **System-Wide Functional Improvements**
3. **Technical Infrastructure Upgrades**
4. **UI/UX Enhancements**
5. **Security Hardening**

Each improvement includes priority level, estimated effort, implementation approach, and file locations.

---

## Part 1: Resident User Improvements

### 1.1 Recurring/Favorite Visitors Feature

**Priority:** HIGH  
**Effort:** 3-5 days  
**Status:** Not Implemented

**Current State:**
- Residents must re-enter visitor details each time
- No saved visitor profiles
- No categorization of visitors

**Proposed Improvements:**

```
┌─────────────────────────────────────────────────────────────┐
│                    FAVORITE VISITORS                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 👨 John Doe │ │ 👩 Jane Doe │ │ + Add New   │            │
│ │ Family      │ │ Contractor  │ │             │            │
│ │ ★★★★★       │ │ ★★★★☆       │ │             │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                              │
│ Quick Invite: [Select Visitor] → [Choose Date] → [Send]    │
└─────────────────────────────────────────────────────────────┘
```

**Database Changes:**
```sql
-- New table: favorite_visitors
CREATE TABLE favorite_visitors (
  id SERIAL PRIMARY KEY,
  resident_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  category VARCHAR(50) DEFAULT 'general', -- family, contractor, delivery, friend
  notes TEXT,
  visit_count INTEGER DEFAULT 0,
  last_visit_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_favorite_visitors_resident ON favorite_visitors(resident_id);
```

**Backend Implementation:**
- Location: `/server/src/services/favoriteVisitorService.js` (new)
- Location: `/server/src/routes/residentRoutes.js` (update)

```javascript
// New endpoints
POST   /api/residents/favorites           // Add favorite visitor
GET    /api/residents/favorites           // List favorites
PUT    /api/residents/favorites/:id       // Update favorite
DELETE /api/residents/favorites/:id       // Remove favorite
POST   /api/residents/favorites/:id/invite // Quick invite from favorite
```

**Frontend Implementation:**
- Location: `/client/src/pages/resident/FavoriteVisitors.jsx` (new)
- Location: `/client/src/components/resident/FavoriteVisitorCard.jsx` (new)
- Location: `/client/src/pages/resident/ResidentDashboard.jsx` (update - add section)

**User Flow:**
1. Resident navigates to "Favorite Visitors" section
2. Can add new favorites with name, phone, email, category
3. One-click invite using saved details
4. System auto-increments visit count

---

### 1.2 Visitor Pre-Approval Rules

**Priority:** MEDIUM  
**Effort:** 4-6 days  
**Status:** Not Implemented

**Current State:**
- Each visitor requires individual approval
- No automatic approval based on rules
- Walk-ins always require resident notification

**Proposed Improvements:**

```
┌─────────────────────────────────────────────────────────────┐
│              PRE-APPROVAL RULES CONFIGURATION               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ Auto-approve family members                              │
│    └─ [John Doe, Jane Doe] are auto-approved 24/7          │
│                                                              │
│ ✅ Auto-approve contractors during business hours           │
│    └─ [9:00 AM - 5:00 PM] Mon-Fri                          │
│                                                              │
│ ❌ Delivery personnel (require approval)                    │
│                                                              │
│ ⚙️ Max auto-approvals per day: [10]                        │
│                                                              │
│ [Save Rules] [Reset to Default]                             │
└─────────────────────────────────────────────────────────────┘
```

**Database Changes:**
```sql
-- New table: approval_rules
CREATE TABLE approval_rules (
  id SERIAL PRIMARY KEY,
  resident_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- 'visitor', 'category', 'time_based'
  conditions JSONB NOT NULL, -- Flexible rule conditions
  auto_approve BOOLEAN DEFAULT FALSE,
  time_restrictions JSONB, -- {start_time, end_time, days_of_week}
  max_uses_per_day INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example conditions JSON:
-- { "visitor_ids": [1,2,3], "categories": ["family"], "phone_prefix": "+254" }
```

**Backend Implementation:**
```javascript
// New endpoints
POST   /api/residents/approval-rules       // Create rule
GET    /api/residents/approval-rules       // List rules
PUT    /api/residents/approval-rules/:id   // Update rule
DELETE /api/residents/approval-rules/:id   // Delete rule

// Modify visitor check-in flow to check rules
// Location: /server/src/services/visitorService.js
async function checkAutoApprovalRules(visitorData, residentId) {
  // 1. Fetch active rules for resident
  // 2. Match visitor against rules
  // 3. Check time restrictions
  // 4. Check daily usage limits
  // 5. Return approval decision
}
```

---

### 1.3 Visitor History Export & Analytics

**Priority:** MEDIUM  
**Effort:** 2-3 days  
**Status:** Partial (history exists, export missing)

**Current State:**
- Visitor history is viewable
- No export functionality
- Limited analytics

**Proposed Improvements:**

**Export Options:**
- CSV export with date range filter
- PDF report generation
- Email scheduled reports

**Analytics Dashboard:**
```
┌─────────────────────────────────────────────────────────────┐
│                    VISITOR ANALYTICS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ This Month: 47 visitors   Last Month: 52 visitors (-10%)   │
│                                                              │
│ Peak Days: [Bar Chart]                                       │
│ Mon ████████ 12                                              │
│ Tue █████ 8                                                  │
│ Wed ███████ 10                                               │
│                                                              │
│ By Category:                                                 │
│ 🏠 Family: 45%   🔧 Contractor: 30%   📦 Delivery: 25%      │
│                                                              │
│ [Export CSV] [Export PDF] [Schedule Report]                 │
└─────────────────────────────────────────────────────────────┘
```

**Backend Implementation:**
```javascript
// New endpoints
GET  /api/residents/visitors/export?format=csv&from=&to=
GET  /api/residents/visitors/analytics?period=month
POST /api/residents/visitors/schedule-report
```

---

### 1.4 Push Notifications for Residents

**Priority:** HIGH  
**Effort:** 3-4 days  
**Status:** Partial (SSE exists, push not implemented)

**Current State:**
- Server-Sent Events for guards
- No push notifications for residents
- No mobile notification support

**Proposed Improvements:**

**Notification Types:**
1. Visitor arrival notification
2. Walk-in approval request
3. Visitor check-out confirmation
4. Security alerts

**Implementation Approach:**
```javascript
// Use existing websocketService.js
// Add resident notification channels

// Location: /server/src/services/notificationService.js (enhance)
class ResidentNotificationService {
  async notifyVisitorArrival(residentId, visitorData) {
    // 1. Send WebSocket event
    websocketService.emitToUser(residentId, 'visitor.arrived', visitorData);
    
    // 2. Send push notification (if enabled)
    await this.sendPushNotification(residentId, {
      title: 'Visitor Arrived',
      body: `${visitorData.name} has arrived at the gate`,
      data: { visitorId: visitorData.id }
    });
    
    // 3. Send SMS (if enabled)
    if (await this.getSmsPreference(residentId)) {
      await smsService.send(residentId, `${visitorData.name} has arrived`);
    }
  }
}
```

---

## Part 2: Guard User Improvements

### 2.1 Enhanced QR Scanning

**Priority:** HIGH  
**Effort:** 2-3 days  
**Status:** Basic implementation exists

**Current State:**
- Basic QR scanning
- No offline support
- No batch scanning

**Proposed Improvements:**

```
┌─────────────────────────────────────────────────────────────┐
│                    ENHANCED QR SCANNER                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────┐                    │
│  │                                     │                    │
│  │          [Camera Feed]              │                    │
│  │                                     │                    │
│  │    Position QR code in frame        │                    │
│  │                                     │                    │
│  └─────────────────────────────────────┘                    │
│                                                              │
│  📷 Auto-focus: ON   🔦 Flash: OFF   📶 Offline: Ready      │
│                                                              │
│  Recent Scans:                                               │
│  ✅ John Doe - 2:34 PM                                       │
│  ✅ Jane Smith - 2:28 PM                                     │
│  ❌ Invalid QR - 2:15 PM                                     │
│                                                              │
│  [📱 Switch Camera] [🔄 Batch Mode] [📋 Manual Entry]       │
└─────────────────────────────────────────────────────────────┘
```

**Features to Add:**
1. **Offline scanning queue** - Store scans locally when offline
2. **Batch mode** - Scan multiple visitors quickly
3. **Photo capture** - Capture visitor photo with scan
4. **Audio feedback** - Beep sounds for success/failure

**Frontend Implementation:**
```jsx
// Location: /client/src/pages/guard/ScanQR.jsx (enhance)

// Add offline queue
const [offlineQueue, setOfflineQueue] = useState([]);
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    syncOfflineQueue();
  };
  
  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}, []);

const syncOfflineQueue = async () => {
  for (const scan of offlineQueue) {
    await processScan(scan);
  }
  setOfflineQueue([]);
};
```

---

### 2.2 Incident Reporting Enhancement

**Priority:** MEDIUM  
**Effort:** 3-4 days  
**Status:** Basic implementation exists

**Current State:**
- Text-based incident reports
- No photo attachments
- Limited categorization

**Proposed Improvements:**

```
┌─────────────────────────────────────────────────────────────┐
│                  INCIDENT REPORT FORM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Incident Type: [Dropdown]                                    │
│ ├─ Unauthorized Access Attempt                               │
│ ├─ Suspicious Behavior                                       │
│ ├─ Property Damage                                           │
│ ├─ Medical Emergency                                         │
│ └─ Other                                                     │
│                                                              │
│ Priority: [🔴 High] [🟡 Medium] [🟢 Low]                    │
│                                                              │
│ Location: [Gate 1 ▼] or [📍 Current Location]               │
│                                                              │
│ Description:                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Attachments:                                                 │
│ [📷 Take Photo] [📎 Upload File] [🎤 Voice Note]            │
│                                                              │
│ Related Visitor: [Search...] (optional)                      │
│                                                              │
│ [Submit Report] [Save as Draft]                              │
└─────────────────────────────────────────────────────────────┘
```

**Database Changes:**
```sql
-- Enhance incidents table
ALTER TABLE incidents ADD COLUMN incident_type VARCHAR(50);
ALTER TABLE incidents ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE incidents ADD COLUMN location_id INTEGER REFERENCES gates(id);
ALTER TABLE incidents ADD COLUMN related_visitor_id INTEGER REFERENCES visitors(id);
ALTER TABLE incidents ADD COLUMN attachments JSONB DEFAULT '[]';
ALTER TABLE incidents ADD COLUMN voice_note_url VARCHAR(500);
ALTER TABLE incidents ADD COLUMN status VARCHAR(50) DEFAULT 'open';
-- status: open, investigating, resolved, closed
```

**File Upload Service:**
```javascript
// Location: /server/src/services/uploadService.js (new)
import multer from 'multer';
import sharp from 'sharp';

const storage = multer.diskStorage({
  destination: './uploads/incidents/',
  filename: (req, file, cb) => {
    cb(null, `incident-${Date.now()}-${file.originalname}`);
  }
});

export const incidentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'audio/webm', 'audio/mp4'];
    cb(null, allowed.includes(file.mimetype));
  }
});
```

---

### 2.3 Shift Handover System

**Priority:** MEDIUM  
**Effort:** 4-5 days  
**Status:** Not Implemented

**Current State:**
- No formal shift handover process
- Information lost between shifts
- No pending task transfer

**Proposed Improvements:**

```
┌─────────────────────────────────────────────────────────────┐
│                    SHIFT HANDOVER                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Outgoing Guard: John Smith (8:00 AM - 4:00 PM)              │
│ Incoming Guard: Jane Doe (4:00 PM - 12:00 AM)               │
│                                                              │
│ ───────────────────────────────────────────────────────────  │
│                                                              │
│ PENDING ACTIONS (3):                                         │
│ ⚠️ Suspicious vehicle reported - white sedan, no plates     │
│ 📋 Delivery expected: Amazon, 5:00 PM                        │
│ 🔧 Gate 2 sensor intermittent                               │
│                                                              │
│ TODAY'S SUMMARY:                                             │
│ • 47 check-ins, 42 check-outs                               │
│ • 2 walk-in approvals pending                                │
│ • 1 incident report filed                                    │
│                                                              │
│ NOTES FOR INCOMING GUARD:                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Resident in Unit 12B expecting a guest after 6 PM.     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [✅ Acknowledge Handover] [🔄 Request More Info]            │
└─────────────────────────────────────────────────────────────┘
```

**Database Changes:**
```sql
-- New table: shift_handovers
CREATE TABLE shift_handovers (
  id SERIAL PRIMARY KEY,
  outgoing_guard_id INTEGER REFERENCES users(id),
  incoming_guard_id INTEGER REFERENCES users(id),
  shift_date DATE NOT NULL,
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,
  pending_actions JSONB DEFAULT '[]',
  notes TEXT,
  statistics JSONB, -- {check_ins, check_outs, incidents}
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2.4 Vehicle Logging (Pre-LPR)

**Priority:** LOW  
**Effort:** 2-3 days  
**Status:** Not Implemented

**Manual Vehicle Logging Before LPR Integration:**

```
┌─────────────────────────────────────────────────────────────┐
│                    VEHICLE LOGGING                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ License Plate: [___________] [🔍 Search]                    │
│                                                              │
│ Vehicle Type:                                                │
│ [🚗 Sedan] [🚙 SUV] [🚚 Truck] [🏍️ Motorcycle] [Other]      │
│                                                              │
│ Color: [White ▼]                                             │
│                                                              │
│ Associated Visitor: [Search or Add]                          │
│                                                              │
│ Recent Vehicle Entries:                                      │
│ ┌──────────────┬───────────┬───────────┬──────────────────┐ │
│ │ Plate        │ Type      │ Time      │ Visitor          │ │
│ ├──────────────┼───────────┼───────────┼──────────────────┤ │
│ │ KBZ 123A     │ Sedan     │ 2:34 PM   │ John Doe         │ │
│ │ KCY 456B     │ SUV       │ 2:15 PM   │ Delivery         │ │
│ └──────────────┴───────────┴───────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 3: Admin User Improvements

### 3.1 Enhanced Analytics Dashboard

**Priority:** HIGH  
**Effort:** 5-7 days  
**Status:** Basic implementation exists

**Current State:**
- Basic stats cards (active invites, check-ins)
- Audit logs table
- Limited visualization

**Proposed Improvements:**

```
┌─────────────────────────────────────────────────────────────┐
│                 ADMIN ANALYTICS DASHBOARD                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Quick Stats (Real-time)                                      │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│ │ 47     │ │ 12     │ │ 156    │ │ 98.5%  │ │ 3      │     │
│ │On-site │ │Pending │ │Today   │ │Uptime  │ │Alerts  │     │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘     │
│                                                              │
│ ───────────────────────────────────────────────────────────  │
│                                                              │
│ Visitor Trends (Last 30 Days)      │ Peak Hours             │
│ ┌─────────────────────────────┐    │ ┌──────────────────┐  │
│ │ [Line Chart]                │    │ │ [Heat Map]       │  │
│ │                             │    │ │ 9AM: ████        │  │
│ │                             │    │ │ 12PM: ██████     │  │
│ └─────────────────────────────┘    │ │ 3PM: █████       │  │
│                                     │ └──────────────────┘  │
│                                                              │
│ System Health                       │ Security Events        │
│ ┌─────────────────────────────┐    │ ┌──────────────────┐  │
│ │ CPU: ███░░ 60%              │    │ │ Failed logins: 5 │  │
│ │ Memory: ████░ 80%           │    │ │ Blocked IPs: 2   │  │
│ │ DB: ██░░░ 40%               │    │ │ Rate limits: 12  │  │
│ └─────────────────────────────┘    │ └──────────────────┘  │
│                                                              │
│ [📊 Export Report] [📧 Schedule Daily Report]               │
└─────────────────────────────────────────────────────────────┘
```

**Backend Implementation:**
```javascript
// Location: /server/src/routes/adminAnalyticsRoutes.js (enhance)

// New analytics endpoints
GET /api/admin/analytics/visitor-trends?period=30d
GET /api/admin/analytics/peak-hours
GET /api/admin/analytics/system-health
GET /api/admin/analytics/security-events
GET /api/admin/analytics/export?format=pdf&period=month
```

**Visualization Library:**
```javascript
// Location: /client/src/components/admin/AnalyticsCharts.jsx (new)
import { Line, Bar, Heatmap, Gauge } from 'recharts';

// Components:
// - VisitorTrendChart
// - PeakHoursHeatmap
// - SystemHealthGauges
// - SecurityEventsTimeline
```

---

### 3.2 User Management Enhancement

**Priority:** HIGH  
**Effort:** 3-4 days  
**Status:** Basic implementation exists

**Current State:**
- CRUD for users
- No bulk operations
- Limited role management

**Proposed Improvements:**

**Bulk Operations:**
```
┌─────────────────────────────────────────────────────────────┐
│                   USER MANAGEMENT                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [+ Add User] [📥 Import CSV] [📤 Export] [🗑️ Bulk Delete]   │
│                                                              │
│ Filters: [All Roles ▼] [Active/Inactive ▼] [Search...]     │
│                                                              │
│ ☐ Select All                                                │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ☐ John Doe      │ resident │ john@email.com │ Active    ││
│ │ ☐ Jane Smith    │ guard    │ jane@email.com │ Active    ││
│ │ ☐ Admin User    │ admin    │ admin@mail.com │ Active    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ With Selected: [Change Role] [Deactivate] [Reset Password]  │
│                                                              │
│ Pagination: [< 1 2 3 4 5 >]  Showing 1-10 of 156            │
└─────────────────────────────────────────────────────────────┘
```

**Backend Implementation:**
```javascript
// Location: /server/src/routes/adminRoutes.js (enhance)

// Bulk operations
POST /api/admin/users/bulk-create    // From CSV
POST /api/admin/users/bulk-update    // Change roles, etc.
POST /api/admin/users/bulk-delete    // Soft delete
GET  /api/admin/users/export?format=csv
```

---

### 3.3 Gate/Entry Point Management

**Priority:** MEDIUM  
**Effort:** 3-4 days  
**Status:** Not Implemented

**Current State:**
- No gate configuration
- Single entry point assumed
- No gate-specific analytics

**Proposed Improvements:**

```
┌─────────────────────────────────────────────────────────────┐
│                   GATE MANAGEMENT                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [+ Add Gate]                                                 │
│                                                              │
│ ┌────────────────────┐  ┌────────────────────┐              │
│ │ 🚪 Main Gate       │  │ 🚪 Service Gate    │              │
│ │ Status: ✅ Online   │  │ Status: ⚠️ Warning │              │
│ │ Guard: John Doe    │  │ Guard: (Unmanned)  │              │
│ │ Today: 124 entries │  │ Today: 45 entries  │              │
│ │                    │  │                    │              │
│ │ [Configure] [View] │  │ [Configure] [View] │              │
│ └────────────────────┘  └────────────────────┘              │
│                                                              │
│ Gate Configuration:                                          │
│ • Operating Hours: 6:00 AM - 10:00 PM                       │
│ • Auto-lock after hours: ✅ Enabled                          │
│ • Emergency override: 🔐 Admin Only                          │
│ • Camera integration: 📷 Connected                           │
└─────────────────────────────────────────────────────────────┘
```

**Database Changes:**
```sql
-- New table: gates
CREATE TABLE gates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  type VARCHAR(50) DEFAULT 'entry', -- entry, exit, service
  status VARCHAR(50) DEFAULT 'online', -- online, offline, maintenance
  operating_hours JSONB, -- {start: "06:00", end: "22:00", days: [1,2,3,4,5,6,0]}
  configuration JSONB, -- {auto_lock, emergency_override, camera_id}
  assigned_guard_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Link visitors to gates
ALTER TABLE visitors ADD COLUMN entry_gate_id INTEGER REFERENCES gates(id);
ALTER TABLE visitors ADD COLUMN exit_gate_id INTEGER REFERENCES gates(id);
```

---

### 3.4 Scheduled Reports

**Priority:** MEDIUM  
**Effort:** 2-3 days  
**Status:** Not Implemented

**Proposed Feature:**
```
┌─────────────────────────────────────────────────────────────┐
│                 SCHEDULED REPORTS                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [+ Create Schedule]                                          │
│                                                              │
│ Active Schedules:                                            │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 📊 Daily Visitor Summary                                 ││
│ │    Frequency: Daily at 6:00 PM                           ││
│ │    Recipients: admin@example.com, manager@example.com    ││
│ │    Format: PDF                                           ││
│ │    [Edit] [Pause] [Delete]                               ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ 📈 Weekly Security Report                                ││
│ │    Frequency: Every Monday at 9:00 AM                    ││
│ │    Recipients: security@example.com                      ││
│ │    Format: PDF + CSV                                     ││
│ │    [Edit] [Pause] [Delete]                               ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Backend Implementation:**
```javascript
// Location: /server/src/services/scheduledReportService.js (new)
// Use node-cron for scheduling

import cron from 'node-cron';
import { generatePDFReport, generateCSVReport } from './reportService.js';
import emailService from './emailService.js';

class ScheduledReportService {
  constructor() {
    this.jobs = new Map();
  }
  
  scheduleReport(config) {
    const job = cron.schedule(config.cronExpression, async () => {
      const report = await this.generateReport(config.reportType, config.options);
      await this.sendReport(report, config.recipients, config.format);
    });
    
    this.jobs.set(config.id, job);
  }
}
```

---

## Part 4: System-Wide Improvements

### 4.1 Dark Mode Implementation

**Priority:** HIGH  
**Effort:** 2-3 days  
**Status:** Not Implemented

**Implementation Approach:**

**CSS Variables for Dark Theme:**
```css
/* Location: /client/src/styles/design-system.css (enhance) */

/* Dark theme variables */
[data-theme="dark"] {
  --color-bg-primary: #111827;      /* gray-900 */
  --color-bg-secondary: #1F2937;    /* gray-800 */
  --color-bg-tertiary: #374151;     /* gray-700 */
  --color-bg-hover: #374151;        /* gray-700 */
  
  --color-text-primary: #F9FAFB;    /* gray-50 */
  --color-text-secondary: #D1D5DB;  /* gray-300 */
  --color-text-tertiary: #9CA3AF;   /* gray-400 */
  
  --color-border-primary: #374151;  /* gray-700 */
  --color-border-secondary: #4B5563;/* gray-600 */
  
  /* Shadows for dark mode (less visible) */
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.4);
}
```

**Theme Context:**
```jsx
// Location: /client/src/contexts/ThemeContext.jsx (new)

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

**Theme Toggle Component:**
```jsx
// Location: /client/src/components/ui/ThemeToggle.jsx (new)

import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
```

---

### 4.2 Real-time Updates via WebSocket

**Priority:** HIGH  
**Effort:** 3-4 days  
**Status:** Partial (WebSocket service exists, not fully integrated)

**Current State:**
- WebSocketService exists in `/server/src/services/websocketService.js`
- SSE used for guard dashboard
- Not connected to all dashboards

**Implementation Plan:**

**1. Extend WebSocket Rooms:**
```javascript
// Location: /server/src/services/websocketService.js (enhance)

const ROOMS = {
  DASHBOARD: 'dashboard',
  ADMIN: 'admin',
  GUARDS: 'guards',
  RESIDENTS: 'residents',
  RESIDENT_PREFIX: 'resident_', // e.g., resident_123 for user-specific
  GATE_PREFIX: 'gate_'          // e.g., gate_1 for gate-specific
};

// Events to broadcast
const EVENTS = {
  VISITOR_CHECKED_IN: 'visitor.checked_in',
  VISITOR_CHECKED_OUT: 'visitor.checked_out',
  VISITOR_CREATED: 'visitor.created',
  WALK_IN_PENDING: 'walk_in.pending',
  WALK_IN_APPROVED: 'walk_in.approved',
  WALK_IN_DENIED: 'walk_in.denied',
  INCIDENT_REPORTED: 'incident.reported',
  STATS_UPDATED: 'stats.updated'
};
```

**2. Frontend WebSocket Hook:**
```jsx
// Location: /client/src/hooks/useWebSocket.js (new)

import { useEffect, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

export const useWebSocket = (room, events) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:3001', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join', room);
    });

    // Register event handlers
    Object.entries(events).forEach(([event, handler]) => {
      newSocket.on(event, (data) => {
        setLastEvent({ event, data, timestamp: Date.now() });
        handler(data);
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [room]);

  const emit = useCallback((event, data) => {
    socket?.emit(event, data);
  }, [socket]);

  return { socket, isConnected, lastEvent, emit };
};
```

**3. Integrate into Dashboards:**
```jsx
// Location: /client/src/pages/resident/ResidentDashboard.jsx (modify)

const { isConnected, lastEvent } = useWebSocket('residents', {
  'visitor.checked_in': (data) => {
    if (data.residentId === user.id) {
      showNotification('Visitor Arrived', `${data.visitorName} has arrived`);
      refreshVisitors();
    }
  },
  'walk_in.pending': (data) => {
    if (data.residentId === user.id) {
      showApprovalModal(data);
    }
  }
});
```

---

### 4.3 Reduced Motion Support (Accessibility)

**Priority:** MEDIUM  
**Effort:** 0.5 days  
**Status:** Not Implemented

**Implementation:**
```css
/* Location: /client/src/styles/design-system.css (add) */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

### 4.4 Internationalization (i18n) Foundation

**Priority:** LOW  
**Effort:** 5-7 days  
**Status:** Not Implemented

**Implementation Approach:**
```javascript
// Location: /client/src/i18n/index.js (new)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import sw from './locales/sw.json'; // Swahili

i18n
  .use(initReactI18next)
  .init({
    resources: { en, sw },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;
```

**Example Locale File:**
```json
// Location: /client/src/i18n/locales/en.json
{
  "common": {
    "welcome": "Welcome",
    "login": "Sign In",
    "logout": "Sign Out",
    "save": "Save",
    "cancel": "Cancel"
  },
  "visitor": {
    "add": "Add Visitor",
    "checkIn": "Check In",
    "checkOut": "Check Out",
    "name": "Visitor Name",
    "phone": "Phone Number"
  },
  "guard": {
    "scanQR": "Scan QR Code",
    "manualCheck": "Manual Check",
    "incident": "Report Incident"
  }
}
```

---

## Part 5: Security Improvements

### 5.1 Enhanced Session Management

**Priority:** HIGH  
**Effort:** 2-3 days  
**Status:** Partial

**Current State:**
- httpOnly cookies
- Token refresh exists
- No session activity tracking

**Improvements:**

```javascript
// Location: /server/src/services/sessionSecurityService.js (enhance)

class EnhancedSessionService {
  // Track active sessions per user
  async getActiveSessions(userId) {
    return await db.query(
      `SELECT id, device_info, ip_address, last_activity, created_at
       FROM user_sessions 
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY last_activity DESC`,
      [userId]
    );
  }
  
  // Terminate specific session
  async terminateSession(sessionId, userId) {
    await db.query(
      'DELETE FROM user_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
  }
  
  // Terminate all sessions except current
  async terminateOtherSessions(userId, currentSessionId) {
    await db.query(
      'DELETE FROM user_sessions WHERE user_id = $1 AND id != $2',
      [userId, currentSessionId]
    );
  }
  
  // Update last activity
  async updateLastActivity(sessionId) {
    await db.query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE id = $1',
      [sessionId]
    );
  }
}
```

**User Interface for Session Management:**
```
┌─────────────────────────────────────────────────────────────┐
│                   ACTIVE SESSIONS                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🟢 This Device (Current)                                     │
│    Chrome on macOS • 192.168.1.100                          │
│    Last active: Just now                                     │
│                                                              │
│ 🔵 iPhone 15                                                 │
│    Safari on iOS • 192.168.1.101                            │
│    Last active: 2 hours ago                                  │
│    [🔐 End Session]                                          │
│                                                              │
│ 🔵 Windows PC                                                │
│    Firefox on Windows • 192.168.1.102                       │
│    Last active: Yesterday                                    │
│    [🔐 End Session]                                          │
│                                                              │
│ [End All Other Sessions]                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.2 Login Activity Alerts

**Priority:** MEDIUM  
**Effort:** 1-2 days  
**Status:** Not Implemented

**Features:**
- Email notification on new device login
- Alert on unusual location
- Suspicious activity warnings

```javascript
// Location: /server/src/services/loginAlertService.js (new)

class LoginAlertService {
  async checkAndAlert(userId, loginData) {
    const { ip, userAgent, geoLocation } = loginData;
    
    // Check if this is a new device
    const isNewDevice = await this.isNewDevice(userId, userAgent);
    
    // Check if location is unusual
    const isUnusualLocation = await this.isUnusualLocation(userId, geoLocation);
    
    if (isNewDevice) {
      await this.sendNewDeviceAlert(userId, loginData);
    }
    
    if (isUnusualLocation) {
      await this.sendUnusualLocationAlert(userId, loginData);
    }
    
    // Log the login
    await this.logLogin(userId, loginData);
  }
}
```

---

### 5.3 IP Whitelist/Blacklist for Admin

**Priority:** LOW  
**Effort:** 1-2 days  
**Status:** Not Implemented

**Database Changes:**
```sql
-- IP access control
CREATE TABLE ip_access_rules (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  ip_range_start VARCHAR(45),
  ip_range_end VARCHAR(45),
  rule_type VARCHAR(20) NOT NULL, -- 'allow', 'block'
  description TEXT,
  applies_to VARCHAR(50) DEFAULT 'all', -- 'all', 'admin', 'api'
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Part 6: Implementation Roadmap

### Phase 1: High Priority (Weeks 1-3)

| Week | Task | Effort | Owner |
|------|------|--------|-------|
| 1 | Dark Mode Implementation | 2-3 days | Frontend |
| 1 | Favorite Visitors Feature | 3-5 days | Full Stack |
| 2 | WebSocket Integration | 3-4 days | Full Stack |
| 2 | Push Notifications | 3-4 days | Full Stack |
| 3 | Enhanced QR Scanning | 2-3 days | Frontend |
| 3 | Session Management UI | 2-3 days | Full Stack |

### Phase 2: Medium Priority (Weeks 4-6)

| Week | Task | Effort | Owner |
|------|------|--------|-------|
| 4 | Incident Reporting Enhancement | 3-4 days | Full Stack |
| 4 | Admin Analytics Dashboard | 5-7 days | Full Stack |
| 5 | Pre-Approval Rules | 4-6 days | Full Stack |
| 5 | User Management Bulk Ops | 3-4 days | Full Stack |
| 6 | Shift Handover System | 4-5 days | Full Stack |
| 6 | Scheduled Reports | 2-3 days | Backend |

### Phase 3: Low Priority (Weeks 7-10)

| Week | Task | Effort | Owner |
|------|------|--------|-------|
| 7 | Gate Management | 3-4 days | Full Stack |
| 7 | Vehicle Logging | 2-3 days | Full Stack |
| 8 | Visitor History Export | 2-3 days | Full Stack |
| 8 | IP Whitelist/Blacklist | 1-2 days | Backend |
| 9-10 | i18n Foundation | 5-7 days | Full Stack |

---

## Part 7: Success Metrics

### User Adoption Metrics
- Resident: Time to invite visitor (target: <30 seconds)
- Guard: Check-in processing time (target: <10 seconds)
- Admin: Report generation time (target: <5 seconds)

### Performance Metrics
- WebSocket connection latency (target: <100ms)
- QR scan recognition time (target: <500ms)
- Dashboard load time (target: <2 seconds)

### Security Metrics
- Failed login attempts detected (target: 100%)
- Session anomalies flagged (target: 95%)
- API rate limit effectiveness (target: block 99% of abuse)

---

## Appendix A: File Location Reference

| Feature | Frontend Files | Backend Files | Database |
|---------|---------------|---------------|----------|
| Favorites | `pages/resident/FavoriteVisitors.jsx` | `services/favoriteVisitorService.js` | `favorite_visitors` |
| Dark Mode | `contexts/ThemeContext.jsx`, `styles/design-system.css` | N/A | User preferences |
| WebSocket | `hooks/useWebSocket.js` | `services/websocketService.js` | N/A |
| Incidents | `pages/guard/IncidentReport.jsx` | `services/incidentService.js` | `incidents` |
| Analytics | `pages/admin/AnalyticsDashboard.jsx` | `routes/adminAnalyticsRoutes.js` | Views |

---

*Document prepared for SecureGate development team*  
*Last updated: November 26, 2025*
