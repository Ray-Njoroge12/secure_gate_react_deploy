-- Event Management Migration
-- Phase 4.1: Events, bulk invitations, and event-specific visitor passes
-- Date: 2025-12-31

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100) CHECK (event_type IN (
    'party', 'corporate', 'wedding', 'conference', 'community', 'sports', 'other'
  )),
  location VARCHAR(255),
  location_details TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  check_in_window_start TIMESTAMP,
  check_in_window_end TIMESTAMP,
  max_capacity INTEGER,
  current_attendance INTEGER DEFAULT 0,
  dress_code VARCHAR(100),
  parking_instructions TEXT,
  special_instructions TEXT,
  host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  estate_id INTEGER REFERENCES estates(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'ongoing', 'completed', 'cancelled'
  )),
  registration_deadline TIMESTAMP,
  requires_approval BOOLEAN DEFAULT false,
  allow_plus_one BOOLEAN DEFAULT false,
  send_reminders BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24,
  qr_code_prefix VARCHAR(50),
  custom_fields JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_estate_id ON events(estate_id);
CREATE INDEX IF NOT EXISTS idx_events_host_id ON events(host_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_estate_status ON events(estate_id, status);

COMMENT ON TABLE events IS 'Events with bulk invitation capabilities';
COMMENT ON COLUMN events.event_type IS 'Type: party, corporate, wedding, conference, community, sports, other';
COMMENT ON COLUMN events.status IS 'Status: draft, published, ongoing, completed, cancelled';
COMMENT ON COLUMN events.qr_code_prefix IS 'Prefix for event-specific QR codes (e.g., EVENT-2024-XMAS)';
COMMENT ON COLUMN events.custom_fields IS 'Additional custom fields for event-specific data';
COMMENT ON COLUMN events.metadata IS 'Event metadata (analytics, source, etc.)';

-- ============================================================================
-- EVENT VISITORS (Junction Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_visitors (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,

  -- Visitor details (for bulk import before visitor record creation)
  visitor_name VARCHAR(255),
  visitor_email VARCHAR(255),
  visitor_phone VARCHAR(50),

  -- Event-specific details
  invitation_status VARCHAR(50) DEFAULT 'pending' CHECK (invitation_status IN (
    'pending', 'invited', 'confirmed', 'declined', 'cancelled'
  )),
  rsvp_status VARCHAR(50) CHECK (rsvp_status IN (
    'pending', 'attending', 'not_attending', 'maybe'
  )),
  rsvp_date TIMESTAMP,
  plus_one_count INTEGER DEFAULT 0,
  plus_one_names TEXT,

  -- Check-in details
  checked_in BOOLEAN DEFAULT false,
  check_in_time TIMESTAMP,
  checked_out BOOLEAN DEFAULT false,
  check_out_time TIMESTAMP,

  -- Event-specific QR code
  event_qr_code VARCHAR(255) UNIQUE,
  qr_code_url TEXT,

  -- Communication
  invitation_sent_at TIMESTAMP,
  reminder_sent_at TIMESTAMP,
  custom_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(event_id, visitor_id)
);

-- Indexes for event_visitors
CREATE INDEX IF NOT EXISTS idx_event_visitors_event_id ON event_visitors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_visitors_visitor_id ON event_visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_event_visitors_email ON event_visitors(visitor_email);
CREATE INDEX IF NOT EXISTS idx_event_visitors_qr_code ON event_visitors(event_qr_code);
CREATE INDEX IF NOT EXISTS idx_event_visitors_invitation_status ON event_visitors(invitation_status);
CREATE INDEX IF NOT EXISTS idx_event_visitors_rsvp_status ON event_visitors(rsvp_status);
CREATE INDEX IF NOT EXISTS idx_event_visitors_checked_in ON event_visitors(checked_in);
CREATE INDEX IF NOT EXISTS idx_event_visitors_event_status ON event_visitors(event_id, invitation_status);

COMMENT ON TABLE event_visitors IS 'Event invitations and attendee tracking';
COMMENT ON COLUMN event_visitors.invitation_status IS 'Invitation: pending, invited, confirmed, declined, cancelled';
COMMENT ON COLUMN event_visitors.rsvp_status IS 'RSVP: pending, attending, not_attending, maybe';
COMMENT ON COLUMN event_visitors.event_qr_code IS 'Event-specific QR code (e.g., EVENT-XMAS-ABC123)';

-- ============================================================================
-- BULK INVITATION BATCHES
-- ============================================================================

CREATE TABLE IF NOT EXISTS bulk_invitation_batches (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  batch_name VARCHAR(255),
  total_invitations INTEGER NOT NULL,
  successful_invitations INTEGER DEFAULT 0,
  failed_invitations INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'processing' CHECK (status IN (
    'processing', 'completed', 'failed', 'partial'
  )),
  csv_filename VARCHAR(255),
  csv_data TEXT,
  error_log TEXT,
  processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for bulk invitation batches
CREATE INDEX IF NOT EXISTS idx_bulk_batches_event_id ON bulk_invitation_batches(event_id);
CREATE INDEX IF NOT EXISTS idx_bulk_batches_status ON bulk_invitation_batches(status);
CREATE INDEX IF NOT EXISTS idx_bulk_batches_started ON bulk_invitation_batches(started_at DESC);

COMMENT ON TABLE bulk_invitation_batches IS 'Bulk invitation import tracking';
COMMENT ON COLUMN bulk_invitation_batches.status IS 'Status: processing, completed, failed, partial';

-- ============================================================================
-- EVENT REMINDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_reminders (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_visitor_id INTEGER REFERENCES event_visitors(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) CHECK (reminder_type IN (
    'invitation', 'confirmation', 'reminder_24h', 'reminder_1h', 'thank_you'
  )),
  scheduled_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'failed', 'cancelled'
  )),
  notification_id INTEGER REFERENCES notifications(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for event reminders
CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_scheduled ON event_reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_event_reminders_status ON event_reminders(status);
CREATE INDEX IF NOT EXISTS idx_event_reminders_type ON event_reminders(reminder_type);

COMMENT ON TABLE event_reminders IS 'Scheduled reminders for events';
COMMENT ON COLUMN event_reminders.reminder_type IS 'Type: invitation, confirmation, reminder_24h, reminder_1h, thank_you';

-- ============================================================================
-- EVENT ANALYTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW event_analytics AS
SELECT
  e.id,
  e.name,
  e.event_type,
  e.start_date,
  e.end_date,
  e.status,
  e.max_capacity,
  e.current_attendance,

  -- Invitation statistics
  COUNT(ev.id) as total_invited,
  COUNT(CASE WHEN ev.invitation_status = 'confirmed' THEN 1 END) as confirmed_count,
  COUNT(CASE WHEN ev.invitation_status = 'declined' THEN 1 END) as declined_count,

  -- RSVP statistics
  COUNT(CASE WHEN ev.rsvp_status = 'attending' THEN 1 END) as rsvp_attending,
  COUNT(CASE WHEN ev.rsvp_status = 'not_attending' THEN 1 END) as rsvp_not_attending,
  COUNT(CASE WHEN ev.rsvp_status = 'maybe' THEN 1 END) as rsvp_maybe,

  -- Check-in statistics
  COUNT(CASE WHEN ev.checked_in = true THEN 1 END) as checked_in_count,
  COUNT(CASE WHEN ev.checked_out = true THEN 1 END) as checked_out_count,

  -- Plus ones
  SUM(ev.plus_one_count) as total_plus_ones,

  -- Response rate
  ROUND(
    COUNT(CASE WHEN ev.rsvp_status IS NOT NULL AND ev.rsvp_status != 'pending' THEN 1 END)::numeric /
    NULLIF(COUNT(ev.id), 0) * 100,
    2
  ) as rsvp_response_rate,

  -- Attendance rate
  ROUND(
    COUNT(CASE WHEN ev.checked_in = true THEN 1 END)::numeric /
    NULLIF(COUNT(CASE WHEN ev.rsvp_status = 'attending' THEN 1 END), 0) * 100,
    2
  ) as attendance_rate

FROM events e
LEFT JOIN event_visitors ev ON e.id = ev.event_id
GROUP BY e.id, e.name, e.event_type, e.start_date, e.end_date, e.status, e.max_capacity, e.current_attendance;

COMMENT ON VIEW event_analytics IS 'Event analytics and statistics';

-- ============================================================================
-- UPCOMING EVENTS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW upcoming_events AS
SELECT
  e.*,
  u.name as host_name,
  u.email as host_email,
  COUNT(ev.id) as total_invitations,
  COUNT(CASE WHEN ev.rsvp_status = 'attending' THEN 1 END) as expected_attendees,
  COUNT(CASE WHEN ev.checked_in = true THEN 1 END) as current_attendees
FROM events e
LEFT JOIN users u ON e.host_id = u.id
LEFT JOIN event_visitors ev ON e.id = ev.event_id
WHERE e.start_date >= NOW()
AND e.status IN ('published', 'ongoing')
GROUP BY e.id, u.name, u.email
ORDER BY e.start_date ASC;

COMMENT ON VIEW upcoming_events IS 'Upcoming events with attendee counts';

-- ============================================================================
-- EVENT CHECK-IN QUEUE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW event_checkin_queue AS
SELECT
  e.id as event_id,
  e.name as event_name,
  e.start_date,
  ev.id as event_visitor_id,
  ev.visitor_name,
  ev.visitor_email,
  ev.visitor_phone,
  ev.rsvp_status,
  ev.plus_one_count,
  ev.event_qr_code,
  ev.checked_in,
  ev.check_in_time
FROM events e
INNER JOIN event_visitors ev ON e.id = ev.event_id
WHERE e.status = 'ongoing'
AND ev.rsvp_status = 'attending'
AND ev.checked_in = false
ORDER BY e.start_date, ev.visitor_name;

COMMENT ON VIEW event_checkin_queue IS 'Visitors expected to check in for ongoing events';

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
BEGIN
    -- Check tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'events',
        'event_visitors',
        'bulk_invitation_batches',
        'event_reminders'
    );

    RAISE NOTICE 'Event management tables created: %', table_count;

    -- Check views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name IN (
        'event_analytics',
        'upcoming_events',
        'event_checkin_queue'
    );

    RAISE NOTICE 'Event analytics views created: %', view_count;
END $$;

-- Show table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'event%' OR tablename LIKE 'bulk_%')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

RAISE NOTICE '✅ Event management tables migration complete!';
RAISE NOTICE '📊 Tables: events, event_visitors, bulk_invitation_batches, event_reminders';
RAISE NOTICE '📈 Views: event_analytics, upcoming_events, event_checkin_queue';
RAISE NOTICE '🎫 Features: Event management, bulk invitations, RSVP tracking, event check-ins';
