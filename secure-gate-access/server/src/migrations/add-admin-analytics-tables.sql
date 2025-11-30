-- Migration: Admin Analytics & Scheduled Reports
-- Phase A1: Admin Operations & Analytics Dashboard
-- Date: November 20, 2025

-- =============================================
-- Table: scheduled_reports
-- Stores configuration for automated report generation
-- =============================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id SERIAL PRIMARY KEY,
  
  -- Report configuration
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
  
  -- Data filters
  filters JSONB, -- Stored filter state { dateRange, siteId, guardId, etc. }
  
  -- Report format
  format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'csv', 'excel', 'both'
  include_charts BOOLEAN DEFAULT TRUE,
  
  -- Recipients
  recipients TEXT[] NOT NULL, -- Array of email addresses
  cc_recipients TEXT[], -- Optional CC list
  
  -- Scheduling
  frequency VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
  schedule_time TIME DEFAULT '08:00:00', -- Time of day to run
  schedule_day_of_week INTEGER, -- 1=Monday, 7=Sunday (for weekly)
  schedule_day_of_month INTEGER, -- 1-31 (for monthly)
  
  -- Status tracking
  enabled BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  last_run_status VARCHAR(20), -- 'success', 'failed', 'partial'
  last_run_error TEXT,
  next_run TIMESTAMP,
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: report_history
-- Tracks all generated reports
-- =============================================
CREATE TABLE IF NOT EXISTS report_history (
  id SERIAL PRIMARY KEY,
  
  -- Link to scheduled report (NULL for ad-hoc reports)
  scheduled_report_id INTEGER REFERENCES scheduled_reports(id) ON DELETE SET NULL,
  
  -- Report details
  report_name VARCHAR(255),
  report_type VARCHAR(50),
  format VARCHAR(20),
  
  -- Data range
  date_from DATE,
  date_to DATE,
  filters JSONB,
  
  -- File storage
  file_path VARCHAR(500), -- Path to generated file
  file_size INTEGER, -- Size in bytes
  
  -- Statistics
  records_included INTEGER,
  generation_time_ms INTEGER,
  
  -- Access tracking
  generated_by INTEGER REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  downloaded_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,
  expires_at TIMESTAMP -- Auto-delete after this date
);

-- =============================================
-- Indexes for performance
-- =============================================

-- scheduled_reports indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_enabled 
  ON scheduled_reports(enabled) WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run 
  ON scheduled_reports(next_run) WHERE enabled = TRUE AND next_run IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by 
  ON scheduled_reports(created_by);

-- report_history indexes
CREATE INDEX IF NOT EXISTS idx_report_history_scheduled_report 
  ON report_history(scheduled_report_id);

CREATE INDEX IF NOT EXISTS idx_report_history_generated_by 
  ON report_history(generated_by);

CREATE INDEX IF NOT EXISTS idx_report_history_generated_at 
  ON report_history(generated_at);

CREATE INDEX IF NOT EXISTS idx_report_history_expires_at 
  ON report_history(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scheduled_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_scheduled_reports_updated_at ON scheduled_reports;
CREATE TRIGGER trigger_scheduled_reports_updated_at
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_reports_updated_at();

-- Function to calculate next run time
CREATE OR REPLACE FUNCTION calculate_next_run(
  p_frequency VARCHAR,
  p_schedule_time TIME,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER,
  p_last_run TIMESTAMP
) RETURNS TIMESTAMP AS $$
DECLARE
  next_run TIMESTAMP;
  base_date TIMESTAMP;
BEGIN
  -- Use last_run as base, or current time if never run
  base_date := COALESCE(p_last_run, CURRENT_TIMESTAMP);
  
  CASE p_frequency
    WHEN 'daily' THEN
      -- Next day at scheduled time
      next_run := (base_date::DATE + INTERVAL '1 day' + p_schedule_time)::TIMESTAMP;
      
    WHEN 'weekly' THEN
      -- Next occurrence of specified day of week
      next_run := base_date + 
        ((p_day_of_week - EXTRACT(DOW FROM base_date)::INTEGER + 7) % 7 || ' days')::INTERVAL +
        p_schedule_time::TIME;
      IF next_run <= base_date THEN
        next_run := next_run + INTERVAL '7 days';
      END IF;
      
    WHEN 'monthly' THEN
      -- Next occurrence of specified day of month
      next_run := (DATE_TRUNC('month', base_date) + 
                   ((p_day_of_month - 1) || ' days')::INTERVAL + 
                   p_schedule_time::TIME)::TIMESTAMP;
      IF next_run <= base_date THEN
        next_run := (DATE_TRUNC('month', base_date) + INTERVAL '1 month' +
                    ((p_day_of_month - 1) || ' days')::INTERVAL +
                    p_schedule_time::TIME)::TIMESTAMP;
      END IF;
      
    WHEN 'quarterly' THEN
      -- Every 3 months on specified day
      next_run := (DATE_TRUNC('quarter', base_date) + 
                   INTERVAL '3 months' +
                   ((p_day_of_month - 1) || ' days')::INTERVAL +
                   p_schedule_time::TIME)::TIMESTAMP;
      IF next_run <= base_date THEN
        next_run := next_run + INTERVAL '3 months';
      END IF;
      
    ELSE
      next_run := NULL;
  END CASE;
  
  RETURN next_run;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired reports
CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM report_history
  WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP;
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Sample data / seed
-- =============================================

-- Insert default weekly visitor report
INSERT INTO scheduled_reports (
  name,
  description,
  report_type,
  filters,
  format,
  recipients,
  frequency,
  schedule_time,
  schedule_day_of_week,
  enabled
) VALUES (
  'Weekly Visitor Summary',
  'Comprehensive weekly summary of all visitor activity',
  'weekly',
  '{"includeCharts": true, "includeIncidents": true}'::JSONB,
  'pdf',
  ARRAY['admin@secure-gate.com'],
  'weekly',
  '08:00:00'::TIME,
  1, -- Monday
  TRUE
) ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE scheduled_reports IS 'Configuration for automated report generation and distribution';
COMMENT ON TABLE report_history IS 'Audit trail of all generated reports with download tracking';
COMMENT ON COLUMN scheduled_reports.filters IS 'JSON filters: dateRange, siteId, guardId, residentId, status, etc.';
COMMENT ON COLUMN scheduled_reports.frequency IS 'How often report runs: daily, weekly, monthly, quarterly';
COMMENT ON COLUMN scheduled_reports.next_run IS 'Calculated next execution time, updated after each run';
COMMENT ON FUNCTION calculate_next_run IS 'Calculates next scheduled run time based on frequency and schedule settings';
COMMENT ON FUNCTION cleanup_expired_reports IS 'Removes expired reports (run daily via cron)';

-- Verification query
-- SELECT COUNT(*) FROM scheduled_reports WHERE enabled = TRUE;
