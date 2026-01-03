-- Create automation_runs table for storing automation sessions
-- Run this in Supabase SQL Editor

-- Automation Runs table (for storing complete automation sessions)
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  search_mode TEXT NOT NULL CHECK (search_mode IN ('subreddit', 'global')),
  num_posts INTEGER NOT NULL,
  score_threshold DECIMAL(3, 2) NOT NULL CHECK (score_threshold >= 0.0 AND score_threshold <= 1.0),
  selected_subreddits TEXT[], -- Array of subreddit IDs
  results JSONB NOT NULL, -- Full results array with posts, responses, states
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_runs_persona ON automation_runs(persona_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_created ON automation_runs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own automation runs" ON automation_runs;
DROP POLICY IF EXISTS "Users can insert own automation runs" ON automation_runs;
DROP POLICY IF EXISTS "Users can update own automation runs" ON automation_runs;
DROP POLICY IF EXISTS "Users can delete own automation runs" ON automation_runs;

-- RLS Policies
CREATE POLICY "Users can view own automation runs" ON automation_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = automation_runs.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own automation runs" ON automation_runs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = automation_runs.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own automation runs" ON automation_runs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = automation_runs.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own automation runs" ON automation_runs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = automation_runs.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

