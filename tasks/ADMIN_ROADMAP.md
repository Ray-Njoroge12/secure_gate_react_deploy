# Admin Improvement Roadmap (A0-A5)

**Objective**: Transform admin experience from basic management to enterprise-grade operations console

**Status**: Ready for Implementation  
**Estimated Total Time**: 25-30 hours  
**Priority**: Critical (A0), High (A1-A5)

---

## Phase A0: Admin Ops Hardening & Security (CRITICAL)

### Objective
Fix infrastructure and security gaps that affect all users before adding new features.

### Tasks
- [ ] A0.1 - Configure HTTPS-only on load balancer (no HTTP)
- [ ] A0.2 - Audit and remove all localStorage token usage
- [ ] A0.3 - Migrate secrets to AWS Secrets Manager (or equivalent)
- [ ] A0.4 - Remove production console.log statements
- [ ] A0.5 - Tighten CORS policy (specific origins)
- [ ] A0.6 - Add security headers (CSP, HSTS, X-Frame-Options)
- [ ] A0.7 - Remove X-Powered-By header
- [ ] A0.8 - Update vulnerable npm dependencies
- [ ] A0.9 - Implement environment-based config (dev/staging/prod)
- [ ] A0.10 - Security audit and penetration testing

### Key Security Fixes
1. **HTTPS Only**:
   - Configure AWS ALB listener (HTTPS on 443)
   - Redirect HTTP → HTTPS
   - Update Netlify frontend to HTTPS
   
2. **Token Storage**:
   - Grep entire codebase for `localStorage.getItem('token')`
   - Replace with httpOnly cookie access patterns
   - Test all auth flows

3. **Secrets Management**:
   - Move from `.env` to AWS Secrets Manager
   - Update connection strings to fetch secrets at runtime
   - Rotate JWT secrets

4. **Code Quality**:
   - Remove all `console.log` in production paths
   - Add proper logger calls
   - Implement log levels (error, warn, info, debug)

5. **Headers & CORS**:
   - Set strict CORS (only frontend origin)
   - Add CSP, HSTS, X-Frame-Options
   - Remove X-Powered-By

### Success Criteria
- [x] All traffic uses HTTPS
- [x] Zero localStorage token references
- [x] All secrets in secure vault
- [x] Zero console.log in production
- [x] Security headers present (verified with securityheaders.com)
- [x] npm audit shows 0 high/critical vulnerabilities
- [x] OWASP Top 10 compliance: 9/10+

**Estimated Time**: 8-10 hours  
**Priority**: CRITICAL - Block all other work until complete

---

## Phase A1: Admin Operations & Analytics Dashboard

### Objective
Give admins a single pane of glass for all operational metrics.

### Tasks
- [ ] A1.1 - Create adminAnalyticsController.js
- [ ] A1.2 - Aggregate visitor volume queries
- [ ] A1.3 - Aggregate incident queries (reuse G4 data)
- [ ] A1.4 - Aggregate approval time statistics
- [ ] A1.5 - Create AdminOperationsDashboard.jsx
- [ ] A1.6 - Add filter controls (date range, site, guard, resident)
- [ ] A1.7 - Create visualization components (charts)
- [ ] A1.8 - Add export functionality (CSV/PDF)
- [ ] A1.9 - Create AdminReports.jsx for scheduled reports
- [ ] A1.10 - Add route and navigation

### Key Features
- **Unified metrics dashboard**:
  - Total visitors (today, week, month)
  - Average approval time
  - Incident count by severity
  - Peak hours chart
  - Top residents by visitor volume
  - Guard performance metrics
  
- **Advanced filtering**:
  - Date range picker
  - Site/estate selector (future-proof)
  - Specific guard or resident
  
- **Export & Reports**:
  - Export to CSV
  - Generate PDF summary
  - Schedule weekly/monthly reports (email)

### API Endpoints
```
GET /api/admin/analytics/overview      # Dashboard summary
GET /api/admin/analytics/visitors      # Visitor metrics
GET /api/admin/analytics/incidents     # Incident metrics
GET /api/admin/analytics/guards        # Guard performance
GET /api/admin/analytics/residents     # Resident activity
POST /api/admin/reports/generate       # Generate report
GET /api/admin/reports/scheduled       # List scheduled reports
```

### Database Changes
```sql
CREATE TABLE scheduled_reports (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  report_type VARCHAR(50), -- daily, weekly, monthly
  recipients TEXT[], -- Array of emails
  filters JSONB, -- Stored filter state
  enabled BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run) WHERE enabled = TRUE;
```

### Success Criteria
- [x] Admin sees unified dashboard with all metrics
- [x] Filters work correctly (date, site, guard, resident)
- [x] Charts render correctly
- [x] CSV export works
- [x] Performance: <1s dashboard load

**Estimated Time**: 6-7 hours

---

## Phase A2: RBAC & Admin Role Refinement

### Objective
Implement granular role-based access control for different admin levels.

### Tasks
- [ ] A2.1 - Define role hierarchy and permissions matrix
- [ ] A2.2 - Create roles table and seed data
- [ ] A2.3 - Create permissions table
- [ ] A2.4 - Create role_permissions junction table
- [ ] A2.5 - Implement role middleware (requireRole, requirePermission)
- [ ] A2.6 - Update all protected routes with role checks
- [ ] A2.7 - Create RoleManagement.jsx admin UI
- [ ] A2.8 - Add role assignment UI
- [ ] A2.9 - Implement permission-based UI hiding
- [ ] A2.10 - Audit all role changes

### Role Hierarchy
```
1. super_admin       # Full system control
2. estate_admin      # Single estate management
3. security_lead     # Incidents, guard analytics, approvals
4. auditor           # Read-only access to logs/analytics
5. guard             # Existing (check-in, incidents)
6. resident          # Existing (invites, approvals)
```

### Permission Matrix
```
Permissions:
- system.manage          # super_admin only
- estate.manage          # super_admin, estate_admin
- users.manage           # super_admin, estate_admin
- incidents.manage       # super_admin, security_lead
- visitors.view          # All roles
- visitors.manage        # super_admin, estate_admin, guard
- analytics.view         # super_admin, estate_admin, security_lead, auditor
- reports.generate       # super_admin, estate_admin, auditor
- audit_logs.view        # super_admin, auditor
```

### API Endpoints
```
GET  /api/admin/roles                  # List all roles
POST /api/admin/roles                  # Create role (super_admin)
GET  /api/admin/permissions            # List permissions
POST /api/admin/users/:id/assign-role  # Assign role to user
GET  /api/admin/users/:id/permissions  # Get user permissions
```

### Database Changes
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE,
  description TEXT,
  level INTEGER, -- Hierarchy level
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  description TEXT,
  resource VARCHAR(50),
  action VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Migrate existing role column
-- UPDATE users SET role_id = (SELECT id FROM roles WHERE name = role);
-- ALTER TABLE users DROP COLUMN role;
-- ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id);
```

### Success Criteria
- [x] All roles defined with clear permissions
- [x] Routes enforce role checks
- [x] UI hides unauthorized controls
- [x] Role assignments audited
- [x] Backward compatible with existing guard/resident roles

**Estimated Time**: 7-8 hours

---

## Phase A3: Policy Engine & Watchlists

### Objective
Enable admins to define rules that govern system behavior.

### Tasks
- [ ] A3.1 - Create policies table and model
- [ ] A3.2 - Implement policy evaluation engine
- [ ] A3.3 - Create PolicyManagement.jsx admin UI
- [ ] A3.4 - Integrate policies into invite creation
- [ ] A3.5 - Integrate policies into check-in flow
- [ ] A3.6 - Create watchlist table
- [ ] A3.7 - Implement watchlist matching logic
- [ ] A3.8 - Create WatchlistManagement.jsx admin UI
- [ ] A3.9 - Add watchlist alerts to guard UI
- [ ] A3.10 - Admin notifications for policy violations

### Policy Types
1. **Visitor Limits**:
   - Max visitors per unit per day
   - Max concurrent visitors per unit
   
2. **Time Restrictions**:
   - No visitors after certain hours (unless approved)
   - Blackout dates
   
3. **Approval Requirements**:
   - Require admin approval for contractors
   - Require NDA acceptance for certain visitor types
   
4. **Data Retention**:
   - Auto-delete visitor PII after X days
   - Archive old records
   
5. **Vehicle Rules**:
   - Require vehicle plate for all visitors
   - Restrict certain vehicle types

### Watchlist Features
- Flagged identities: name, phone, ID number, vehicle plate
- Match scoring (fuzzy match)
- Reason for flag + supporting documents
- Admin-only management
- Automatic alerts during check-in
- Audit trail of all matches

### API Endpoints
```
GET  /api/admin/policies               # List all policies
POST /api/admin/policies               # Create policy
PUT  /api/admin/policies/:id           # Update policy
DELETE /api/admin/policies/:id         # Delete policy
POST /api/admin/policies/evaluate      # Test policy against visitor

GET  /api/admin/watchlist              # List watchlist entries
POST /api/admin/watchlist              # Add entry
PUT  /api/admin/watchlist/:id          # Update entry
DELETE /api/admin/watchlist/:id        # Remove entry
POST /api/admin/watchlist/check        # Check visitor against watchlist
```

### Database Changes
```sql
CREATE TABLE policies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50), -- visitor_limit, time_restriction, approval_requirement, data_retention, vehicle_rule
  conditions JSONB, -- Policy rules in JSON
  actions JSONB, -- Actions to take if policy matches
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE watchlist_entries (
  id SERIAL PRIMARY KEY,
  entry_type VARCHAR(50), -- person, vehicle
  name VARCHAR(255),
  phone VARCHAR(20),
  id_number VARCHAR(50),
  vehicle_plate VARCHAR(20),
  reason TEXT,
  severity VARCHAR(20), -- low, medium, high, critical
  supporting_docs TEXT[], -- URLs to documents
  active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE watchlist_matches (
  id SERIAL PRIMARY KEY,
  watchlist_entry_id INTEGER REFERENCES watchlist_entries(id),
  visitor_id INTEGER REFERENCES visitors(id),
  match_score DECIMAL(5,2), -- 0.00 to 100.00
  matched_fields TEXT[], -- ['name', 'phone']
  guard_notified BOOLEAN DEFAULT FALSE,
  admin_notified BOOLEAN DEFAULT FALSE,
  action_taken VARCHAR(50), -- allowed, denied, escalated
  matched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_policies_enabled ON policies(enabled);
CREATE INDEX idx_watchlist_active ON watchlist_entries(active);
CREATE INDEX idx_watchlist_matches_visitor ON watchlist_matches(visitor_id);
```

### Success Criteria
- [x] Admins can create/edit/delete policies
- [x] Policies evaluated during invite creation and check-in
- [x] Watchlist entries can be managed
- [x] Guards receive alerts on watchlist matches
- [x] Policy violations logged to audit trail
- [x] UI prevents policy violations (e.g., "Max visitors reached")

**Estimated Time**: 8-9 hours

---

## Phase A4: Incident Workflow & Escalations

### Objective
Transform incidents into a complete operational workflow with escalations.

### Tasks
- [ ] A4.1 - Add incident status field (open, under_review, escalated, closed)
- [ ] A4.2 - Create incident assignment system
- [ ] A4.3 - Create incident comments/notes table
- [ ] A4.4 - Build IncidentWorkflowDashboard.jsx
- [ ] A4.5 - Add incident queue views (open, critical, assigned to me)
- [ ] A4.6 - Create IncidentDetailView.jsx with comment thread
- [ ] A4.7 - Implement incident assignment UI
- [ ] A4.8 - Add incident escalation flow
- [ ] A4.9 - Create incident notifications (Slack/Teams webhooks)
- [ ] A4.10 - Build incident export/reporting

### Incident Workflow States
```
open → under_review → escalated → closed
                   ↘ closed
```

### Key Features
- **Incident Queue Views**:
  - All Open Incidents
  - Critical Incidents
  - Assigned to Me
  - Recently Closed
  
- **Incident Detail Page**:
  - Full incident details
  - Comment thread (internal notes)
  - Assignment controls
  - Status change buttons
  - Escalation flow
  - Related visitors/incidents
  
- **Notifications**:
  - Email on assignment
  - Slack/Teams webhook on critical incidents
  - Daily digest of open incidents
  
- **Reporting**:
  - Export incidents by date range
  - Incident trends over time
  - Resolution time metrics

### API Endpoints
```
PUT  /api/admin/incidents/:id/status       # Change status
POST /api/admin/incidents/:id/assign       # Assign to user
POST /api/admin/incidents/:id/escalate     # Escalate incident
GET  /api/admin/incidents/:id/comments     # Get comments
POST /api/admin/incidents/:id/comments     # Add comment
GET  /api/admin/incidents/queue            # Queue views
POST /api/admin/incidents/export           # Export incidents
```

### Database Changes
```sql
ALTER TABLE incidents ADD COLUMN status VARCHAR(20) DEFAULT 'open'; -- open, under_review, escalated, closed
ALTER TABLE incidents ADD COLUMN assigned_to INTEGER REFERENCES users(id);
ALTER TABLE incidents ADD COLUMN assigned_at TIMESTAMP;
ALTER TABLE incidents ADD COLUMN escalated_to INTEGER REFERENCES users(id);
ALTER TABLE incidents ADD COLUMN escalated_at TIMESTAMP;
ALTER TABLE incidents ADD COLUMN closed_at TIMESTAMP;

CREATE TABLE incident_comments (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  comment TEXT,
  internal BOOLEAN DEFAULT TRUE, -- Internal notes vs external
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE incident_notifications (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id),
  notification_type VARCHAR(50), -- email, slack, teams
  recipient VARCHAR(255),
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) -- sent, failed
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX idx_incident_comments_incident ON incident_comments(incident_id);
```

### Success Criteria
- [x] Incidents can be assigned to specific admins
- [x] Status workflow enforced
- [x] Comment threads work
- [x] Escalation flow functional
- [x] Notifications sent on critical incidents
- [x] Incident export generates correct reports

**Estimated Time**: 7-8 hours

---

## Phase A5: Multi-Site, Integrations & Automation

### Objective
Prepare for multi-estate deployments and ecosystem integration.

### Tasks
- [ ] A5.1 - Create sites/estates table
- [ ] A5.2 - Add site_id to visitors, incidents, users, policies
- [ ] A5.3 - Create site switching UI
- [ ] A5.4 - Implement site-level permissions
- [ ] A5.5 - Create webhook configuration table
- [ ] A5.6 - Implement webhook dispatcher
- [ ] A5.7 - Create IntegrationSettings.jsx admin UI
- [ ] A5.8 - Add Slack webhook integration
- [ ] A5.9 - Add Teams webhook integration
- [ ] A5.10 - Create automation rules engine
- [ ] A5.11 - Build AutomationRules.jsx UI
- [ ] A5.12 - Implement scheduled jobs (report generation)

### Multi-Site Support
- Site hierarchy:
  - Organization → Estates → Blocks → Units
- Site-specific:
  - Branding (logo, colors)
  - Policies
  - Guards/admins
  - Visitors
  
- Site switcher in admin UI

### Integrations
1. **Webhooks**:
   - visitor.approved → notify Slack channel
   - incident.created (critical) → alert Teams
   - visitor.checked_in → update external CRM
   
2. **Scheduled Jobs**:
   - Weekly reports (auto-generate and email)
   - Daily visitor digest
   - Monthly compliance reports
   
3. **API Keys**:
   - Generate API keys for external systems
   - Rate limiting per API key
   - Usage tracking

### Automation Rules
```
IF incident.severity = 'critical' AND incident.category = 'suspicious'
THEN notify security_lead via email AND notify Slack channel #security
```

### API Endpoints
```
GET  /api/admin/sites                  # List sites
POST /api/admin/sites                  # Create site
PUT  /api/admin/sites/:id              # Update site
GET  /api/admin/sites/:id/switch       # Switch context to site

GET  /api/admin/webhooks               # List webhook configs
POST /api/admin/webhooks               # Create webhook
DELETE /api/admin/webhooks/:id         # Delete webhook
POST /api/admin/webhooks/test          # Test webhook

GET  /api/admin/automations            # List automation rules
POST /api/admin/automations            # Create rule
PUT  /api/admin/automations/:id        # Update rule
DELETE /api/admin/automations/:id      # Delete rule

GET  /api/admin/api-keys               # List API keys
POST /api/admin/api-keys               # Generate key
DELETE /api/admin/api-keys/:id         # Revoke key
```

### Database Changes
```sql
CREATE TABLE sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  code VARCHAR(50) UNIQUE,
  address TEXT,
  timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
  logo_url VARCHAR(500),
  primary_color VARCHAR(7),
  settings JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN site_id INTEGER REFERENCES sites(id);
ALTER TABLE visitors ADD COLUMN site_id INTEGER REFERENCES sites(id);
ALTER TABLE incidents ADD COLUMN site_id INTEGER REFERENCES sites(id);
ALTER TABLE policies ADD COLUMN site_id INTEGER REFERENCES sites(id);

CREATE TABLE webhooks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  url VARCHAR(500),
  event_type VARCHAR(50), -- visitor.approved, incident.created, etc.
  headers JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  site_id INTEGER REFERENCES sites(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE automation_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  trigger_event VARCHAR(50),
  conditions JSONB,
  actions JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  site_id INTEGER REFERENCES sites(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  key_hash VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  permissions TEXT[],
  rate_limit INTEGER DEFAULT 100, -- per hour
  site_id INTEGER REFERENCES sites(id),
  created_by INTEGER REFERENCES users(id),
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sites_active ON sites(active);
CREATE INDEX idx_webhooks_event ON webhooks(event_type) WHERE enabled = TRUE;
CREATE INDEX idx_automation_rules_trigger ON automation_rules(trigger_event) WHERE enabled = TRUE;
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

### Success Criteria
- [x] Multi-site support working (site switcher)
- [x] Webhooks successfully dispatch to Slack/Teams
- [x] Automation rules trigger correctly
- [x] Scheduled reports generate and email
- [x] API keys work with rate limiting
- [x] Site-level permissions enforced

**Estimated Time**: 10-12 hours

---

## Implementation Summary

### Total Features Delivered (A0-A5)
- ✅ Production-grade security (HTTPS, secrets management)
- ✅ Unified operations dashboard with analytics
- ✅ Granular RBAC with 6+ roles
- ✅ Policy engine for business rules
- ✅ Watchlist for security
- ✅ Complete incident workflow with escalations
- ✅ Multi-site support
- ✅ Webhooks & integrations (Slack/Teams)
- ✅ Automation rules engine
- ✅ API key management

### Total Time: 46-56 hours

### Database Impact
- **New Tables**: 15 (roles, permissions, role_permissions, user_roles, scheduled_reports, policies, watchlist_entries, watchlist_matches, incident_comments, incident_notifications, sites, webhooks, automation_rules, api_keys)
- **Modified Tables**: 4 (users, visitors, incidents, policies)
- **New Indexes**: 20+

### API Endpoints Created: 45+

### Production Readiness Checklist
- [ ] A0 security fixes completed and verified
- [ ] All migrations tested
- [ ] RBAC roles seeded
- [ ] Default policies configured
- [ ] Webhook endpoints tested
- [ ] Automation rules validated
- [ ] Load testing with 1000+ concurrent requests
- [ ] Security audit completed
- [ ] Compliance review (Kenya DPA)
- [ ] Documentation updated

---

**Status**: Ready for Sequential Implementation  
**Priority**: CRITICAL (A0), High (A1-A5)  
**Dependencies**: Existing admin dashboard, incidents (G4), analytics (G5), visitors table
