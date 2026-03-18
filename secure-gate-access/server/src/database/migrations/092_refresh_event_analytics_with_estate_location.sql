-- Migration 092: Refresh event_analytics to include estate_location_id consistently
-- This forward migration restores estate scoping metadata in event_analytics
-- after earlier migrations that recreated the view without this column.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'events'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'event_visitors'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'events'
        AND column_name = 'estate_location_id'
    ) THEN
      EXECUTE $view_with_estate$
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
          COUNT(CASE WHEN ev.invitation_status = 'pending' THEN 1 END) as pending_count,

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
          ) as attendance_rate,

          -- Estate metadata retained for scoping compatibility
          e.estate_location_id
        FROM events e
        LEFT JOIN event_visitors ev ON e.id = ev.event_id
        GROUP BY
          e.id,
          e.name,
          e.event_type,
          e.start_date,
          e.end_date,
          e.status,
          e.max_capacity,
          e.current_attendance,
          e.estate_location_id
      $view_with_estate$;
    ELSE
      -- Safety fallback for legacy schemas where events.estate_location_id is absent.
      EXECUTE $view_without_estate$
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
          COUNT(CASE WHEN ev.invitation_status = 'pending' THEN 1 END) as pending_count,

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
          ) as attendance_rate,

          NULL::INTEGER as estate_location_id
        FROM events e
        LEFT JOIN event_visitors ev ON e.id = ev.event_id
        GROUP BY
          e.id,
          e.name,
          e.event_type,
          e.start_date,
          e.end_date,
          e.status,
          e.max_capacity,
          e.current_attendance
      $view_without_estate$;
    END IF;
  END IF;
END $$;

COMMENT ON VIEW event_analytics IS 'Event analytics and statistics with estate_location_id for estate scoping compatibility';
