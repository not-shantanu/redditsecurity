# AI Prompts Reference

This document contains all the prompts used by the system for keyword generation and subreddit discovery.

## Keyword Generation Prompt

**Location:** `lib/ai/client.ts` - `generateKeywords()` function

**Prompt:**
```
You are a Reddit SEO & Intent Expert.

Product Description: {description}
Target Audience: {audience}

TASK: Generate a library of 50 EXTREMELY RELEVANT and SPECIFIC search terms.

CRITICAL REQUIREMENTS - AVOID GENERIC TERMS:
- DO NOT include generic terms like "ai", "ai apps", "ai tools", "artificial intelligence", "chatgpt", "openai", "automation", "software", "tools", "apps", "technology", "tech", "platform", "solution", "service"
- DO NOT include single generic words like "ai", "app", "tool", "software", "tech"
- ONLY include SPECIFIC, RELEVANT keywords that are directly related to the product's unique features, use cases, or target audience
- Focus on problem-specific terms, industry-specific terms, and feature-specific terms
- Keywords should be 2-4 words that clearly relate to the product's specific value proposition

CATEGORIES:
1. High Intent: "Best tool for [specific use case]", "Alternative to [specific competitor]", "[Specific problem] solution"
2. Problem Intent: "How do I [specific problem]?", "Struggling with [specific pain point]", "[Specific challenge] help"
3. Industry Intent: Discussions around [specific category/industry], [specific role] tools, [specific workflow] automation

SCORING: Assign each keyword a "Seed Weight" (0.1 to 1.0) based on conversion likelihood.

OUTPUT: JSON array of objects: [{"keyword": string, "intent": string, "seed_weight": number}]

Return ONLY valid JSON array, no markdown formatting.
```

**Model:** `gemini-2.0-flash-lite`  
**Temperature:** 0.7  
**Response Format:** JSON array

---

## Subreddit Discovery Prompt

**Location:** `app/api/discover-subreddits/route.ts` - `discoverSubredditsWithAI()` function

**Prompt:**
```
You are a Reddit market research expert. Based on the provided brand information and keywords, find the most EXTREMELY RELEVANT and SPECIFIC subreddits.

Brand Description: {brandDescription}
Target Audience: {targetAudience}
Keywords: {keywords.join(', ')}

CRITICAL REQUIREMENTS - AVOID GENERIC SUBREDDITS:
- DO NOT include generic subreddits like r/chatgpt, r/openai, r/artificial, r/ai, r/machinelearning, r/automation, r/technology, r/tech, r/software, r/programming, r/webdev
- DO NOT include overly broad subreddits that aren't specifically relevant to the brand
- ONLY include subreddits that are DIRECTLY and SPECIFICALLY relevant to the brand's unique value proposition, target audience, or use cases
- Focus on niche, industry-specific, or problem-specific subreddits
- Subreddits should have clear relevance to the brand's specific features, problems solved, or target users

For each relevant subreddit, provide:
- Subreddit name (without r/ prefix)
- Relevance score (0.0 to 1.0) - how relevant is this subreddit to the brand/keywords (be strict, only high relevance)
- Brief description of why it's relevant

Return a JSON array of objects with this structure:
[
  {
    "name": "subreddit_name",
    "relevance_score": 0.85,
    "description": "Brief reason why this subreddit is relevant"
  }
]

Find 15-20 EXTREMELY RELEVANT subreddits. Order them by relevance score (highest first). Only include subreddits with relevance_score >= 0.6.
Return ONLY valid JSON array, no markdown formatting.
```

**Model:** `gemini-2.0-flash-lite`  
**Temperature:** 0.7  
**Response Format:** JSON array  
**Filtering:** Only subreddits with `relevance_score >= 0.6` are saved

---

## Notes

1. **Generic Filtering:** Both keywords and subreddits are filtered using utility functions in `lib/utils/filter-generic.ts` to remove generic terms even after AI generation.

2. **Define Market vs Automate:** Both pages now use the same filtering logic:
   - Load all subreddits for the persona
   - Filter out generic subreddits using `filterGenericSubreddits()`
   - Order by `relevance_score` (descending)

3. **Active Status:** Subreddits with `relevance_score >= 0.7` are automatically set to `is_active: true` when discovered.

