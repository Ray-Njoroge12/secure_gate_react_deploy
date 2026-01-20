-- Migration: Add visitor check-in/out metadata
-- Adds guard attribution and notes for check-in/out actions

ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS check_in_guard_id INT REFERENCES users(id);

ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS check_out_guard_id INT REFERENCES users(id);

ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS check_in_notes TEXT;

ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS check_out_notes TEXT;
