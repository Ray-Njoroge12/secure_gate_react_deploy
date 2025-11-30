# Phase 3: Visitor Approval State Machine

## Overview
Replace guard phone calls with digital, real-time visitor approvals from residents.

---

## Current Visitor Statuses (Before Phase 3)

From `server/src/constants/statuses.js`:
```javascript
PASS_STATUS = {
  PENDING:      'pending',      // Invited, not yet verified
  CONFIRMED:    'confirmed',    // Invitation confirmed
  ACTIVE:       'active',       // Pass is active
  ON_PREMISE:   'on_premise',   // Checked in at gate
  CHECKED_OUT:  'checked_out',  // Left premises
  EXPIRED:      'expired',      // Pass/invite expired
  REVOKED:      'revoked'       // Access revoked
}
```

---

## New Statuses for Approval Flow (Phase 3)

```javascript
// Add to PASS_STATUS in statuses.js
PENDING_APPROVAL: 'pending_approval',  // Walk-in, waiting for resident approval
APPROVED:         'approved',          // Resident approved entry
REJECTED:         'rejected'           // Resident rejected entry
```

---

## State Machine Diagram

```
PRE-INVITED FLOW:
  [PENDING] → [CONFIRMED] → [ACTIVE] → [ON_PREMISE] → [CHECKED_OUT]
       ↓
  [EXPIRED] or [REVOKED]

WALK-IN APPROVAL FLOW (NEW):
  Guard registers walk-in
       ↓
  [PENDING_APPROVAL]
       ↓
  Resident approves or rejects
       ↓            ↓
  [APPROVED]   [REJECTED]
       ↓
  [ON_PREMISE] → [CHECKED_OUT]
```

---

## State Transitions & Rules

### 1. PENDING_APPROVAL
**Entry**: Guard registers a walk-in visitor
**Actors**: Guard
**Triggers**:
- `POST /api/visitors/:id/request-approval`

**Allowed transitions**:
- → APPROVED (resident approves)
- → REJECTED (resident rejects)
- → EXPIRED (no response after X minutes - optional timeout)

**WebSocket event**: `visitor.pending_approval` → resident

---

### 2. APPROVED
**Entry**: Resident approves via UI
**Actors**: Resident
**Triggers**:
- `POST /api/visitors/:id/approve`

**Allowed transitions**:
- → ON_PREMISE (guard checks in)
- → EXPIRED (approved but never checked in)

**WebSocket event**: `visitor.approval_response` → guard

---

### 3. REJECTED
**Entry**: Resident rejects via UI
**Actors**: Resident
**Triggers**:
- `POST /api/visitors/:id/reject`

**Terminal state**: No further transitions
**WebSocket event**: `visitor.approval_response` → guard

---

## API Endpoints (New)

### 1. Request Approval
```http
POST /api/visitors/:id/request-approval
Authorization: Bearer {guardToken}

Request body:
{
  "reason": "Walk-in visitor at gate",
  "notes": "Optional additional context"
}

Response:
{
  "success": true,
  "visitor": {
    "id": 123,
    "name": "John Doe",
    "status": "pending_approval",
    "resident_id": 456,
    "requested_at": "2025-11-20T13:45:00Z"
  }
}

Side effects:
- Updates visitor status → PENDING_APPROVAL
- Emits WebSocket event to resident: visitor.pending_approval
- Creates approval_requests table entry (optional audit)
```

### 2. Approve Visitor
```http
POST /api/visitors/:id/approve
Authorization: Bearer {residentToken}

Response:
{
  "success": true,
  "visitor": {
    "id": 123,
    "name": "John Doe",
    "status": "approved",
    "approved_by": 456,
    "approved_at": "2025-11-20T13:46:00Z"
  }
}

Side effects:
- Updates visitor status → APPROVED
- Records approved_by (resident ID) and approved_at timestamp
- Emits WebSocket event to guard: visitor.approval_response
- Audit log: visitor.approve
```

### 3. Reject Visitor
```http
POST /api/visitors/:id/reject
Authorization: Bearer {residentToken}

Request body (optional):
{
  "reason": "Not expecting this visitor"
}

Response:
{
  "success": true,
  "visitor": {
    "id": 123,
    "name": "John Doe",
    "status": "rejected",
    "rejected_by": 456,
    "rejected_at": "2025-11-20T13:46:00Z",
    "rejection_reason": "Not expecting this visitor"
  }
}

Side effects:
- Updates visitor status → REJECTED
- Records rejected_by, rejected_at, rejection_reason
- Emits WebSocket event to guard: visitor.approval_response
- Audit log: visitor.reject
```

### 4. Get Pending Approvals
```http
GET /api/visitors/pending-approvals
Authorization: Bearer {residentToken}

Response:
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "John Doe",
      "phone": "0712345678",
      "vehicle_plate": "KCA 123A",
      "status": "pending_approval",
      "requested_at": "2025-11-20T13:45:00Z",
      "purpose": "Delivery",
      "guard_notes": "Package delivery"
    }
  ]
}
```

---

## Database Changes

### Option A: Use Existing visitors Table
Add new columns to `visitors` table:
```sql
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Index for pending approvals query
CREATE INDEX IF NOT EXISTS idx_visitors_pending_approval 
  ON visitors(resident_id, status) 
  WHERE status = 'pending_approval';
```

### Option B: Separate approval_requests Table (More Auditable)
```sql
CREATE TABLE IF NOT EXISTS approval_requests (
  id SERIAL PRIMARY KEY,
  visitor_id INTEGER NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  resident_id INTEGER NOT NULL REFERENCES users(id),
  requested_by INTEGER REFERENCES users(id), -- Guard who requested
  requested_at TIMESTAMP DEFAULT NOW(),
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  responded_by INTEGER REFERENCES users(id),     -- Resident who responded
  responded_at TIMESTAMP,
  
  approval_notes TEXT,
  rejection_reason TEXT,
  
  UNIQUE(visitor_id) -- One approval request per visitor
);

CREATE INDEX idx_approval_requests_resident_status 
  ON approval_requests(resident_id, status);
```

**Recommendation**: Use **Option A** (existing table) for simplicity and fewer joins.
Only create `approval_requests` if detailed approval audit trail is critical.

---

## WebSocket Event Schemas

### Event: visitor.pending_approval
```json
{
  "event": "visitor.pending_approval",
  "channel": "resident:456",
  "data": {
    "visitor_id": 123,
    "name": "John Doe",
    "phone": "0712345678",
    "vehicle_plate": "KCA 123A",
    "purpose": "Delivery",
    "requested_at": "2025-11-20T13:45:00Z",
    "guard_name": "James Mwangi"
  }
}
```

### Event: visitor.approval_response
```json
{
  "event": "visitor.approval_response",
  "channel": "guard:789",
  "data": {
    "visitor_id": 123,
    "status": "approved",  // or "rejected"
    "responded_by": "Jane Kamau",
    "responded_at": "2025-11-20T13:46:00Z",
    "rejection_reason": null  // or "Not expecting this visitor"
  }
}
```

---

## Security Considerations

1. **Authorization**:
   - Only guards can request approval (`request-approval`)
   - Only the visitor's assigned resident can approve/reject
   - Check `visitor.resident_id === req.user.id`

2. **Validation**:
   - Visitor must be in `PENDING_APPROVAL` status to approve/reject
   - No approving already-approved visitors
   - No rejecting already-rejected visitors

3. **Audit Trail**:
   - Log all approval/rejection actions
   - Include actor (who approved/rejected)
   - Include timestamp
   - Include reason for rejection

4. **Rate Limiting**:
   - Limit approval requests per guard (prevent spam)
   - Cooldown period between requests for same visitor

---

## Frontend UX Flow

### Resident Experience:
```
1. Guard registers walk-in → backend creates PENDING_APPROVAL visitor
2. Resident sees real-time notification (WebSocket)
3. Resident opens approvals panel → sees pending list
4. Resident taps "Allow" or "Decline"
5. Backend processes → updates status → notifies guard
6. Resident sees "Approved ✅" confirmation
```

### Guard Experience:
```
1. Walk-in arrives at gate
2. Guard enters visitor details → taps "Request Approval"
3. System shows "Waiting for resident approval..."
4. Resident approves → guard sees "Approved ✅ - Open Gate"
   OR
   Resident rejects → guard sees "Rejected ❌ - Do Not Admit"
```

---

## Testing Scenarios

1. **Happy Path: Approval**
   - Guard requests → resident approves → guard checks in → visitor on premise

2. **Happy Path: Rejection**
   - Guard requests → resident rejects → guard denies entry

3. **Edge Cases**:
   - Multiple pending approvals (queue)
   - Resident offline → approval timeout (optional)
   - Guard cancels request before resident responds
   - Resident tries to approve wrong visitor (authorization check)
   - WebSocket connection drops (REST fallback)

---

## Implementation Order

1. ✅ Design state machine (this document)
2. ⏳ Add new statuses to `statuses.js`
3. ⏳ Extend `visitors` table with approval columns
4. ⏳ Create API endpoints (request, approve, reject, get-pending)
5. ⏳ Add WebSocket event handlers
6. ⏳ Build `ResidentApprovalsPanel.jsx`
7. ⏳ Integrate guard dashboard
8. ⏳ End-to-end testing

---

**Status**: Design Complete ✅  
**Next**: Implement backend APIs (Phase 3.2)
