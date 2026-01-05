-- Guard Management Tables Migration
-- Phase 2.5: Complete guard management features
-- Date: 2025-12-30

-- ============================================================================
-- GUARD SHIFTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS guard_shifts (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_type VARCHAR(50) NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'night', 'weekend')),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  post_location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  handover_notes TEXT,
  estate_location_id INTEGER REFERENCES estate_locations(estate_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for guard shifts
CREATE INDEX IF NOT EXISTS idx_guard_shifts_guard_id ON guard_shifts(guard_id);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_status ON guard_shifts(status);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_start_time ON guard_shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_estate_location_id ON guard_shifts(estate_location_id);

COMMENT ON TABLE guard_shifts IS 'Guard shift schedules and tracking';
COMMENT ON COLUMN guard_shifts.shift_type IS 'Type of shift: morning, afternoon, night, weekend';
COMMENT ON COLUMN guard_shifts.status IS 'Shift status: scheduled, in_progress, completed, cancelled';

-- ============================================================================
-- GUARD HANDOVER NOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS guard_handover_notes (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES guard_shifts(id) ON DELETE CASCADE,
  from_guard_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_guard_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NOT NULL,
  incidents_summary TEXT,
  equipment_status TEXT,
  estate_location_id INTEGER REFERENCES estate_locations(estate_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for handover notes
CREATE INDEX IF NOT EXISTS idx_handover_notes_shift_id ON guard_handover_notes(shift_id);
CREATE INDEX IF NOT EXISTS idx_handover_notes_from_guard ON guard_handover_notes(from_guard_id);
CREATE INDEX IF NOT EXISTS idx_handover_notes_to_guard ON guard_handover_notes(to_guard_id);
CREATE INDEX IF NOT EXISTS idx_handover_notes_created ON guard_handover_notes(created_at DESC);

COMMENT ON TABLE guard_handover_notes IS 'Shift handover notes between guards';

-- ============================================================================
-- GUARD PERFORMANCE METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS guard_performance_metrics (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id INTEGER REFERENCES guard_shifts(id) ON DELETE SET NULL,
  metric_type VARCHAR(100) NOT NULL,
  rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
  notes TEXT,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMP DEFAULT NOW(),
  estate_location_id INTEGER REFERENCES estate_locations(estate_id) ON DELETE SET NULL
);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_guard_id ON guard_performance_metrics(guard_id);
CREATE INDEX IF NOT EXISTS idx_performance_shift_id ON guard_performance_metrics(shift_id);
CREATE INDEX IF NOT EXISTS idx_performance_recorded_at ON guard_performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metric_type ON guard_performance_metrics(metric_type);

COMMENT ON TABLE guard_performance_metrics IS 'Guard performance tracking and ratings';
COMMENT ON COLUMN guard_performance_metrics.rating IS 'Rating from 0.00 to 5.00';
COMMENT ON COLUMN guard_performance_metrics.metric_type IS 'Type of metric: punctuality, professionalism, incident_response, etc.';

-- ============================================================================
-- GUARD EQUIPMENT CHECKOUT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS guard_equipment_checkout (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id INTEGER REFERENCES guard_shifts(id) ON DELETE SET NULL,
  equipment_type VARCHAR(100) NOT NULL,
  equipment_id VARCHAR(255) NOT NULL,
  checkout_time TIMESTAMP DEFAULT NOW(),
  return_time TIMESTAMP,
  status VARCHAR(50) DEFAULT 'checked_out' CHECK (status IN ('checked_out', 'returned', 'lost', 'damaged')),
  return_condition VARCHAR(50),
  notes TEXT,
  return_notes TEXT,
  estate_location_id INTEGER REFERENCES estate_locations(estate_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for equipment checkout
CREATE INDEX IF NOT EXISTS idx_equipment_guard_id ON guard_equipment_checkout(guard_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON guard_equipment_checkout(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON guard_equipment_checkout(status);
CREATE INDEX IF NOT EXISTS idx_equipment_checkout_time ON guard_equipment_checkout(checkout_time DESC);

COMMENT ON TABLE guard_equipment_checkout IS 'Equipment checkout and return tracking';
COMMENT ON COLUMN guard_equipment_checkout.equipment_type IS 'Type: radio, flashlight, baton, first_aid, keys, tablet';
COMMENT ON COLUMN guard_equipment_checkout.return_condition IS 'Condition on return: good, fair, damaged, lost';

-- ============================================================================
-- GUARD TRAINING AND CERTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS guard_training (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  training_type VARCHAR(100) NOT NULL,
  training_name VARCHAR(255) NOT NULL,
  completion_date DATE NOT NULL,
  expiry_date DATE,
  certificate_number VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'renewed')),
  notes TEXT,
  estate_location_id INTEGER REFERENCES estate_locations(estate_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for training records
CREATE INDEX IF NOT EXISTS idx_training_guard_id ON guard_training(guard_id);
CREATE INDEX IF NOT EXISTS idx_training_type ON guard_training(training_type);
CREATE INDEX IF NOT EXISTS idx_training_status ON guard_training(status);
CREATE INDEX IF NOT EXISTS idx_training_expiry ON guard_training(expiry_date);
CREATE INDEX IF NOT EXISTS idx_training_completion ON guard_training(completion_date DESC);

COMMENT ON TABLE guard_training IS 'Guard training and certification records';
COMMENT ON COLUMN guard_training.training_type IS 'Type: security_basics, first_aid, fire_safety, customer_service, conflict_resolution, etc.';
COMMENT ON COLUMN guard_training.status IS 'active, expired, or renewed';

-- ============================================================================
-- GUARD INCIDENTS JUNCTION TABLE (Many-to-Many)
-- NOTE: incidents table doesn't exist yet, so we store incident_id as INTEGER without FK
-- ============================================================================
CREATE TABLE IF NOT EXISTS guard_incidents (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  incident_id INTEGER NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  UNIQUE(guard_id, incident_id)
);

-- Indexes for guard incidents
CREATE INDEX IF NOT EXISTS idx_guard_incidents_guard_id ON guard_incidents(guard_id);
CREATE INDEX IF NOT EXISTS idx_guard_incidents_incident_id ON guard_incidents(incident_id);
CREATE INDEX IF NOT EXISTS idx_guard_incidents_assigned ON guard_incidents(assigned_at DESC);

COMMENT ON TABLE guard_incidents IS 'Guard incident assignments (many-to-many relationship)';

-- ============================================================================
-- VERIFY TABLES CREATED
-- ============================================================================
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'guard_shifts',
        'guard_handover_notes',
        'guard_performance_metrics',
        'guard_equipment_checkout',
        'guard_training',
        'guard_incidents'
    );

    RAISE NOTICE 'Guard management tables created: %', table_count;
    RAISE NOTICE '✅ Guard management tables migration complete!';
    RAISE NOTICE '📊 Tables: guard_shifts, guard_handover_notes, guard_performance_metrics, guard_equipment_checkout, guard_training, guard_incidents';
    RAISE NOTICE '📈 Features: Shift scheduling, handover notes, performance tracking, equipment management, training records';
END $$;

-- Show table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'guard_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
