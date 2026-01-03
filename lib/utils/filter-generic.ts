// Utility functions to filter out generic keywords and subreddits

// Generic keyword patterns to exclude
const GENERIC_KEYWORD_PATTERNS = [
  /^ai\s/i,                    // "ai something"
  /^artificial\s+intelligence/i,
  /^ai\s+apps?$/i,
  /^ai\s+tools?$/i,
  /^ai\s+software$/i,
  /^chatgpt$/i,
  /^openai$/i,
  /^machine\s+learning$/i,
  /^ml\s+models?$/i,
  /^deep\s+learning$/i,
  /^neural\s+networks?$/i,
  /^automation$/i,              // Too generic
  /^software$/i,                // Too generic
  /^tools?$/i,                  // Too generic
  /^apps?$/i,                   // Too generic
  /^technology$/i,              // Too generic
  /^tech$/i,                    // Too generic
  /^digital$/i,                 // Too generic
  /^online$/i,                  // Too generic
  /^platform$/i,                // Too generic
  /^solution$/i,                // Too generic
  /^service$/i,                 // Too generic
];

// Generic subreddit names to exclude
const GENERIC_SUBREDDIT_NAMES = [
  'chatgpt',
  'openai',
  'artificial',
  'ai',
  'machinelearning',
  'deeplearning',
  'neuralnetworks',
  'artificialintelligence',
  'artificial_intelligence',
  'machine_learning',
  'deep_learning',
  'neural_networks',
  'automation',
  'technology',
  'tech',
  'software',
  'programming',                // Too generic unless very specific
  'webdev',                     // Too generic
  'learnprogramming',           // Too generic
  'programminglanguages',      // Too generic
];

// Check if a keyword is generic
export function isGenericKeyword(keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  
  // Check against patterns
  for (const pattern of GENERIC_KEYWORD_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  
  // Check if it's too short (1-2 words that are generic)
  const words = normalized.split(/\s+/);
  if (words.length <= 2) {
    const genericWords = ['ai', 'app', 'apps', 'tool', 'tools', 'software', 'platform', 'service', 'solution', 'tech', 'technology', 'digital', 'online', 'automation'];
    if (words.every(w => genericWords.includes(w))) {
      return true;
    }
  }
  
  return false;
}

// Check if a subreddit name is generic
export function isGenericSubreddit(subredditName: string): boolean {
  const normalized = subredditName
    .trim()
    .toLowerCase()
    .replace(/^r\//, '')  // Remove r/ prefix
    .replace(/[^a-z0-9_]/g, ''); // Remove special chars
  
  // Direct match against generic list
  if (GENERIC_SUBREDDIT_NAMES.includes(normalized)) {
    return true;
  }
  
  // Check if it starts with generic patterns
  if (normalized.startsWith('ai_') || 
      normalized.startsWith('artificial_') ||
      normalized.startsWith('machine_') ||
      normalized.startsWith('deep_') ||
      normalized.startsWith('neural_')) {
    // Allow if it's very specific (more than 2 words)
    const parts = normalized.split('_');
    if (parts.length <= 2) {
      return true;
    }
  }
  
  return false;
}

// Filter generic keywords from an array
export function filterGenericKeywords<T extends { keyword: string }>(keywords: T[]): T[] {
  return keywords.filter(kw => !isGenericKeyword(kw.keyword));
}

// Filter generic subreddits from an array
export function filterGenericSubreddits<T extends { subreddit_name: string } | { name: string }>(
  subreddits: T[]
): T[] {
  return subreddits.filter(sub => {
    const name = 'subreddit_name' in sub ? sub.subreddit_name : sub.name;
    return !isGenericSubreddit(name);
  });
}

