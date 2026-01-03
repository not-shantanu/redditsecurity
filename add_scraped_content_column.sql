-- Quick fix: Add scraped_content column to personas table
-- Run this in Supabase SQL Editor to add the column for storing raw scraped content

DO $$ 
BEGIN
  -- Add scraped_content to store raw scraped website content
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'personas' 
      AND column_name = 'scraped_content'
  ) THEN
    ALTER TABLE personas ADD COLUMN scraped_content TEXT;
    RAISE NOTICE 'Column scraped_content added to personas table';
  ELSE
    RAISE NOTICE 'Column scraped_content already exists';
  END IF;
END $$;

