-- Migration: Add missing estate public fields and event estate_location_id
-- Description: Align estates/events tables with public API and event scoping expectations

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255);

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255);

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS state VARCHAR(100);

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS country VARCHAR(100);

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE estates
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);

UPDATE estates
SET slug = COALESCE(slug, 'estate-' || id);

UPDATE estates
SET timezone = COALESCE(timezone, 'UTC');

-- Backfill address from structured address fields when available
UPDATE estates
SET address = TRIM(CONCAT_WS(', ', address_line1, address_line2, city, state, postal_code, country))
WHERE address IS NULL
  AND (address_line1 IS NOT NULL
    OR address_line2 IS NOT NULL
    OR city IS NOT NULL
    OR state IS NOT NULL
    OR postal_code IS NOT NULL
    OR country IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS idx_estates_slug ON estates(slug);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'events'
  ) THEN
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS estate_location_id INTEGER;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'events'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'events_estate_location_id_fkey'
    ) THEN
      ALTER TABLE events
        ADD CONSTRAINT events_estate_location_id_fkey
        FOREIGN KEY (estate_location_id) REFERENCES estate_locations(estate_id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_events_estate_location_id ON events(estate_location_id);
    CREATE INDEX IF NOT EXISTS idx_events_estate_location_status ON events(estate_location_id, status);
  END IF;
END $$;

-- Ensure event_analytics view includes estate_location_id (add-event-management-tables overwrites it)
DROP VIEW IF EXISTS event_analytics CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_visitors'
  ) THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW event_analytics AS
      SELECT e.id,
          e.name,
          e.event_type,
          e.start_date,
          e.end_date,
          e.status,
          e.max_capacity,
          e.current_attendance,
          e.estate_location_id,
          count(ev.id) AS total_invited,
          count(
              CASE
                  WHEN ((ev.invitation_status)::text = 'confirmed'::text) THEN 1
                  ELSE NULL::integer
              END) AS confirmed_count,
          count(
              CASE
                  WHEN ((ev.invitation_status)::text = 'declined'::text) THEN 1
                  ELSE NULL::integer
              END) AS declined_count,
          count(
              CASE
                  WHEN ((ev.invitation_status)::text = 'pending'::text) THEN 1
                  ELSE NULL::integer
              END) AS pending_count,
          count(
              CASE
                  WHEN ((ev.rsvp_status)::text = 'attending'::text) THEN 1
                  ELSE NULL::integer
              END) AS rsvp_attending,
          count(
              CASE
                  WHEN ((ev.rsvp_status)::text = 'not_attending'::text) THEN 1
                  ELSE NULL::integer
              END) AS rsvp_not_attending,
          count(
              CASE
                  WHEN ((ev.rsvp_status)::text = 'maybe'::text) THEN 1
                  ELSE NULL::integer
              END) AS rsvp_maybe,
          count(
              CASE
                  WHEN (ev.checked_in = true) THEN 1
                  ELSE NULL::integer
              END) AS checked_in_count,
          count(
              CASE
                  WHEN (ev.checked_out = true) THEN 1
                  ELSE NULL::integer
              END) AS checked_out_count,
          sum(ev.plus_one_count) AS total_plus_ones,
          round((((count(
              CASE
                  WHEN ((ev.rsvp_status IS NOT NULL) AND ((ev.rsvp_status)::text <> 'pending'::text)) THEN 1
                  ELSE NULL::integer
              END))::numeric / (NULLIF(count(ev.id), 0))::numeric) * (100)::numeric), 2) AS rsvp_response_rate,
          round((((count(
              CASE
                  WHEN (ev.checked_in = true) THEN 1
                  ELSE NULL::integer
              END))::numeric / (NULLIF(count(
              CASE
                  WHEN ((ev.rsvp_status)::text = 'attending'::text) THEN 1
                  ELSE NULL::integer
              END), 0))::numeric) * (100)::numeric), 2) AS attendance_rate
         FROM (events e
           LEFT JOIN event_visitors ev ON ((e.id = ev.event_id)))
        GROUP BY e.id, e.name, e.event_type, e.start_date, e.end_date, e.status, e.max_capacity, e.current_attendance, e.estate_location_id;
    $view$;
  END IF;
END $$;
