-- Fix Missing Columns Migration
-- Run this if you get errors about missing columns

-- Add relevance_score to subreddits if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'subreddits' 
      AND column_name = 'relevance_score'
  ) THEN
    ALTER TABLE subreddits 
    ADD COLUMN relevance_score DECIMAL(3, 2) CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0);
    
    -- Create index for relevance_score
    CREATE INDEX IF NOT EXISTS idx_subreddits_relevance ON subreddits(relevance_score DESC NULLS LAST);
    
    RAISE NOTICE 'Added relevance_score column to subreddits table';
  ELSE
    RAISE NOTICE 'relevance_score column already exists in subreddits table';
  END IF;
END $$;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'subreddits'
  AND column_name = 'relevance_score';

