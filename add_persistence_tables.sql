-- Add persistence tables for AI Prompts and Automation Runs
-- Run this in Supabase SQL Editor

-- AI Prompts table (for storing analysis and reply generation prompts per persona)
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE UNIQUE,
  analysis_prompt TEXT NOT NULL,
  reply_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_ai_prompts_persona ON ai_prompts(persona_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_persona ON automation_runs(persona_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_created ON automation_runs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own ai prompts" ON ai_prompts;
DROP POLICY IF EXISTS "Users can insert own ai prompts" ON ai_prompts;
DROP POLICY IF EXISTS "Users can update own ai prompts" ON ai_prompts;
DROP POLICY IF EXISTS "Users can delete own ai prompts" ON ai_prompts;

DROP POLICY IF EXISTS "Users can view own automation runs" ON automation_runs;
DROP POLICY IF EXISTS "Users can insert own automation runs" ON automation_runs;
DROP POLICY IF EXISTS "Users can update own automation runs" ON automation_runs;
DROP POLICY IF EXISTS "Users can delete own automation runs" ON automation_runs;

-- AI Prompts policies
CREATE POLICY "Users can view own ai prompts" ON ai_prompts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = ai_prompts.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own ai prompts" ON ai_prompts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = ai_prompts.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own ai prompts" ON ai_prompts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = ai_prompts.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ai prompts" ON ai_prompts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = ai_prompts.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

-- Automation Runs policies
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

