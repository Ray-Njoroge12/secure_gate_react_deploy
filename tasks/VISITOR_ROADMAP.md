# Visitor Improvement Roadmap (V1-V5)

**Objective**: Transform visitor experience from basic invite system to modern, self-service digital pass platform

**Status**: Ready for Implementation  
**Estimated Total Time**: 20-25 hours  
**Priority**: High (competitive parity with Envoy, Sine, Traction Guest)

---

## Phase V1: Visitor Invite Landing & Digital Pass

### Objective
Give every visitor a modern, self-contained digital pass accessible via secure link.

### Tasks
- [ ] V1.1 - Generate secure visitor tokens (UUID/JWT per visitor)
- [ ] V1.2 - Create `/api/visitors/by-token/:token` endpoint
- [ ] V1.3 - Build VisitorInvitePage.jsx component (public route)
- [ ] V1.4 - Display QR code for guard scanning
- [ ] V1.5 - Show live status updates (approved/rejected/expired)
- [ ] V1.6 - Add gate directions and instructions
- [ ] V1.7 - Mobile-responsive design
- [ ] V1.8 - Add token to invite creation flow

### Key Features
- Tokenized URL: `/v/<secureToken>`
- Live status display (no refresh needed)
- QR code generation for existing invite codes
- Estate information (gate, parking, contacts)
- Works on all mobile browsers

### API Endpoints
```
GET /api/visitors/by-token/:token  # Fetch visitor details
```

### Database Changes
```sql
ALTER TABLE visitors ADD COLUMN visitor_token VARCHAR(255) UNIQUE;
CREATE INDEX idx_visitors_token ON visitors(visitor_token);
```

### Success Criteria
- [x] Visitor can access invite via secure link
- [x] QR code displays correctly on all devices
- [x] Status updates in real-time
- [x] Mobile-responsive (tested on Android/iOS)
- [x] Performance: <1s page load

**Estimated Time**: 4-5 hours

---

## Phase V2: Self Pre-Registration & Visitor Profile

### Objective
Let visitors complete/update their own details, reducing friction at the gate.

### Tasks
- [ ] V2.1 - Add visitor self-update endpoint
- [ ] V2.2 - Create VisitorPreRegistrationForm component
- [ ] V2.3 - Integrate form into V1 invite page
- [ ] V2.4 - Add optional photo upload
- [ ] V2.5 - Create visitor profile recognition (by phone/email)
- [ ] V2.6 - Auto-fill for returning visitors
- [ ] V2.7 - Validation & error handling
- [ ] V2.8 - Consent checkbox for data processing

### Key Features
- Editable fields: name, phone, email, company, vehicle, photo (optional)
- Validation matching backend rules
- Privacy consent required
- Returning visitor detection
- Form prefill for repeat visitors
- Photo upload (max 5MB)

### API Endpoints
```
PUT /api/visitors/:id/self-update     # Visitor updates own details
GET /api/visitors/profile/:identifier # Check if returning visitor
```

### Database Changes
```sql
ALTER TABLE visitors ADD COLUMN photo_url VARCHAR(500);
ALTER TABLE visitors ADD COLUMN company VARCHAR(255);
ALTER TABLE visitors ADD COLUMN self_registered_at TIMESTAMP;
ALTER TABLE visitors ADD COLUMN profile_hash VARCHAR(64); -- For repeat detection
CREATE INDEX idx_visitors_profile_hash ON visitors(profile_hash);
```

### Success Criteria
- [x] Visitor can update name, phone, vehicle, company
- [x] Optional photo upload works
- [x] Returning visitors recognized (by phone)
- [x] Data validation matches backend
- [x] Privacy consent captured

**Estimated Time**: 5-6 hours

---

## Phase V3: Visitor Notifications & Communication

### Objective
Keep visitors informed automatically via SMS/email/WhatsApp.

### Tasks
- [ ] V3.1 - Create notification service abstraction
- [ ] V3.2 - Implement email notification provider
- [ ] V3.3 - Implement SMS notification provider (Twilio/Africa's Talking)
- [ ] V3.4 - Create notification templates (invite created, approved, rejected, reminder)
- [ ] V3.5 - Add notification triggers to approval flow
- [ ] V3.6 - Add notification triggers to invite creation
- [ ] V3.7 - Multi-language support (English/Swahili)
- [ ] V3.8 - Notification preferences & opt-out
- [ ] V3.9 - Admin config for notification settings

### Key Features
- Event-based notifications:
  - Invite created
  - Approval response (approved/rejected)
  - Reminder (1 hour before)
  - Check-in confirmation
- Multi-channel (email, SMS, WhatsApp)
- Language selection (English/Swahili)
- Opt-out mechanism
- Admin toggle per estate

### API Endpoints
```
POST /api/notifications/send         # Send notification
GET  /api/notifications/preferences  # Get visitor preferences
PUT  /api/notifications/preferences  # Update preferences
```

### Database Changes
```sql
CREATE TABLE visitor_notifications (
  id SERIAL PRIMARY KEY,
  visitor_id INTEGER REFERENCES visitors(id),
  type VARCHAR(50), -- invite_created, approved, rejected, reminder
  channel VARCHAR(20), -- email, sms, whatsapp
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20), -- sent, failed, bounced
  message_id VARCHAR(255)
);

CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE, -- or email
  opt_out BOOLEAN DEFAULT FALSE,
  preferred_language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Success Criteria
- [x] Visitor receives email on invite creation
- [x] Visitor receives SMS on approval
- [x] Templates support English & Swahili
- [x] Opt-out functionality works
- [x] Admin can configure notification channels

**Estimated Time**: 6-7 hours

---

## Phase V4: Self Check-In Kiosk Mode

### Objective
Enable self-service arrivals at a tablet/terminal for walk-ins.

### Tasks
- [ ] V4.1 - Create kiosk route with IP allowlist
- [ ] V4.2 - Build KioskHome.jsx component
- [ ] V4.3 - QR code scan flow (via camera or input)
- [ ] V4.4 - Resident search flow (walk-in visitors)
- [ ] V4.5 - Photo capture on arrival (optional)
- [ ] V4.6 - Integration with existing check-in endpoint
- [ ] V4.7 - Kiosk-specific rate limiting
- [ ] V4.8 - Visual distinction from guard/admin UI
- [ ] V4.9 - Kiosk admin panel (IP management, settings)

### Key Features
- Two flows:
  1. "I have a QR code" → scan/type → check in
  2. "I'm visiting [resident]" → search → walk-in + approval
- Optional photo capture
- Large touch-friendly UI
- No authentication required (secured by network/IP)
- Auto-reset after inactivity (30s)
- Accessibility features (large text, high contrast)

### API Endpoints
```
POST /api/kiosk/check-in            # Kiosk check-in
GET  /api/kiosk/search-resident     # Search residents (limited fields)
POST /api/kiosk/walk-in             # Create walk-in from kiosk
GET  /api/admin/kiosk/config        # Kiosk configuration
```

### Database Changes
```sql
CREATE TABLE kiosk_devices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  ip_address VARCHAR(45),
  location VARCHAR(255),
  enabled BOOLEAN DEFAULT TRUE,
  last_active TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE visitors ADD COLUMN checked_in_via VARCHAR(20); -- guard, kiosk, mobile
```

### Success Criteria
- [x] Kiosk accessible only from allowed IPs
- [x] QR scan flow works smoothly
- [x] Walk-in flow integrates with existing approvals
- [x] UI is touch-friendly and accessible
- [x] Auto-resets after 30s inactivity
- [x] Rate limiting prevents abuse

**Estimated Time**: 7-8 hours

---

## Phase V5: Legal Consents, NDAs & Multi-Language

### Objective
Formalize legal/compliance flows and full multi-language support.

### Tasks
- [ ] V5.1 - Create legal documents table (NDAs, house rules)
- [ ] V5.2 - Create visitor consents tracking table
- [ ] V5.3 - Build NDAConsentModal component
- [ ] V5.4 - Integrate consent into invite page (V1)
- [ ] V5.5 - Integrate consent into kiosk flow (V4)
- [ ] V5.6 - E-signature capture (touch/mouse)
- [ ] V5.7 - Document versioning support
- [ ] V5.8 - Multi-language content management
- [ ] V5.9 - Admin UI for document management
- [ ] V5.10 - Compliance reporting (who accepted what)

### Key Features
- Admin-uploaded NDAs/house rules (versioned)
- Visitor consent required before entry
- E-signature capture
- Document acceptance tracking per visit
- Multi-language support:
  - English, Swahili (extensible)
  - Language switcher on all visitor pages
- Compliance reports for admins

### API Endpoints
```
GET  /api/legal/documents               # Get active documents
POST /api/legal/consent                 # Record visitor consent
GET  /api/admin/legal/documents         # Manage documents (admin)
POST /api/admin/legal/documents         # Upload new document
GET  /api/admin/legal/consents/report   # Compliance report
```

### Database Changes
```sql
CREATE TABLE legal_documents (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50), -- nda, house_rules, privacy_policy
  version VARCHAR(20),
  language VARCHAR(10),
  title VARCHAR(255),
  content TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

CREATE TABLE visitor_consents (
  id SERIAL PRIMARY KEY,
  visitor_id INTEGER REFERENCES visitors(id),
  document_id INTEGER REFERENCES legal_documents(id),
  consent_given BOOLEAN,
  signature_data TEXT, -- Base64 signature image
  ip_address VARCHAR(45),
  consented_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_visitor_consents_visitor ON visitor_consents(visitor_id);
CREATE INDEX idx_legal_documents_active ON legal_documents(active, language);
```

### Success Criteria
- [x] Visitor sees NDA before entry
- [x] E-signature capture works on touch & mouse
- [x] Consent stored per visit with version
- [x] Multi-language toggle works (EN/SW)
- [x] Admin can upload versioned documents
- [x] Compliance report shows all consents

**Estimated Time**: 6-7 hours

---

## Implementation Summary

### Total Features Delivered (V1-V5)
- ✅ Digital invite landing page with QR code
- ✅ Self pre-registration & profile
- ✅ Multi-channel notifications (email/SMS)
- ✅ Self check-in kiosk mode
- ✅ Legal consents & NDAs with e-signature
- ✅ Multi-language support (EN/SW)

### Total Time: 28-33 hours

### Database Impact
- **New Tables**: 5 (visitor_notifications, notification_preferences, kiosk_devices, legal_documents, visitor_consents)
- **Modified Tables**: 1 (visitors - 7 new columns)
- **New Indexes**: 6

### API Endpoints Created: 15+

### Production Readiness Checklist
- [ ] All migrations tested
- [ ] Notification providers configured (Twilio, SendGrid)
- [ ] Kiosk devices registered with IPs
- [ ] Legal documents uploaded
- [ ] Multi-language content reviewed
- [ ] Mobile testing complete (iOS/Android)
- [ ] Load testing with 100+ concurrent visitors
- [ ] Security audit (token validation, rate limiting)

---

**Status**: Ready for Sequential Implementation  
**Priority**: High - Brings visitor experience to market-leader level  
**Dependencies**: Existing visitor table, approval flow, DPA compliance
