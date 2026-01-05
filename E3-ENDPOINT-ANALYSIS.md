# E3 Endpoint Implementation Analysis
**Analysis Date:** December 31, 2025
**Status:** Smoke tests identified missing endpoints returning 404

---

## Executive Summary

The smoke tests revealed that several E3 (Event Management & Analytics) endpoints return **404 Not Found**. This analysis identifies:

1. **Which endpoints are truly missing** (need implementation)
2. **Which endpoints exist but use different paths** (path mismatch)
3. **What needs to be built** to complete E3 functionality

---

## 📊 Analytics Endpoints (NOT IMPLEMENTED)

### 1. GET `/api/analytics/events/:id`
**Status:** ❌ NOT IMPLEMENTED
**Expected:** Return analytics for a specific event
**Current:** 404 - Route doesn't exist

#### What Exists:
- ✅ Database view `event_analytics` with comprehensive stats:
  ```sql
  - total_invited, confirmed_count, declined_count
  - rsvp_attending, rsvp_not_attending, rsvp_maybe
  - checked_in_count, checked_out_count
  - total_plus_ones, rsvp_response_rate, attendance_rate
  ```
- ✅ Service layer can query views (db access works)

#### What's Missing:
- ❌ Route file: `src/routes/analyticsRoutes.js` (or add to existing file)
- ❌ Controller: Event analytics controller
- ❌ Service: Event analytics service (to query `event_analytics` view)
- ❌ Route mounting in `app.js` (line ~393)

#### Implementation Needed:
```javascript
// src/routes/analyticsRoutes.js
router.get('/events/:id', authenticateToken, eventAnalyticsController.getEventAnalytics);

// Controller should:
// 1. Query event_analytics view WHERE id = :id
// 2. Return JSON with statistics
// 3. Handle 404 if event not found
```

---

### 2. GET `/api/analytics/export?format=csv`
**Status:** ❌ NOT IMPLEMENTED
**Expected:** Export event analytics data in CSV/JSON format
**Current:** 404 - Route doesn't exist

#### What Exists:
- ✅ Database views ready for export
- ✅ CSV writer dependency installed (`csv-writer` in package.json)

#### What's Missing:
- ❌ Export route handler
- ❌ Export controller with CSV/JSON formatting logic
- ❌ Query filters (date range, event_id, etc.)

#### Implementation Needed:
```javascript
// src/routes/analyticsRoutes.js
router.get('/export', authenticateToken, requireRole(['admin']),
  eventAnalyticsController.exportEventAnalytics);

// Controller should:
// 1. Accept query params: format (csv|json), event_id, start_date, end_date
// 2. Query event_analytics view with filters
// 3. Format data (CSV or JSON)
// 4. Set appropriate headers and send file
```

---

## 🎫 Event Visitor Management Endpoints

### 3. POST `/api/events/:id/bulk-invite`
**Status:** ⚠️ PATH MISMATCH (Functional, but different path)
**Expected Path:** `/api/events/:id/bulk-invite`
**Actual Path:** `/api/events/:id/bulk-invitations`

#### What Exists:
- ✅ Route: `POST /api/events/:id/bulk-invitations` ([eventManagementRoutes.js:282](src/routes/eventManagementRoutes.js#L282))
- ✅ Service: `eventManagementService.processBulkInvitations()`
- ✅ Database: `bulk_invitation_batches` table
- ✅ Fully functional implementation

#### The Issue:
Smoke test calls `/api/events/1/bulk-invite` → **404**
Actual endpoint is `/api/events/1/bulk-invitations` → **Works!**

#### Solutions (pick one):
**Option A:** Update smoke test to use `/bulk-invitations` (semantically correct)
**Option B:** Add route alias for `/bulk-invite` pointing to same handler
**Option C:** Change route to `/bulk-invite` (breaks consistency with table name)

**Recommendation:** Option A - Update test to `/bulk-invitations`

---

### 4. PATCH `/api/events/:id/visitors/:vid/rsvp`
**Status:** ⚠️ NON-RESTful IMPLEMENTATION (Different structure)
**Expected:** Nested resource route with path parameters
**Actual:** `POST /api/events/rsvp` with body parameters

#### What Exists:
- ✅ Route: `POST /api/events/rsvp` ([eventManagementRoutes.js:448](src/routes/eventManagementRoutes.js#L448))
- ✅ Service: `eventManagementService.handleRSVP()`
- ✅ Public endpoint (no auth required)
- ✅ Fully functional

#### Current Implementation:
```javascript
POST /api/events/rsvp
Body: {
  event_visitor_id: 123,  // Junction table ID
  rsvp_status: "attending",
  plus_one_count: 1,
  plus_one_names: ["Guest Name"]
}
```

#### Expected RESTful Implementation:
```javascript
PATCH /api/events/1/visitors/456/rsvp
Body: {
  rsvp_status: "attending",
  plus_one_count: 1,
  plus_one_names: ["Guest Name"]
}
```

#### What's Missing:
- ❌ Nested route handler for `/api/events/:event_id/visitors/:visitor_id/rsvp`
- ❌ Controller logic to lookup `event_visitor` by both `event_id` AND `visitor_id`
- ❌ Service method supporting dual-key lookup

#### Implementation Needed:
```javascript
// Add to eventManagementRoutes.js
router.patch('/:event_id/visitors/:visitor_id/rsvp',
  eventManagementController.handleNestedRSVP);

// Service should:
// 1. Find event_visitor WHERE event_id = :event_id AND visitor_id = :visitor_id
// 2. Update RSVP status
// 3. Return updated record
```

---

### 5. POST `/api/events/:id/visitors/:vid/checkin`
**Status:** ⚠️ NON-RESTful IMPLEMENTATION (Uses QR code)
**Expected:** Nested resource route with path parameters
**Actual:** `POST /api/events/check-in` with QR code in body

#### What Exists:
- ✅ Route: `POST /api/events/check-in` ([eventManagementRoutes.js:489](src/routes/eventManagementRoutes.js#L489))
- ✅ Service: `eventManagementService.checkInToEvent()`
- ✅ Authentication: Required (guard or admin role)
- ✅ Fully functional (QR code-based workflow)

#### Current Implementation:
```javascript
POST /api/events/check-in
Headers: Authorization: Bearer <token>
Body: {
  event_qr_code: "uuid-here"
}
// Looks up event_visitor by QR code
```

#### Expected RESTful Implementation:
```javascript
POST /api/events/1/visitors/456/checkin
Headers: Authorization: Bearer <token>
Body: {} // Empty or optional metadata
// Uses event_id and visitor_id from path
```

#### What's Missing:
- ❌ Nested route handler for `/api/events/:event_id/visitors/:visitor_id/checkin`
- ❌ Controller logic to lookup by event_id + visitor_id instead of QR code
- ❌ Service method supporting dual-key lookup

#### Implementation Needed:
```javascript
// Add to eventManagementRoutes.js
router.post('/:event_id/visitors/:visitor_id/checkin',
  authenticateToken, requireRole(['guard', 'admin']),
  eventManagementController.handleNestedCheckIn);

// Service should:
// 1. Find event_visitor WHERE event_id = :event_id AND visitor_id = :visitor_id
// 2. Validate visitor is invited and confirmed
// 3. Update check_in_time
// 4. Return success
```

**Related:** Same pattern needed for `/checkout` endpoint
Current: `POST /api/events/check-out` ([eventManagementRoutes.js:528](src/routes/eventManagementRoutes.js#L528))

---

## 📋 Implementation Priority

### Priority 1: Critical for E3 Functionality
1. **Analytics Endpoint** - `GET /api/analytics/events/:id`
   - **Effort:** Medium (2-3 hours)
   - **Impact:** High (core E3 feature)
   - **Dependencies:** None (view exists, just need route + controller)

2. **Export Endpoint** - `GET /api/analytics/export`
   - **Effort:** Medium (3-4 hours with CSV formatting)
   - **Impact:** High (core E3 feature)
   - **Dependencies:** CSV writer library (already installed)

### Priority 2: API Consistency (RESTful Structure)
3. **Nested RSVP Route** - `PATCH /api/events/:id/visitors/:vid/rsvp`
   - **Effort:** Low-Medium (1-2 hours)
   - **Impact:** Medium (improves API consistency)
   - **Dependencies:** None (service layer exists)

4. **Nested Check-in/out Routes** - `POST /api/events/:id/visitors/:vid/checkin`
   - **Effort:** Low-Medium (1-2 hours)
   - **Impact:** Medium (improves API consistency)
   - **Dependencies:** None (service layer exists)

### Priority 3: Path Fixes
5. **Bulk Invite Path** - Update test to use `/bulk-invitations`
   - **Effort:** Trivial (5 minutes)
   - **Impact:** Low (cosmetic fix)
   - **Dependencies:** None

---

## 🔧 Files to Create/Modify

### New Files Needed:
```
src/routes/analyticsRoutes.js
src/controllers/eventAnalyticsController.js
src/services/eventAnalyticsService.js
```

### Files to Modify:
```
src/app.js (mount analytics routes)
src/routes/eventManagementRoutes.js (add nested visitor routes)
src/controllers/eventManagementController.js (add nested methods)
src/services/eventManagementService.js (add dual-key lookup methods)
tests/smoke/03-e3-smoke.test.js (update bulk-invite path)
```

---

## 📊 Database Support Status

| Feature | Tables | Views | Indexes | Status |
|---------|--------|-------|---------|--------|
| Events | ✅ events | ✅ upcoming_events | ✅ | Ready |
| Event Visitors | ✅ event_visitors | ✅ event_checkin_queue | ✅ | Ready |
| Bulk Invitations | ✅ bulk_invitation_batches | - | ✅ | Ready |
| Analytics | ✅ events + event_visitors | ✅ event_analytics | ✅ | Ready |
| Reminders | ✅ event_reminders | - | ✅ | Ready |

**Conclusion:** Database schema is complete and ready. All missing endpoints are **application layer** issues.

---

## 🎯 Recommended Implementation Order

### Day 1 (After Unit Testing):
1. Create analytics routes file
2. Implement event analytics controller
3. Implement analytics service layer
4. Mount routes in app.js
5. Test analytics endpoints

### Day 2:
6. Add nested RSVP route
7. Add nested check-in/checkout routes
8. Update service layer for dual-key lookups
9. Test nested routes

### Day 3:
10. Implement export functionality (CSV/JSON)
11. Add query filters for export
12. Update smoke tests to use correct paths
13. Full E3 integration testing

---

## 🚀 Quick Wins

These can be done immediately with minimal effort:

1. **Update Bulk Invite Test Path** (5 min)
   ```javascript
   // Change in 03-e3-smoke.test.js
   .post('/api/events/1/bulk-invitations')  // was: bulk-invite
   ```

2. **Create Analytics Service Stub** (15 min)
   ```javascript
   // src/services/eventAnalyticsService.js
   export async function getEventAnalytics(eventId) {
     return await db.query(
       'SELECT * FROM event_analytics WHERE id = $1',
       [eventId]
     );
   }
   ```

3. **Create Analytics Route** (15 min)
   ```javascript
   // src/routes/analyticsRoutes.js
   router.get('/events/:id', async (req, res) => {
     const data = await eventAnalyticsService.getEventAnalytics(req.params.id);
     res.json(data.rows[0] || {});
   });
   ```

---

## ✅ Success Criteria

E3 implementation will be considered complete when:
- [ ] All smoke tests pass (no 404 errors)
- [ ] Analytics endpoints return data from `event_analytics` view
- [ ] Export endpoint produces valid CSV and JSON
- [ ] Nested visitor routes work with RESTful structure
- [ ] Backward compatibility maintained for existing QR-based routes
- [ ] Integration tests validate all workflows

---

**Next Steps:** Proceed with Unit Testing, then implement missing E3 endpoints in priority order.
