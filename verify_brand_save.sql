-- Verify that brand analysis columns exist and check current data
-- Run this in Supabase SQL Editor to verify the setup

-- Check if columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'personas'
  AND column_name IN ('website_url', 'target_audience', 'key_features', 'last_analyzed')
ORDER BY column_name;

-- Check current brand data in personas table
SELECT 
    id,
    product_name,
    brand_mission,
    website_url,
    target_audience,
    key_features,
    last_analyzed,
    updated_at
FROM personas
ORDER BY updated_at DESC
LIMIT 5;

