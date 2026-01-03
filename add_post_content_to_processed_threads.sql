-- Add post_title and post_content columns to processed_threads table
-- This allows us to display the original post content in the Previous Threads view

ALTER TABLE processed_threads 
ADD COLUMN IF NOT EXISTS post_title TEXT,
ADD COLUMN IF NOT EXISTS post_content TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_processed_threads_post_title ON processed_threads(post_title) WHERE post_title IS NOT NULL;

