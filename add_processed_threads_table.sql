-- Add processed_threads table for tracking thread states
-- This prevents duplicate processing and replies

CREATE TABLE IF NOT EXISTS processed_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL, -- Reddit post ID
  subreddit TEXT NOT NULL,
  post_url TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('done', 'deleted', 'skip')),
  generated_response TEXT, -- Store the generated response
  skip_expires_at TIMESTAMP WITH TIME ZONE, -- For skip state, when to show again (14 days from creation)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(persona_id, post_id) -- One state per persona+post combination
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_processed_threads_persona_state ON processed_threads(persona_id, state);
CREATE INDEX IF NOT EXISTS idx_processed_threads_skip_expires ON processed_threads(skip_expires_at) WHERE state = 'skip';
CREATE INDEX IF NOT EXISTS idx_processed_threads_post_id ON processed_threads(post_id);

-- Enable Row Level Security
ALTER TABLE processed_threads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own processed threads" ON processed_threads;
DROP POLICY IF EXISTS "Users can insert own processed threads" ON processed_threads;
DROP POLICY IF EXISTS "Users can update own processed threads" ON processed_threads;
DROP POLICY IF EXISTS "Users can delete own processed threads" ON processed_threads;

-- RLS Policies
CREATE POLICY "Users can view own processed threads" ON processed_threads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = processed_threads.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own processed threads" ON processed_threads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = processed_threads.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own processed threads" ON processed_threads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = processed_threads.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own processed threads" ON processed_threads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM personas 
      WHERE personas.id = processed_threads.persona_id 
      AND personas.user_id = auth.uid()
    )
  );

