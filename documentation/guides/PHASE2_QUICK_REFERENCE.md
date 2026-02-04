# Phase 2 Quick Reference Guide

## 🚀 New Endpoints Quick Reference

### Bulk Operations
```bash
# Bulk Approve Users
POST /api/admin/users/bulk-approve
Body: { userIds: [1,2,3], estateId?: 1 }

# Bulk Reject Users
POST /api/admin/users/bulk-reject
Body: { userIds: [1,2,3], reason?: "string", estateId?: 1 }
```

### Advanced Search
```bash
# Advanced User Search
POST /api/admin/users/advanced-search
Body: {
  searchTerm?: "john",
  roles?: ["resident", "guard"],
  statuses?: ["active"],
  dateFrom?: "2025-01-01",
  dateTo?: "2025-02-01",
  mfaEnabled?: true,
  page?: 1,
  limit?: 20
}
```

### Password Reset
```bash
# Reset User Password
POST /api/admin/users/:id/reset-password
Body: { sendEmail?: true }
# Requires: MFA
```

### Session Management
```bash
# View User Sessions
GET /api/admin/users/:id/sessions

# Revoke Specific Session
DELETE /api/admin/users/:userId/sessions/:sessionId
# Requires: MFA

# Force Logout (Revoke All)
DELETE /api/admin/users/:id/sessions
# Requires: MFA
```

### Notification Preferences
```bash
# Get All Preferences
GET /api/admin/notification-preferences

# Update Single Preference
PUT /api/admin/notification-preferences/:id
Body: {
  notify_email: true,
  notify_sms: false,
  notify_in_app: true,
  frequency: "instant"
}

# Bulk Update
POST /api/admin/notification-preferences/bulk-update
Body: {
  preferences: [
    { id: 1, notify_email: true, ... },
    { id: 2, notify_email: false, ... }
  ]
}
```

### Activity Dashboard
```bash
# Activity Feed
GET /api/admin/activity/feed?page=1&limit=50

# Activity Trends
GET /api/admin/activity/trends?days=7

# Anomaly Detection
GET /api/admin/activity/anomalies

# Activity Summary
GET /api/admin/activity/summary
```

---

## 🎨 Frontend Components

### NotificationPreferences.jsx
**Location:** `/client/src/pages/admin/NotificationPreferences.jsx`  
**Route:** `/dashboard/admin/notifications`  
**Features:**
- Category-based grouping
- Toggle switches for channels (Email/SMS/In-App)
- Frequency dropdown (Instant/Hourly/Daily)
- Bulk save functionality
- Responsive design

**Usage:**
```jsx
import NotificationPreferences from './pages/admin/NotificationPreferences';

<Route path="/dashboard/admin/notifications" element={
  <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
    <NotificationPreferences />
  </ProtectedRoute>
} />
```

### ActivityDashboard.jsx
**Location:** `/client/src/pages/admin/ActivityDashboard.jsx`  
**Route:** `/dashboard/admin/activity`  
**Features:**
- Summary cards (pending approvals, active visitors, etc.)
- Trend charts with date range selector
- Anomaly alerts with severity indicators
- Real-time activity feed
- Auto-refresh (30s)
- Export to CSV

**Usage:**
```jsx
import ActivityDashboard from './pages/admin/ActivityDashboard';

<Route path="/dashboard/admin/activity" element={
  <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
    <ActivityDashboard />
  </ProtectedRoute>
} />
```

### PendingApprovals.jsx (Updated)
**Location:** `/client/src/pages/admin/PendingApprovals.jsx`  
**New Features:**
- Checkbox selection for bulk operations
- Select All / Deselect All button
- Bulk Approve button
- Bulk Reject button
- Confirmation dialogs

---

## 🗄️ Database Migration

### Run Migration
```bash
cd secure-gate-access/server
npm run migrate
```

### Migration File
`database/migrations/007_admin_notification_preferences.sql`

**Creates:**
- `admin_notification_preferences` table

**Columns:**
- `id` - Primary key
- `user_id` - Foreign key to users
- `event_type` - Type of event (pending_approval, visitor_checkin, etc.)
- `notify_email` - Boolean
- `notify_sms` - Boolean
- `notify_in_app` - Boolean
- `frequency` - instant/hourly/daily
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Event Types:**
1. `pending_approval`
2. `user_approved`
3. `user_rejected`
4. `visitor_checkin`
5. `visitor_checkout`
6. `guard_late`
7. `guard_absent`
8. `emergency_alert`
9. `incident_created`
10. `incident_escalated`
11. `backup_completed`
12. `backup_failed`
13. `retention_executed`

---

## 🧪 Testing Commands

### Run Validation
```bash
./validate-phase2.sh
```

### Manual API Testing (cURL)
```bash
# Test bulk approve (requires auth token)
curl -X POST http://localhost:5000/api/admin/users/bulk-approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userIds":[1,2,3]}'

# Test advanced search
curl -X POST http://localhost:5000/api/admin/users/advanced-search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"searchTerm":"john","roles":["resident"]}'

# Test notification preferences
curl http://localhost:5000/api/admin/notification-preferences \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test activity feed
curl http://localhost:5000/api/admin/activity/feed?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔒 Security Notes

### All Endpoints Include:
- ✅ Estate scoping (filters by `req.user.estate_id`)
- ✅ Rate limiting (`adminQueryLimit` or `adminModificationLimit`)
- ✅ Input validation (express-validator)
- ✅ Authorization (requireRole(['admin', 'super_admin']))
- ✅ Audit logging (for sensitive operations)

### MFA Required For:
- Password reset (`POST /api/admin/users/:id/reset-password`)
- Session revocation (`DELETE /api/admin/users/:userId/sessions/:sessionId`)
- Force logout (`DELETE /api/admin/users/:id/sessions`)

### Batch Limits:
- Bulk operations: Max 50 users
- Notification preferences: Max 50 preferences
- Activity feed: Max 100 items per page

---

## 📖 Documentation

### Main Documentation
- **ADMIN_ROLE_COMPREHENSIVE_ANALYSIS.md** - Complete analysis and implementation details
- **PHASE2_COMPLETION_REPORT.md** - Detailed completion report
- **PHASE2_VISUAL_SUMMARY.txt** - Visual summary of achievements

### Code Comments
All endpoints include JSDoc comments with:
- Route definition
- Description
- Request body schema
- Response schema
- Security requirements
- Example usage

---

## 🎯 Navigation Paths

### Admin Menu Items
1. Overview - `/dashboard/admin`
2. User Approvals - `/dashboard/admin/approvals`
3. Guards - `/dashboard/admin/guards`
4. Residents - `/dashboard/admin/residents`
5. Visitor Logs - `/dashboard/admin/visitors`
6. Reports - `/dashboard/admin/reports`
7. Settings - `/dashboard/admin/settings`
8. **Activity Dashboard** - `/dashboard/admin/activity` ← NEW
9. **Notifications** - `/dashboard/admin/notifications` ← NEW

---

## 🐛 Troubleshooting

### Migration Fails
```bash
# Check if migration already ran
psql -d your_database -c "SELECT * FROM schema_migrations WHERE version = '007';"

# If exists, manually drop table and retry
psql -d your_database -c "DROP TABLE IF EXISTS admin_notification_preferences;"
npm run migrate
```

### Frontend Components Not Loading
```bash
# Clear build cache
cd client
rm -rf node_modules/.cache
npm start
```

### API Returns 501 (Not Implemented)
This is expected for session management if `user_sessions` table doesn't exist.
The endpoints gracefully degrade and return clear error messages.

### Rate Limit Exceeded
```
Response: 429 Too Many Requests
Message: "Too many requests from this IP, please try again later"
```
**Solution:** Wait 15 minutes or adjust rate limits in `rateLimitMiddleware.js`

---

## 📞 Support

### Questions?
- Check: `ADMIN_ROLE_COMPREHENSIVE_ANALYSIS.md` for detailed API docs
- Run: `./validate-phase2.sh` to verify installation
- Review: Code comments in `adminRoutes.js` for implementation details

### Report Issues
Include:
1. Endpoint/component name
2. Request/response payloads
3. Error messages
4. Browser console logs (for frontend)
5. Server logs (for backend)

---

**Last Updated:** February 3, 2026  
**Phase:** 2 (Functionality Enhancements)  
**Status:** ✅ Complete
