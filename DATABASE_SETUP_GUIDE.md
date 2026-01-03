# Database Setup Guide

## Quick Verification

To check if your database is set up correctly, run this query in Supabase SQL Editor:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'personas', 
    'keywords', 
    'subreddits', 
    'lead_store', 
    'deduplication_registry', 
    'campaigns', 
    'blacklist', 
    'analytics'
  )
ORDER BY table_name;
```

## Full Migration

If any tables are missing, paste the entire `supabase_migration.sql` file into the Supabase SQL Editor and run it.

### Steps:

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run the Migration**
   - Copy the entire contents of `supabase_migration.sql`
   - Paste into the SQL Editor
   - Click **Run** or press `Ctrl+Enter`

3. **Verify Tables**
   - Run the verification query above
   - You should see all 8 tables listed

4. **Verify RLS (Row Level Security)**
   ```sql
   -- Check if RLS is enabled
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
     AND tablename IN (
       'personas', 
       'keywords', 
       'subreddits', 
       'lead_store', 
       'deduplication_registry', 
       'campaigns', 
       'blacklist', 
       'analytics'
     );
   ```
   - All tables should have `rowsecurity = true`

5. **Verify Policies**
   ```sql
   -- Check if policies exist
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```
   - You should see multiple policies for each table

## Required Tables

The application requires these 8 tables:

1. **personas** - Stores user personas and brand information
2. **keywords** - Stores target keywords for Reddit hunting
3. **subreddits** - Stores monitored subreddits with relevance scores
4. **lead_store** - Stores discovered Reddit posts/leads
5. **deduplication_registry** - Prevents duplicate post processing
6. **campaigns** - Tracks active Reddit hunting campaigns
7. **blacklist** - Stores rejected/blocked posts
8. **analytics** - Stores daily analytics and metrics

## Important Notes

- The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times
- All tables have Row Level Security (RLS) enabled
- Policies ensure users can only access their own data
- The `lead_store` table requires an `id` column (check if it exists)

## Fix Missing ID Column (if needed)

If the `lead_store` table is missing the `id` column, run:

```sql
-- Add id column if missing
ALTER TABLE lead_store 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
```

If the `blacklist` table is missing the `id` column, run:

```sql
-- Add id column if missing
ALTER TABLE blacklist 
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
```

## Check Current Schema

To see the current structure of any table:

```sql
-- Example: Check personas table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'personas'
ORDER BY ordinal_position;
```

