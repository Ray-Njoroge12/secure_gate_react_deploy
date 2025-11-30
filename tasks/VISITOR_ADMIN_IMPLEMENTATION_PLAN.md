# Visitor & Admin Implementation Plan

**Created**: November 20, 2025  
**Total Estimated Time**: 74-89 hours  
**Execution Order**: A0 → V1 → V2 → V3 → A1 → A2 → V4 → V5 → A3 → A4 → A5

---

## Execution Strategy

Following the "Zuckerberg" approach: **Move fast, ship incrementally, iterate based on data**.

### Phase Grouping

**Group 1: Foundation (A0)** - Must complete first
- A0: Security hardening (8-10 hours)

**Group 2: Visitor Self-Service (V1-V3)** - High user impact
- V1: Digital invite landing (4-5 hours)
- V2: Self pre-registration (5-6 hours)
- V3: Notifications (6-7 hours)

**Group 3: Admin Visibility (A1-A2)** - Admin empowerment
- A1: Operations dashboard (6-7 hours)
- A2: RBAC implementation (7-8 hours)

**Group 4: Advanced Visitor (V4-V5)** - Enterprise features
- V4: Kiosk mode (7-8 hours)
- V5: Legal consents & multi-language (6-7 hours)

**Group 5: Admin Intelligence (A3-A5)** - Automation & scale
- A3: Policy engine & watchlists (8-9 hours)
- A4: Incident workflows (7-8 hours)
- A5: Multi-site & integrations (10-12 hours)

---

## Detailed Implementation Checklist

### ✅ Phase A0: Security Hardening (CRITICAL - DO FIRST)

**Objective**: Fix all security gaps before adding features

**Time**: 8-10 hours  
**Blocking**: All other work

#### Tasks
- [ ] A0.1 - HTTPS configuration on load balancer
  - [ ] Configure AWS ALB HTTPS listener
  - [ ] Add SSL certificate
  - [ ] Redirect HTTP → HTTPS
  - [ ] Update frontend URLs to HTTPS
  - [ ] Test all endpoints over HTTPS
  
- [ ] A0.2 - Remove localStorage token usage
  - [ ] Grep entire codebase: `localStorage.getItem('token')`
  - [ ] Grep: `localStorage.setItem('token')`
  - [ ] Replace with httpOnly cookie patterns
  - [ ] Test auth flows (login, logout, refresh)
  - [ ] Test across all user types (resident, guard, admin)
  
- [ ] A0.3 - Secrets management
  - [ ] Set up AWS Secrets Manager (or HashiCorp Vault)
  - [ ] Migrate JWT_SECRET
  - [ ] Migrate DB credentials
  - [ ] Migrate Redis password
  - [ ] Migrate API keys (SendGrid, Twilio)
  - [ ] Update server startup to fetch secrets
  - [ ] Rotate all secrets
  
- [ ] A0.4 - Remove console.log statements
  - [ ] Grep: `console.log`
  - [ ] Grep: `console.error` (replace with logger)
  - [ ] Grep: `console.warn`
  - [ ] Verify logger is used throughout
  
- [ ] A0.5 - CORS hardening
  - [ ] Set specific frontend origin (not '*')
  - [ ] Remove credentials: true for public endpoints
  - [ ] Test cross-origin requests
  
- [ ] A0.6 - Security headers
  - [ ] Add helmet middleware
  - [ ] Configure CSP
  - [ ] Add HSTS
  - [ ] Add X-Frame-Options
  - [ ] Test with securityheaders.com
  
- [ ] A0.7 - Remove X-Powered-By
  - [ ] Disable Express header
  - [ ] Verify with curl
  
- [ ] A0.8 - Update dependencies
  - [ ] Run npm audit
  - [ ] Update vulnerable packages
  - [ ] Test after updates
  - [ ] Rerun npm audit (target: 0 high/critical)
  
- [ ] A0.9 - Environment config
  - [ ] Create separate configs (dev/staging/prod)
  - [ ] Use NODE_ENV checks
  - [ ] Document environment variables
  
- [ ] A0.10 - Security audit
  - [ ] Run OWASP ZAP scan
  - [ ] Manual penetration testing
  - [ ] Fix any findings

**Success Criteria**:
- [ ] All traffic HTTPS
- [ ] Zero localStorage tokens
- [ ] All secrets in vault
- [ ] Zero console.log in production
- [ ] npm audit clean
- [ ] OWASP Top 10: 9/10+

---

### Phase V1: Visitor Invite Landing & Digital Pass

**Time**: 4-5 hours

#### Backend Tasks
- [ ] V1.1 - Generate visitor tokens
  - [ ] Add `visitor_token` column to visitors table
  - [ ] Create token generation function (UUID)
  - [ ] Generate token on invite creation
  - [ ] Add unique index on visitor_token
  
- [ ] V1.2 - Token endpoint
  - [ ] Create `GET /api/visitors/by-token/:token`
  - [ ] Validate token format
  - [ ] Return visitor details (sanitized)
  - [ ] Include live status
  - [ ] Rate limit (10 req/min per IP)

#### Frontend Tasks
- [ ] V1.3 - VisitorInvitePage component
  - [ ] Create public route `/v/:token`
  - [ ] Fetch visitor data by token
  - [ ] Display visit details
  - [ ] Show status badge (pending/approved/rejected)
  - [ ] Loading states
  - [ ] Error handling (invalid token)
  
- [ ] V1.4 - QR code display
  - [ ] Install qrcode.react
  - [ ] Generate QR from invite code
  - [ ] Responsive sizing
  - [ ] Download QR button
  
- [ ] V1.5 - Live status updates
  - [ ] Poll for status changes (every 10s)
  - [ ] Or implement SSE for real-time
  - [ ] Update UI on status change
  
- [ ] V1.6 - Gate directions
  - [ ] Display estate address
  - [ ] Gate number/name
  - [ ] Parking instructions
  - [ ] Contact info
  
- [ ] V1.7 - Mobile responsive
  - [ ] Test on iOS Safari
  - [ ] Test on Android Chrome
  - [ ] Touch-friendly buttons
  
- [ ] V1.8 - Token in invite flow
  - [ ] Update invite creation to include token
  - [ ] Email/SMS includes token URL
  - [ ] Test end-to-end

**Success Criteria**:
- [ ] Visitor can access invite via link
- [ ] QR displays correctly
- [ ] Status updates in real-time
- [ ] Works on all mobile devices
- [ ] Page loads <1s

---

### Phase V2: Self Pre-Registration & Profile

**Time**: 5-6 hours

#### Backend Tasks
- [ ] V2.1 - Self-update endpoint
  - [ ] Create `PUT /api/visitors/:id/self-update`
  - [ ] Validate token ownership
  - [ ] Allow updates: name, phone, email, company, vehicle
  - [ ] Optional photo upload
  - [ ] Return updated visitor
  
- [ ] V2.2 - Photo upload
  - [ ] Add photo storage (S3 or local)
  - [ ] Validate file type (JPEG, PNG)
  - [ ] Max 5MB
  - [ ] Resize/compress
  - [ ] Store photo_url
  
- [ ] V2.3 - Visitor profile check
  - [ ] Create `GET /api/visitors/profile/:identifier`
  - [ ] Match by phone or email
  - [ ] Return profile hash
  - [ ] Privacy: only return if visitor opts in

#### Frontend Tasks
- [ ] V2.4 - Pre-registration form
  - [ ] Create VisitorPreRegForm component
  - [ ] Editable fields
  - [ ] Validation (phone format, email format)
  - [ ] Photo upload UI
  - [ ] Consent checkbox
  
- [ ] V2.5 - Integrate into invite page
  - [ ] Add "Complete Your Details" section
  - [ ] Show form if not self_registered
  - [ ] Hide form after submission
  - [ ] Success message
  
- [ ] V2.6 - Returning visitor detection
  - [ ] Check profile on page load
  - [ ] Show "Welcome back" message
  - [ ] Auto-fill previous details
  - [ ] Allow edits
  
- [ ] V2.7 - Form validation
  - [ ] Client-side validation
  - [ ] Error messages
  - [ ] Required field indicators
  
- [ ] V2.8 - Privacy consent
  - [ ] Consent text
  - [ ] Link to privacy policy
  - [ ] Required checkbox
  - [ ] Store consent timestamp

**Success Criteria**:
- [ ] Visitor can update details
- [ ] Photo upload works
- [ ] Returning visitors recognized
- [ ] Validation prevents bad data
- [ ] Consent captured

---

### Phase V3: Visitor Notifications

**Time**: 6-7 hours

#### Backend Tasks
- [ ] V3.1 - Notification service
  - [ ] Create notificationService.js
  - [ ] Abstract provider interface
  - [ ] Queue support (optional: Bull/BullMQ)
  
- [ ] V3.2 - Email provider
  - [ ] Integrate SendGrid (or existing emailService)
  - [ ] Email templates (invite_created, approved, rejected, reminder)
  - [ ] HTML + plain text
  
- [ ] V3.3 - SMS provider
  - [ ] Integrate Twilio or Africa's Talking
  - [ ] SMS templates
  - [ ] Character limits
  
- [ ] V3.4 - Notification templates
  - [ ] English templates
  - [ ] Swahili templates
  - [ ] Template variables (name, date, gate, etc.)
  
- [ ] V3.5 - Trigger on approval
  - [ ] Hook into approval response
  - [ ] Send notification on status change
  - [ ] Log notification sent
  
- [ ] V3.6 - Trigger on invite creation
  - [ ] Hook into invite creation
  - [ ] Send invite notification
  - [ ] Include token URL
  
- [ ] V3.7 - Multi-language support
  - [ ] Language detection (from invite or preference)
  - [ ] Template selection by language
  
- [ ] V3.8 - Opt-out mechanism
  - [ ] Create preferences endpoint
  - [ ] Unsubscribe link in emails
  - [ ] Check opt-out before sending
  
- [ ] V3.9 - Admin config
  - [ ] Admin UI to toggle channels
  - [ ] Set default language
  - [ ] Test notification sending

#### Database
- [ ] Create visitor_notifications table
- [ ] Create notification_preferences table
- [ ] Add indexes

**Success Criteria**:
- [ ] Email sent on invite creation
- [ ] SMS sent on approval
- [ ] Templates in EN & SW
- [ ] Opt-out works
- [ ] Admin can configure

---

### Phase A1: Admin Operations Dashboard

**Time**: 6-7 hours

#### Backend Tasks
- [ ] A1.1 - Analytics controller
  - [ ] Create adminAnalyticsController.js
  - [ ] Aggregate visitor volume queries
  - [ ] Aggregate incident queries
  - [ ] Aggregate approval time stats
  - [ ] Peak hours query
  - [ ] Top residents query
  - [ ] Guard performance query
  
- [ ] A1.2 - Reports controller
  - [ ] Create reportsController.js
  - [ ] Generate CSV export
  - [ ] Generate PDF report
  - [ ] Schedule report generation
  
- [ ] A1.3 - Scheduled reports
  - [ ] Create scheduled_reports table
  - [ ] Cron job for report generation
  - [ ] Email delivery

#### Frontend Tasks
- [ ] A1.4 - Operations dashboard
  - [ ] Create AdminOperationsDashboard.jsx
  - [ ] Fetch analytics data
  - [ ] Display KPI cards
  - [ ] Charts (visitor volume, incidents, peak hours)
  
- [ ] A1.5 - Filter controls
  - [ ] Date range picker
  - [ ] Site selector (future-proof)
  - [ ] Guard filter
  - [ ] Resident filter
  
- [ ] A1.6 - Visualization
  - [ ] Install chart library (recharts or chart.js)
  - [ ] Line chart for trends
  - [ ] Bar chart for peak hours
  - [ ] Pie chart for incidents
  
- [ ] A1.7 - Export functionality
  - [ ] Export to CSV button
  - [ ] Generate PDF button
  - [ ] Download triggers
  
- [ ] A1.8 - Reports management
  - [ ] Create AdminReports.jsx
  - [ ] List scheduled reports
  - [ ] Create new report schedule
  - [ ] Edit/delete schedules
  
- [ ] A1.9 - Route & navigation
  - [ ] Add route `/dashboard/admin/operations`
  - [ ] Add nav link
  - [ ] Test admin-only access

**Success Criteria**:
- [ ] Dashboard shows all metrics
- [ ] Filters work correctly
- [ ] Charts render properly
- [ ] CSV export functional
- [ ] Performance <1s load

---

### Phase A2: RBAC & Role Refinement

**Time**: 7-8 hours

#### Database Tasks
- [ ] A2.1 - Create roles table
- [ ] A2.2 - Create permissions table
- [ ] A2.3 - Create role_permissions table
- [ ] A2.4 - Create user_roles table
- [ ] A2.5 - Seed default roles
- [ ] A2.6 - Seed permissions
- [ ] A2.7 - Migrate existing users

#### Backend Tasks
- [ ] A2.8 - Role middleware
  - [ ] requireRole([roles])
  - [ ] requirePermission(permission)
  - [ ] hasPermission(user, permission)
  
- [ ] A2.9 - Update routes
  - [ ] Apply role checks to all admin routes
  - [ ] Apply permission checks to sensitive operations
  - [ ] Test authorization
  
- [ ] A2.10 - Role management endpoints
  - [ ] GET /api/admin/roles
  - [ ] POST /api/admin/users/:id/assign-role
  - [ ] GET /api/admin/users/:id/permissions

#### Frontend Tasks
- [ ] A2.11 - Role management UI
  - [ ] Create RoleManagement.jsx
  - [ ] List all roles
  - [ ] View role permissions
  - [ ] Assign roles to users
  
- [ ] A2.12 - Permission-based UI
  - [ ] Hide unauthorized menu items
  - [ ] Hide unauthorized buttons
  - [ ] Show permission errors gracefully
  
- [ ] A2.13 - Audit role changes
  - [ ] Log all role assignments
  - [ ] Audit trail visible to super_admin

**Success Criteria**:
- [ ] All roles defined
- [ ] Routes enforce roles
- [ ] UI respects permissions
- [ ] Role changes audited
- [ ] Backward compatible

---

### Phase V4: Kiosk Mode

**Time**: 7-8 hours

#### Backend Tasks
- [ ] V4.1 - Kiosk routes
  - [ ] Create kioskController.js
  - [ ] POST /api/kiosk/check-in
  - [ ] GET /api/kiosk/search-resident
  - [ ] POST /api/kiosk/walk-in
  - [ ] IP allowlist middleware
  
- [ ] V4.2 - Kiosk config
  - [ ] Create kiosk_devices table
  - [ ] Admin endpoints for kiosk management
  - [ ] GET /api/admin/kiosk/config

#### Frontend Tasks
- [ ] V4.3 - Kiosk home
  - [ ] Create KioskHome.jsx
  - [ ] Two-button choice: "I have QR" / "I'm visiting"
  - [ ] Large touch-friendly UI
  - [ ] Auto-reset timer (30s inactivity)
  
- [ ] V4.4 - QR scan flow
  - [ ] Camera access (if available)
  - [ ] Manual code entry fallback
  - [ ] Validate QR/code
  - [ ] Call check-in endpoint
  - [ ] Success/error screens
  
- [ ] V4.5 - Walk-in flow
  - [ ] Resident search by name
  - [ ] Display search results
  - [ ] Select resident
  - [ ] Create walk-in visitor
  - [ ] Request approval
  - [ ] Show approval status
  
- [ ] V4.6 - Photo capture
  - [ ] Optional photo capture step
  - [ ] Camera UI
  - [ ] Preview & retake
  - [ ] Upload photo
  
- [ ] V4.7 - Kiosk styling
  - [ ] Large fonts
  - [ ] High contrast
  - [ ] Touch-optimized buttons (min 44x44px)
  - [ ] Accessibility (ARIA labels)
  
- [ ] V4.8 - Kiosk route
  - [ ] Add route `/kiosk`
  - [ ] Public route (no auth)
  - [ ] IP-restricted
  
- [ ] V4.9 - Kiosk admin
  - [ ] Admin UI to manage kiosks
  - [ ] Register new kiosk
  - [ ] View kiosk activity
  - [ ] Enable/disable kiosks

**Success Criteria**:
- [ ] Kiosk accessible from allowed IPs only
- [ ] QR flow works
- [ ] Walk-in flow functional
- [ ] UI is touch-friendly
- [ ] Auto-resets after 30s
- [ ] Rate limiting prevents abuse

---

### Phase V5: Legal Consents & Multi-Language

**Time**: 6-7 hours

#### Database Tasks
- [ ] V5.1 - Create legal_documents table
- [ ] V5.2 - Create visitor_consents table
- [ ] V5.3 - Add indexes

#### Backend Tasks
- [ ] V5.4 - Legal documents endpoints
  - [ ] GET /api/legal/documents (public, active docs)
  - [ ] POST /api/legal/consent (record consent)
  - [ ] GET /api/admin/legal/documents (admin)
  - [ ] POST /api/admin/legal/documents (upload)
  - [ ] PUT /api/admin/legal/documents/:id (update)
  
- [ ] V5.5 - Document versioning
  - [ ] Track version numbers
  - [ ] Mark old versions inactive
  - [ ] Link consents to versions

#### Frontend Tasks
- [ ] V5.6 - NDA consent modal
  - [ ] Create NDAConsentModal.jsx
  - [ ] Display document content
  - [ ] E-signature capture (canvas)
  - [ ] Consent checkbox
  - [ ] Submit consent
  
- [ ] V5.7 - Integrate into invite page
  - [ ] Show modal if NDA required
  - [ ] Block entry until consent given
  - [ ] Store consent with signature
  
- [ ] V5.8 - Integrate into kiosk
  - [ ] Show NDA on kiosk before check-in
  - [ ] Touch signature capture
  - [ ] Submit and continue
  
- [ ] V5.9 - Multi-language content
  - [ ] Language toggle component
  - [ ] Store language preference
  - [ ] Fetch content in selected language
  
- [ ] V5.10 - Admin document management
  - [ ] Create LegalDocumentsAdmin.jsx
  - [ ] Upload new documents
  - [ ] Mark documents active/inactive
  - [ ] View consent reports
  
- [ ] V5.11 - Compliance reporting
  - [ ] Admin page for consent report
  - [ ] Filter by date, document, visitor
  - [ ] Export consent log
  
- [ ] V5.12 - Multi-language UI
  - [ ] Translate all visitor-facing strings
  - [ ] English & Swahili
  - [ ] Language switcher on all pages

**Success Criteria**:
- [ ] Visitor sees NDA before entry
- [ ] E-signature works
- [ ] Consent stored with version
- [ ] Language toggle works (EN/SW)
- [ ] Admin can upload documents
- [ ] Compliance report accurate

---

### Phase A3: Policy Engine & Watchlists

**Time**: 8-9 hours

#### Database Tasks
- [ ] A3.1 - Create policies table
- [ ] A3.2 - Create watchlist_entries table
- [ ] A3.3 - Create watchlist_matches table
- [ ] A3.4 - Add indexes

#### Backend Tasks
- [ ] A3.5 - Policy engine
  - [ ] Create policyEngine.js
  - [ ] Evaluate policy conditions (JSONB queries)
  - [ ] Apply policy actions
  - [ ] Hook into invite creation
  - [ ] Hook into check-in flow
  
- [ ] A3.6 - Policy endpoints
  - [ ] GET /api/admin/policies
  - [ ] POST /api/admin/policies
  - [ ] PUT /api/admin/policies/:id
  - [ ] DELETE /api/admin/policies/:id
  - [ ] POST /api/admin/policies/evaluate
  
- [ ] A3.7 - Watchlist matching
  - [ ] Create watchlistMatcher.js
  - [ ] Fuzzy name matching
  - [ ] Phone/ID/vehicle exact match
  - [ ] Calculate match score
  - [ ] Log matches
  
- [ ] A3.8 - Watchlist endpoints
  - [ ] GET /api/admin/watchlist
  - [ ] POST /api/admin/watchlist
  - [ ] PUT /api/admin/watchlist/:id
  - [ ] DELETE /api/admin/watchlist/:id
  - [ ] POST /api/admin/watchlist/check

#### Frontend Tasks
- [ ] A3.9 - Policy management UI
  - [ ] Create PolicyManagement.jsx
  - [ ] List policies
  - [ ] Create policy form
  - [ ] Edit/delete policies
  - [ ] Toggle enabled/disabled
  
- [ ] A3.10 - Watchlist management UI
  - [ ] Create WatchlistManagement.jsx
  - [ ] List watchlist entries
  - [ ] Add entry form
  - [ ] Edit/delete entries
  - [ ] View match history
  
- [ ] A3.11 - Guard alerts
  - [ ] Show watchlist alert in guard UI
  - [ ] Display match details
  - [ ] Allow guard to proceed or deny
  
- [ ] A3.12 - Admin notifications
  - [ ] Email admin on watchlist match
  - [ ] Email admin on policy violation

**Success Criteria**:
- [ ] Policies can be created/edited
- [ ] Policies evaluated correctly
- [ ] Watchlist entries managed
- [ ] Guards alerted on matches
- [ ] Policy violations logged
- [ ] UI prevents violations

---

### Phase A4: Incident Workflow

**Time**: 7-8 hours

#### Database Tasks
- [ ] A4.1 - Add status to incidents
- [ ] A4.2 - Add assignment fields
- [ ] A4.3 - Create incident_comments table
- [ ] A4.4 - Create incident_notifications table
- [ ] A4.5 - Add indexes

#### Backend Tasks
- [ ] A4.6 - Update incident controller
  - [ ] PUT /api/admin/incidents/:id/status
  - [ ] POST /api/admin/incidents/:id/assign
  - [ ] POST /api/admin/incidents/:id/escalate
  - [ ] GET /api/admin/incidents/:id/comments
  - [ ] POST /api/admin/incidents/:id/comments
  - [ ] GET /api/admin/incidents/queue
  - [ ] POST /api/admin/incidents/export
  
- [ ] A4.7 - Notification service
  - [ ] Email on assignment
  - [ ] Slack webhook on critical
  - [ ] Teams webhook on escalation

#### Frontend Tasks
- [ ] A4.8 - Incident workflow dashboard
  - [ ] Create IncidentWorkflowDashboard.jsx
  - [ ] Queue views (Open, Critical, Assigned to Me)
  - [ ] Filters
  - [ ] Incident cards
  
- [ ] A4.9 - Incident detail view
  - [ ] Create IncidentDetailView.jsx
  - [ ] Full incident details
  - [ ] Comment thread
  - [ ] Status change buttons
  - [ ] Assignment controls
  - [ ] Escalation flow
  
- [ ] A4.10 - Comment system
  - [ ] Add comment form
  - [ ] Display comment thread
  - [ ] Internal vs external notes
  
- [ ] A4.11 - Export & reporting
  - [ ] Export incidents to CSV
  - [ ] Date range filter
  - [ ] Resolution time metrics

**Success Criteria**:
- [ ] Incidents assignable
- [ ] Status workflow works
- [ ] Comments functional
- [ ] Escalation works
- [ ] Notifications sent
- [ ] Export generates correct data

---

### Phase A5: Multi-Site & Integrations

**Time**: 10-12 hours

#### Database Tasks
- [ ] A5.1 - Create sites table
- [ ] A5.2 - Add site_id to relevant tables
- [ ] A5.3 - Create webhooks table
- [ ] A5.4 - Create automation_rules table
- [ ] A5.5 - Create api_keys table
- [ ] A5.6 - Add indexes

#### Backend Tasks
- [ ] A5.7 - Multi-site support
  - [ ] Site context middleware
  - [ ] Filter data by site_id
  - [ ] GET /api/admin/sites
  - [ ] POST /api/admin/sites
  - [ ] PUT /api/admin/sites/:id
  - [ ] GET /api/admin/sites/:id/switch
  
- [ ] A5.8 - Webhook dispatcher
  - [ ] Create webhookDispatcher.js
  - [ ] Event listeners
  - [ ] HTTP POST to webhook URLs
  - [ ] Retry logic
  - [ ] GET /api/admin/webhooks
  - [ ] POST /api/admin/webhooks
  - [ ] POST /api/admin/webhooks/test
  
- [ ] A5.9 - Automation engine
  - [ ] Create automationEngine.js
  - [ ] Evaluate trigger conditions
  - [ ] Execute actions
  - [ ] GET /api/admin/automations
  - [ ] POST /api/admin/automations
  
- [ ] A5.10 - API key management
  - [ ] Generate API keys
  - [ ] Hash and store
  - [ ] Rate limiting per key
  - [ ] GET /api/admin/api-keys
  - [ ] POST /api/admin/api-keys
  - [ ] DELETE /api/admin/api-keys/:id
  
- [ ] A5.11 - Scheduled jobs
  - [ ] Cron for weekly reports
  - [ ] Daily visitor digest
  - [ ] Monthly compliance reports

#### Frontend Tasks
- [ ] A5.12 - Site switcher
  - [ ] Site dropdown in admin nav
  - [ ] Switch site context
  - [ ] Filter data by site
  
- [ ] A5.13 - Site management UI
  - [ ] Create SiteManagement.jsx
  - [ ] List sites
  - [ ] Create/edit sites
  - [ ] Site settings (branding, timezone)
  
- [ ] A5.14 - Integration settings
  - [ ] Create IntegrationSettings.jsx
  - [ ] Configure Slack webhooks
  - [ ] Configure Teams webhooks
  - [ ] Test webhooks
  
- [ ] A5.15 - Automation rules UI
  - [ ] Create AutomationRules.jsx
  - [ ] List rules
  - [ ] Create rule form (trigger, conditions, actions)
  - [ ] Enable/disable rules
  
- [ ] A5.16 - API key management UI
  - [ ] Create APIKeyManagement.jsx
  - [ ] Generate new keys
  - [ ] List keys
  - [ ] Revoke keys
  - [ ] View usage stats

**Success Criteria**:
- [ ] Multi-site support working
- [ ] Webhooks dispatch to Slack/Teams
- [ ] Automation rules trigger
- [ ] Scheduled reports generate
- [ ] API keys work with rate limiting
- [ ] Site permissions enforced

---

## Testing Strategy

### Per Phase
- Unit tests for new controllers/services
- Integration tests for API endpoints
- E2E tests for critical flows
- Manual testing checklist

### Pre-Deployment
- Load testing (1000+ concurrent users)
- Security audit (OWASP ZAP)
- Browser compatibility (Chrome, Firefox, Safari, Edge)
- Mobile testing (iOS, Android)
- Accessibility testing (WCAG 2.1 AA)

---

## Documentation Updates

### Per Phase
- Update API documentation
- Update user guides
- Update admin guides
- Update security documentation

### Final
- Complete system architecture diagram
- Complete API reference
- Deployment guide
- Troubleshooting guide

---

## Risk Management

### High Risk Items
1. **A0 Security**: Must complete first, blocking risk
2. **Multi-site (A5)**: Data isolation critical
3. **Watchlist (A3)**: False positives could deny legitimate visitors
4. **Webhooks (A5)**: External dependencies, retry logic critical

### Mitigation
- Feature flags for gradual rollout
- Database backups before migrations
- Rollback plan for each phase
- Monitoring and alerting

---

## Success Metrics

### Visitor Experience
- Digital invite adoption: >80%
- Self pre-registration rate: >60%
- Average gate time: <2 minutes
- Visitor satisfaction: >4.5/5

### Admin Efficiency
- Time to generate report: <1 minute
- Incident resolution time: <24 hours (average)
- Policy violation rate: <5%
- Admin satisfaction: >4.5/5

### System Health
- API response time: p95 <500ms
- Uptime: >99.9%
- Error rate: <0.1%
- Security incidents: 0

---

**Created**: November 20, 2025  
**Status**: Ready for Execution  
**Next Step**: Begin A0 (Security Hardening)
