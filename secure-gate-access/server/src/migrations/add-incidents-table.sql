-- Phase G4: Incident Reporting Table
-- Allows guards to log structured incidents with categorization

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  visitor_id INTEGER REFERENCES visitors(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'suspicious',
    'document_issue',
    'vehicle',
    'behavior',
    'system_error',
    'other'
  )),
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN (
    'low',
    'medium',
    'high',
    'critical'
  )),
  description TEXT NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_guard ON incidents(guard_id);
CREATE INDEX IF NOT EXISTS idx_incidents_visitor ON incidents(visitor_id);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_resolved ON incidents(resolved_at) WHERE resolved_at IS NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS incidents_updated_at_trigger ON incidents;
CREATE TRIGGER incidents_updated_at_trigger
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incidents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE incidents IS 'Phase G4: Incident logging for guard operations';
COMMENT ON COLUMN incidents.category IS 'Type of incident: suspicious, document_issue, vehicle, behavior, system_error, other';
COMMENT ON COLUMN incidents.severity IS 'Incident severity level: low, medium, high, critical';
COMMENT ON COLUMN incidents.description IS 'Detailed description of what happened';
COMMENT ON COLUMN incidents.resolution IS 'How the incident was resolved';
COMMENT ON COLUMN incidents.resolved_at IS 'Timestamp when incident was marked as resolved';
COMMENT ON COLUMN incidents.resolved_by IS 'User ID of supervisor/admin who resolved it';
