-- Migration 089: Create watchlist tables
-- Watchlist for flagged individuals, vehicles, and IDs
-- Fixed: 2026-03-17 - Changed UUID to INTEGER for estate_id to match estates table

CREATE TABLE IF NOT EXISTS watchlist (
  id            SERIAL PRIMARY KEY,
  estate_id     INTEGER NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
  full_name     VARCHAR(255) NOT NULL,
  id_number     VARCHAR(100),
  vehicle_plate VARCHAR(50),
  reason        TEXT NOT NULL,
  risk_level    VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_estate_id ON watchlist(estate_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_id_number ON watchlist(id_number) WHERE id_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_watchlist_vehicle_plate ON watchlist(vehicle_plate) WHERE vehicle_plate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_watchlist_is_active ON watchlist(estate_id, is_active);

CREATE TABLE IF NOT EXISTS watchlist_matches (
  id              SERIAL PRIMARY KEY,
  estate_id       INTEGER NOT NULL REFERENCES estates(id),
  watchlist_id    INTEGER NOT NULL REFERENCES watchlist(id) ON DELETE CASCADE,
  visitor_id      INTEGER REFERENCES visitors(id),
  matched_by      INTEGER REFERENCES users(id),
  match_type      VARCHAR(50) NOT NULL,
  matched_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_matches_estate_id ON watchlist_matches(estate_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_matches_watchlist_id ON watchlist_matches(watchlist_id);
