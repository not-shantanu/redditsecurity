-- Create ai_prompts table for storing AI prompts
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_prompts_persona ON ai_prompts(persona_id);

-- Enable Row Level Security
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own ai prompts" ON ai_prompts;
DROP POLICY IF EXISTS "Users can insert own ai prompts" ON ai_prompts;
DROP POLICY IF EXISTS "Users can update own ai prompts" ON ai_prompts;
DROP POLICY IF EXISTS "Users can delete own ai prompts" ON ai_prompts;

-- RLS Policies
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

