-- Quick fix: Add brand analysis columns to personas table if missing
-- Run this in Supabase SQL Editor if you haven't run the full migration

DO $$ 
BEGIN
  -- Add website_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'personas' 
      AND column_name = 'website_url'
  ) THEN
    ALTER TABLE personas ADD COLUMN website_url TEXT;
  END IF;

  -- Add target_audience
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'personas' 
      AND column_name = 'target_audience'
  ) THEN
    ALTER TABLE personas ADD COLUMN target_audience TEXT;
  END IF;

  -- Add key_features
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'personas' 
      AND column_name = 'key_features'
  ) THEN
    ALTER TABLE personas ADD COLUMN key_features TEXT[];
  END IF;

  -- Add last_analyzed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'personas' 
      AND column_name = 'last_analyzed'
  ) THEN
    ALTER TABLE personas ADD COLUMN last_analyzed TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

