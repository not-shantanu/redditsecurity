// Shared types for RedditFrost

export interface Persona {
  id?: string;
  name: string;
  archetype: string;
  brandMission: string;
  productName: string;
  problemDescription: string;
  painPoints: string[];
  toneProfessionalism: number;
  toneConciseness: number;
  toneEmpathy: number;
  authenticityMarkers: {
    useLowercaseI: boolean;
    useContractions: boolean;
    varySentenceLength: boolean;
    avoidCorporateSpeak: boolean;
  };
}

export interface Keyword {
  id?: string;
  keyword: string;
  intent: string;
  seed_weight: number;
}

export interface Subreddit {
  id?: string;
  subreddit_name: string;
  crawl_mode: string;
  is_active: boolean;
}

export interface Lead {
  id: string;
  post_id: string;
  post_title: string;
  post_body: string;
  post_url: string;
  subreddit: string;
  chilly_score: number;
  reasoning: string;
  intent_detected: string;
  generation_state: 'drafted' | 'approved' | 'rejected' | 'posted';
  generated_reply: string;
  reply_upvotes: number;
  reply_comments: number;
  tokens_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  persona_id: string;
  hunt_mode: 'global' | 'subreddit';
  is_active: boolean;
  daily_post_cap: number;
  current_daily_count: number;
  last_post_date: string | null;
}

