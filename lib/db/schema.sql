-- RedditFrost Database Schema

-- Personas table
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  archetype TEXT NOT NULL, -- "The Helpful Expert", "The Sarcastic Peer", etc.
  brand_mission TEXT,
  product_name TEXT,
  problem_description TEXT,
  pain_points TEXT[],
  tone_professionalism INTEGER CHECK (tone_professionalism >= 1 AND tone_professionalism <= 10),
  tone_conciseness INTEGER CHECK (tone_conciseness >= 1 AND tone_conciseness <= 10),
  tone_empathy INTEGER CHECK (tone_empathy >= 1 AND tone_empathy <= 10),
  authenticity_markers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keywords table
CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  intent TEXT NOT NULL, -- "High Intent", "Problem Intent", "Industry Intent"
  seed_weight DECIMAL(3, 2) CHECK (seed_weight >= 0.1 AND seed_weight <= 1.0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subreddits table
CREATE TABLE IF NOT EXISTS subreddits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  subreddit_name TEXT NOT NULL,
  crawl_mode TEXT DEFAULT 'new', -- 'new', 'rising', 'hot'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead_Store table
CREATE TABLE IF NOT EXISTS lead_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL UNIQUE, -- Reddit post ID
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
  post_id_hash TEXT NOT NULL UNIQUE, -- Hash of post_id to prevent duplicates
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaigns table (to track active campaigns)
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

-- Blacklist table (for rejected posts)
CREATE TABLE IF NOT EXISTS blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(persona_id, post_id)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_store_persona ON lead_store(persona_id);
CREATE INDEX IF NOT EXISTS idx_lead_store_state ON lead_store(generation_state);
CREATE INDEX IF NOT EXISTS idx_lead_store_score ON lead_store(chilly_score);
CREATE INDEX IF NOT EXISTS idx_keywords_persona ON keywords(persona_id);
CREATE INDEX IF NOT EXISTS idx_subreddits_persona ON subreddits(persona_id);
CREATE INDEX IF NOT EXISTS idx_dedup_hash ON deduplication_registry(post_id_hash);
CREATE INDEX IF NOT EXISTS idx_campaigns_persona ON campaigns(persona_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_persona ON blacklist(persona_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_post ON blacklist(post_id);

-- Row Level Security (RLS) Policies
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE subreddits ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE deduplication_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own personas" ON personas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personas" ON personas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personas" ON personas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personas" ON personas
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own keywords" ON keywords
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = keywords.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own keywords" ON keywords
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = keywords.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can view own subreddits" ON subreddits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = subreddits.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own subreddits" ON subreddits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = subreddits.persona_id AND personas.user_id = auth.uid())
  );

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

CREATE POLICY "Users can view own dedup registry" ON deduplication_registry
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = deduplication_registry.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own dedup registry" ON deduplication_registry
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = deduplication_registry.persona_id AND personas.user_id = auth.uid())
  );

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

CREATE POLICY "Users can view own analytics" ON analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = analytics.persona_id AND personas.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own analytics" ON analytics
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM personas WHERE personas.id = analytics.persona_id AND personas.user_id = auth.uid())
  );

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

