-- Migration: Refresh event_analytics view to include estate_location_id

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
