-- RedditFrost Database Migration
-- Paste this entire file into Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Personas table
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  archetype TEXT NOT NULL,
  brand_mission TEXT,
  product_name TEXT,
  problem_description TEXT,
  pain_points TEXT[],
  tone_professionalism INTEGER CHECK (tone_professionalism >= 1 AND tone_professionalism <= 10),
  tone_conciseness INTEGER CHECK (tone_conciseness >= 1 AND tone_conciseness <= 10),
  tone_empathy INTEGER CHECK (tone_empathy >= 1 AND tone_empathy <= 10),
  authenticity_markers JSONB,
  -- Brand analysis fields
  website_url TEXT,
  target_audience TEXT,
  key_features TEXT[],
  last_analyzed TIMESTAMP WITH TIME ZONE,
  scraped_content TEXT, -- Raw scraped content from Crawlee
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keywords table
CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  intent TEXT NOT NULL,
  seed_weight DECIMAL(3, 2) CHECK (seed_weight >= 0.1 AND seed_weight <= 1.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subreddits table
CREATE TABLE IF NOT EXISTS subreddits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  subreddit_name TEXT NOT NULL,
  crawl_mode TEXT DEFAULT 'new',
  is_active BOOLEAN DEFAULT true,
  relevance_score DECIMAL(3, 2) CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead_Store table
CREATE TABLE IF NOT EXISTS lead_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL UNIQUE,
  author_id TEXT NOT NULL,
  subreddit TEXT NOT NULL,
  post_title TEXT NOT NULL,
  post_body TEXT,
  post_url TEXT NOT NULL,
  chilly_score DECIMAL(3, 2) NOT NULL CHECK (chilly_score >= 0.0 AND chilly_score <= 1.0),
  reasoning TEXT,
  intent_detected TEXT,
  generation_state TEXT DEFAULT 'drafted' CHECK (generation_state IN ('drafted', 'approved', 'rejected', 'posted')),
  generated_reply TEXT,
  reply_upvotes INTEGER DEFAULT 0,
  reply_comments INTEGER DEFAULT 0,
  tokens_spent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deduplication_Registry table
CREATE TABLE IF NOT EXISTS deduplication_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id_hash TEXT NOT NULL UNIQUE,
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  hunt_mode TEXT NOT NULL CHECK (hunt_mode IN ('global', 'subreddit')),
  is_active BOOLEAN DEFAULT true,
  daily_post_cap INTEGER DEFAULT 2,
  current_daily_count INTEGER DEFAULT 0,
  last_post_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blacklist table
CREATE TABLE IF NOT EXISTS blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(persona_id, post_id)
);

-- Processed_threads table (for tracking thread states to prevent duplicates)
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

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  leads_found INTEGER DEFAULT 0,
  replies_posted INTEGER DEFAULT 0,
  total_upvotes INTEGER DEFAULT 0,
  total_tokens_spent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_lead_store_persona ON lead_store(persona_id);
CREATE INDEX IF NOT EXISTS idx_lead_store_state ON lead_store(generation_state);
CREATE INDEX IF NOT EXISTS idx_lead_store_score ON lead_store(chilly_score);
CREATE INDEX IF NOT EXISTS idx_keywords_persona ON keywords(persona_id);
CREATE INDEX IF NOT EXISTS idx_subreddits_persona ON subreddits(persona_id);
CREATE INDEX IF NOT EXISTS idx_subreddits_relevance ON subreddits(relevance_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_dedup_hash ON deduplication_registry(post_id_hash);
CREATE INDEX IF NOT EXISTS idx_campaigns_persona ON campaigns(persona_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_persona ON blacklist(persona_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_post ON blacklist(post_id);
CREATE INDEX IF NOT EXISTS idx_analytics_persona ON analytics(persona_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);

-- Processed_threads indexes
CREATE INDEX IF NOT EXISTS idx_processed_threads_persona_state ON processed_threads(persona_id, state);
CREATE INDEX IF NOT EXISTS idx_processed_threads_skip_expires ON processed_threads(skip_expires_at) WHERE state = 'skip';
CREATE INDEX IF NOT EXISTS idx_processed_threads_post_id ON processed_threads(post_id);

-- AI Prompts indexes
CREATE INDEX IF NOT EXISTS idx_ai_prompts_persona ON ai_prompts(persona_id);

-- Automation Runs indexes
CREATE INDEX IF NOT EXISTS idx_automation_runs_persona ON automation_runs(persona_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_created ON automation_runs(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE subreddits ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE deduplication_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own personas" ON personas;
DROP POLICY IF EXISTS "Users can insert own personas" ON personas;
DROP POLICY IF EXISTS "Users can update own personas" ON personas;
DROP POLICY IF EXISTS "Users can delete own personas" ON personas;

DROP POLICY IF EXISTS "Users can view own keywords" ON keywords;
DROP POLICY IF EXISTS "Users can insert own keywords" ON keywords;

DROP POLICY IF EXISTS "Users can view own subreddits" ON subreddits;
DROP POLICY IF EXISTS "Users can insert own subreddits" ON subreddits;

DROP POLICY IF EXISTS "Users can view own leads" ON lead_store;
DROP POLICY IF EXISTS "Users can insert own leads" ON lead_store;
DROP POLICY IF EXISTS "Users can update own leads" ON lead_store;

DROP POLICY IF EXISTS "Users can view own dedup registry" ON deduplication_registry;
DROP POLICY IF EXISTS "Users can insert own dedup registry" ON deduplication_registry;

DROP POLICY IF EXISTS "Users can view own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;

DROP POLICY IF EXISTS "Users can view own blacklist" ON blacklist;
DROP POLICY IF EXISTS "Users can insert own blacklist" ON blacklist;
DROP POLICY IF EXISTS "Users can delete own blacklist" ON blacklist;

DROP POLICY IF EXISTS "Users can view own analytics" ON analytics;
DROP POLICY IF EXISTS "Users can insert own analytics" ON analytics;

-- Personas policies
CREATE POLICY "Users can view own personas" ON personas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personas" ON personas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personas" ON personas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personas" ON personas
  FOR DELETE USING (auth.uid() = user_id);

-- Keywords policies
CREATE POLICY "Users can view own keywords" ON keywords
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = keywords.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own keywords" ON keywords
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = keywords.persona_id AND personas.user_id = auth.uid())
  );

-- Subreddits policies
CREATE POLICY "Users can view own subreddits" ON subreddits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = subreddits.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own subreddits" ON subreddits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = subreddits.persona_id AND personas.user_id = auth.uid())
  );

-- Lead_store policies
CREATE POLICY "Users can view own leads" ON lead_store
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = lead_store.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own leads" ON lead_store
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = lead_store.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can update own leads" ON lead_store
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = lead_store.persona_id AND personas.user_id = auth.uid())
  );

-- Deduplication_registry policies
CREATE POLICY "Users can view own dedup registry" ON deduplication_registry
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = deduplication_registry.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own dedup registry" ON deduplication_registry
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = deduplication_registry.persona_id AND personas.user_id = auth.uid())
  );

-- Campaigns policies
CREATE POLICY "Users can view own campaigns" ON campaigns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = campaigns.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own campaigns" ON campaigns
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = campaigns.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can update own campaigns" ON campaigns
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = campaigns.persona_id AND personas.user_id = auth.uid())
  );

-- Blacklist policies
CREATE POLICY "Users can view own blacklist" ON blacklist
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = blacklist.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own blacklist" ON blacklist
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = blacklist.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own blacklist" ON blacklist
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = blacklist.persona_id AND personas.user_id = auth.uid())
  );

-- Analytics policies
CREATE POLICY "Users can view own analytics" ON analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = analytics.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own analytics" ON analytics
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = analytics.persona_id AND personas.user_id = auth.uid())
  );

-- ============================================
-- ADD MISSING COLUMNS (if they don't exist)
-- ============================================

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
  END IF;
END $$;

-- Add brand analysis columns to personas if missing
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

  -- Add scraped_content to store raw scraped website content
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'personas' 
      AND column_name = 'scraped_content'
  ) THEN
    ALTER TABLE personas ADD COLUMN scraped_content TEXT;
  END IF;
END $$;

