# E2 + E3 Testing Guide
Quick reference for testing Visitor Confirmation (E2) and Analytics Export (E3)

---

## Prerequisites

✅ Server running on http://localhost:3001
✅ Database migrations applied
✅ Health check passing: `curl http://localhost:3001/api/health`

---

## E2: Visitor Self-Service Confirmation

### 1. Create Test Visitor (Via API or Admin Panel)

```bash
# First, login as admin/resident to get auth token
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'

# Save the token from response
TOKEN="<your-token-here>"

# Create a visitor
curl -X POST http://localhost:3001/api/visitors \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+254700000000",
    "purpose": "Delivery",
    "date_of_visit": "2025-12-31",
    "time_of_visit": "14:00:00"
  }'
```

### 2. Get Visitor Token

```bash
# The visitor_token should be in the response from visitor creation
# Or query to get it:
curl -X GET "http://localhost:3001/api/visitors?email=john@example.com" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Test Public Visitor Confirmation

```bash
# Get visitor details by token (no auth required)
VISITOR_TOKEN="<token-from-visitor-record>"

curl -X GET "http://localhost:3001/api/public/visitors/by-token/$VISITOR_TOKEN"

# Confirm visit and provide consent
curl -X POST "http://localhost:3001/api/public/visitors/123/confirm" \
  -H 'Content-Type: application/json' \
  -d '{
    "consent_data": {
      "dataProcessing": true,
      "privacyPolicy": true,
      "marketing": false,
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2025-12-31T14:00:00Z"
    },
    "additional_info": {
      "vehicleDetails": {
        "plate": "KAA 123A",
        "color": "Silver",
        "make": "Toyota"
      },
      "emergencyContact": {
        "name": "Jane Doe",
        "phone": "+254700000001"
      }
    }
  }'
```

### 4. Verify E2 Data Storage

```bash
# Check that consent_data and additional_info were stored
curl -X GET "http://localhost:3001/api/visitors/123" \
  -H "Authorization: Bearer $TOKEN"

# Response should include:
# - consent_data (JSONB)
# - additional_info (JSONB)
# - consent_given_at (timestamp)
```

---

## E3: Analytics Export

### 1. Create Test Events

```bash
# Create an event
curl -X POST http://localhost:3001/api/events \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "New Year Party 2026",
    "description": "Annual celebration",
    "event_type": "party",
    "location": "Main Hall",
    "start_date": "2026-01-01T19:00:00Z",
    "end_date": "2026-01-02T02:00:00Z",
    "max_capacity": 100,
    "status": "published"
  }'
```

### 2. Add Event Visitors/Invitations

```bash
# Bulk import visitors for event
curl -X POST http://localhost:3001/api/events/1/bulk-invite \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "invitations": [
      {
        "visitor_name": "Alice Smith",
        "visitor_email": "alice@example.com",
        "visitor_phone": "+254700000002"
      },
      {
        "visitor_name": "Bob Johnson",
        "visitor_email": "bob@example.com",
        "visitor_phone": "+254700000003"
      }
    ]
  }'
```

### 3. Simulate RSVPs and Check-ins

```bash
# RSVP for event
curl -X PATCH http://localhost:3001/api/events/1/visitors/1/rsvp \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "rsvp_status": "attending",
    "plus_one_count": 1
  }'

# Check-in visitor
curl -X POST http://localhost:3001/api/events/1/visitors/1/checkin \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Query Analytics Views

```bash
# Get event analytics
curl -X GET "http://localhost:3001/api/analytics/events/1" \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
{
  "id": 1,
  "name": "New Year Party 2026",
  "total_invited": 2,
  "confirmed_count": 1,
  "rsvp_attending": 1,
  "checked_in_count": 1,
  "total_plus_ones": 1,
  "rsvp_response_rate": 50.00,
  "attendance_rate": 100.00
}
```

### 5. Export Analytics Data

```bash
# Export as CSV
curl -X GET "http://localhost:3001/api/analytics/export?format=csv&event_id=1" \
  -H "Authorization: Bearer $TOKEN" \
  -o event-analytics.csv

# Export as JSON
curl -X GET "http://localhost:3001/api/analytics/export?format=json&event_id=1" \
  -H "Authorization: Bearer $TOKEN" \
  -o event-analytics.json

# Export all events in date range
curl -X GET "http://localhost:3001/api/analytics/export?format=csv&start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer $TOKEN" \
  -o all-events-2025.csv
```

### 6. Direct Database Queries (For Verification)

```sql
-- Query event analytics view
SELECT * FROM event_analytics WHERE id = 1;

-- Query upcoming events
SELECT * FROM upcoming_events;

-- Query check-in queue
SELECT * FROM event_checkin_queue WHERE event_id = 1;

-- Test E2 visitor confirmation data
SELECT
  id, name, email,
  consent_data,
  additional_info,
  consent_given_at
FROM visitors
WHERE consent_given_at IS NOT NULL
LIMIT 5;
```

---

## Testing Checklist

### E2 Visitor Confirmation:
- [ ] ✅ Visitor can access invite via public token
- [ ] ✅ Visitor can confirm attendance
- [ ] ✅ Consent data is captured (dataProcessing, privacyPolicy, marketing)
- [ ] ✅ Additional info is stored (vehicle, emergency contact, etc.)
- [ ] ✅ consent_given_at timestamp is recorded
- [ ] ✅ GIN indexes improve JSONB query performance
- [ ] ✅ API returns visitor data without authentication via token

### E3 Analytics Export:
- [ ] ✅ Events can be created with details
- [ ] ✅ Bulk invitations work (CSV import)
- [ ] ✅ Visitors can RSVP (attending/not attending/maybe)
- [ ] ✅ Check-in/check-out is tracked
- [ ] ✅ Plus-one counts are recorded
- [ ] ✅ event_analytics view shows correct metrics
- [ ] ✅ Response rates calculate correctly
- [ ] ✅ Attendance rates calculate correctly
- [ ] ✅ Export works for CSV format
- [ ] ✅ Export works for JSON format
- [ ] ✅ Date range filtering works

---

## Expected Database Schema

### E2 Fields in `visitors` table:
```sql
consent_data         | jsonb                       |
additional_info      | jsonb                       |
consent_given_at     | timestamp with time zone    |
```

### E3 Tables:
```sql
events                      | Event master data
event_visitors             | Invitations & RSVPs
bulk_invitation_batches    | CSV import tracking
event_reminders            | Automated reminders
```

### E3 Views:
```sql
event_analytics            | Event statistics and rates
upcoming_events            | Events with attendee counts
event_checkin_queue        | Expected attendees for check-in
```

---

## Troubleshooting

### Issue: Visitor token not working
**Solution:** Check that visitor_token column exists and has a valid UUID value

### Issue: Consent data not saving
**Solution:** Verify consent_data column exists with JSONB type:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'visitors'
AND column_name = 'consent_data';
```

### Issue: Analytics views return no data
**Solution:** Ensure events and event_visitors tables have test data:
```sql
SELECT COUNT(*) FROM events;
SELECT COUNT(*) FROM event_visitors;
```

### Issue: Export endpoint returns 404
**Solution:** Check that analytics routes are registered in server.js:
```javascript
app.use('/api/analytics', analyticsRoutes);
```

---

## Performance Verification

### Check Index Usage:
```sql
-- Verify GIN indexes exist for E2
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'visitors'
AND indexname LIKE '%consent%';

-- Should show:
-- idx_visitors_consent_data (GIN index on consent_data)
-- idx_visitors_additional_info (GIN index on additional_info)
-- idx_visitors_consent_given_at (B-tree index on consent_given_at)
```

### Query Performance Test:
```sql
-- Test JSONB query performance (should use GIN index)
EXPLAIN ANALYZE
SELECT * FROM visitors
WHERE consent_data @> '{"dataProcessing": true}'::jsonb;

-- Should show "Bitmap Index Scan on idx_visitors_consent_data"
```

---

## Success Criteria

✅ **E2 Success:**
- Visitors can confirm via public token URL
- Consent data stored as JSONB
- Additional info captured flexibly
- Timestamps recorded accurately
- No authentication required for public endpoints

✅ **E3 Success:**
- Events created and managed
- Bulk invitations work
- RSVP tracking functional
- Check-in/check-out recorded
- Analytics views return accurate data
- Export formats (CSV/JSON) work correctly
- Performance metrics calculate properly

---

## Next Steps After Testing

1. Create frontend UI for visitor confirmation page
2. Implement export endpoints with format support
3. Add real-time analytics dashboard
4. Create event management admin panel
5. Implement automated email reminders
6. Add QR code generation for event tickets

---

**Last Updated:** December 31, 2025
**Server:** http://localhost:3001
**Status:** Ready for Testing ✅
