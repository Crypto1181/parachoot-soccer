-- Supabase Database Schema for Parachoot Soccer
-- Run this SQL in your Supabase SQL Editor

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  logo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('live', 'upcoming', 'finished')),
  minute INTEGER,
  competition TEXT NOT NULL,
  "group" TEXT,
  venue TEXT,
  start_time TEXT,
  stream_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on teams" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on matches" ON matches
  FOR SELECT USING (true);

-- Insert sample teams
INSERT INTO teams (id, name, short_name, logo) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Chelsea', 'CHE', 'https://logos-world.net/wp-content/uploads/2020/06/Chelsea-Logo.png'),
  ('00000000-0000-0000-0000-000000000002', 'Paris Saint-Germain', 'PSG', 'https://logos-world.net/wp-content/uploads/2020/06/Paris-Saint-Germain-Logo.png'),
  ('00000000-0000-0000-0000-000000000003', 'RB Salzburg', 'RBS', 'https://logos-world.net/wp-content/uploads/2020/06/Red-Bull-Salzburg-Logo.png'),
  ('00000000-0000-0000-0000-000000000004', 'Real Madrid', 'RMA', 'https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png'),
  ('00000000-0000-0000-0000-000000000005', 'Bayern Munich', 'BAY', 'https://logos-world.net/wp-content/uploads/2020/06/Bayern-Munich-Logo.png'),
  ('00000000-0000-0000-0000-000000000006', 'Manchester City', 'MCI', 'https://logos-world.net/wp-content/uploads/2020/06/Manchester-City-Logo.png'),
  ('00000000-0000-0000-0000-000000000007', 'Liverpool', 'LIV', 'https://logos-world.net/wp-content/uploads/2020/06/Liverpool-Logo.png'),
  ('00000000-0000-0000-0000-000000000008', 'Barcelona', 'BAR', 'https://logos-world.net/wp-content/uploads/2020/06/Barcelona-Logo.png'),
  ('00000000-0000-0000-0000-000000000009', 'Arsenal', 'ARS', 'https://logos-world.net/wp-content/uploads/2020/06/Arsenal-Logo.png'),
  ('00000000-0000-0000-0000-000000000010', 'Juventus', 'JUV', 'https://logos-world.net/wp-content/uploads/2020/06/Juventus-Logo.png')
ON CONFLICT (id) DO NOTHING;

-- Insert sample matches
INSERT INTO matches (id, home_team_id, away_team_id, home_score, away_score, status, minute, competition, "group", venue, stream_url) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 0, 2, 'live', 67, 'Champions League', 'Group A', 'MetLife Stadium', 'https://example.com/stream1'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 0, 3, 'live', 45, 'Champions League', 'Group H', 'Lincoln Financial Field', 'https://example.com/stream2'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000006', 2, 1, 'live', 78, 'Champions League', 'Group A', NULL, 'https://example.com/stream3')
ON CONFLICT (id) DO NOTHING;

INSERT INTO matches (id, home_team_id, away_team_id, home_score, away_score, status, competition, start_time, venue) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000008', 0, 0, 'upcoming', 'Champions League', '20:00', 'Anfield'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000010', 0, 0, 'upcoming', 'Champions League', '21:00', 'Emirates Stadium'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 0, 0, 'upcoming', 'Premier League', '17:30', 'Etihad Stadium')
ON CONFLICT (id) DO NOTHING;

INSERT INTO matches (id, home_team_id, away_team_id, home_score, away_score, status, competition) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007', 3, 1, 'finished', 'Champions League'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000005', 2, 2, 'finished', 'Champions League'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 1, 4, 'finished', 'Champions League')
ON CONFLICT (id) DO NOTHING;

