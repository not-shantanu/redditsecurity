import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redditClient } from '@/lib/reddit/client';
import { analyzePost, generateReply } from '@/lib/ai/client';
import { RateLimiter } from '@/lib/reddit/rate-limiter';
// Using Web Crypto API for Edge runtime
function hashString(str: string): string {
  // Simple hash function for Edge runtime
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId, personaId, huntMode } = await request.json();

    // Load persona
    const { data: persona, error: personaError } = await supabase
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .single();

    if (personaError || !persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    // Load campaign and rate limiter
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign || !campaign.is_active) {
      return NextResponse.json({ error: 'Campaign not active' }, { status: 400 });
    }

    const rateLimiter = new RateLimiter({
      minDelay: 240,
      maxDelay: 600,
      dailyPostCap: campaign.daily_post_cap || 2,
      currentDailyCount: campaign.current_daily_count || 0,
      lastPostDate: campaign.last_post_date ? new Date(campaign.last_post_date) : null,
    });

    if (!rateLimiter.canPost()) {
      return NextResponse.json({ message: 'Daily post cap reached' });
    }

    // Authenticate Reddit client
    const redditToken = process.env.REDDIT_ACCESS_TOKEN;
    if (!redditToken) {
      return NextResponse.json({ error: 'Reddit not configured' }, { status: 500 });
    }
    redditClient.setAccessToken(redditToken);

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google API not configured' }, { status: 500 });
    }

    let posts: any[] = [];

    if (huntMode === 'global') {
      // Load keywords
      const { data: keywords } = await supabase
        .from('keywords')
        .select('*')
        .eq('persona_id', personaId)
        .order('seed_weight', { ascending: false })
        .limit(10);

      if (!keywords || keywords.length === 0) {
        return NextResponse.json({ error: 'No keywords found' }, { status: 400 });
      }

      // Search with top keyword
      const topKeyword = keywords[0];
      const searchResults = await redditClient.searchPosts({
        query: topKeyword.keyword,
        sort: 'relevance',
        limit: 25,
      });
      posts = searchResults.posts;
    } else {
      // Load subreddits
      const { data: subreddits } = await supabase
        .from('subreddits')
        .select('*')
        .eq('persona_id', personaId)
        .eq('is_active', true)
        .limit(5);

      if (!subreddits || subreddits.length === 0) {
        return NextResponse.json({ error: 'No active subreddits found' }, { status: 400 });
      }

      // Get posts from first subreddit
      const subreddit = subreddits[0];
      const subredditPosts = await redditClient.getSubredditPosts(
        subreddit.subreddit_name,
        subreddit.crawl_mode as 'new' | 'rising' | 'hot',
        25
      );
      posts = subredditPosts.posts;
    }

    // Process posts
    const processedLeads: any[] = [];

    for (const post of posts.slice(0, 10)) {
      // Check if already processed
      const postHash = hashString(post.id);
      const { data: existing } = await supabase
        .from('deduplication_registry')
        .select('id')
        .eq('post_id_hash', postHash)
        .single();

      if (existing) continue;

      // Check if post is blacklisted
      const { data: blacklisted } = await supabase
        .from('blacklist')
        .select('id')
        .eq('persona_id', personaId)
        .eq('post_id', post.id)
        .single();

      if (blacklisted) continue;

      // Check if post is too old (48 hours)
      const postAge = Date.now() / 1000 - post.created_utc;
      if (postAge > 48 * 60 * 60 && post.num_comments === 0) continue;

      // Analyze post
      const analysisResult = await analyzePost(
        persona.product_name,
        persona.problem_description || '',
        persona.pain_points || [],
        post.subreddit,
        post.title,
        post.selftext,
        apiKey
      );

      const analysis = analysisResult.analysis;
      let totalTokens = analysisResult.tokensUsed || 0;

      if (!analysis.should_reply || analysis.chilly_score < 0.7) continue;

      // Generate reply
      const replyResult = await generateReply(
        persona.name,
        persona.archetype,
        persona.tone_professionalism,
        persona.tone_conciseness,
        persona.tone_empathy,
        persona.authenticity_markers as any,
        persona.product_name,
        `${post.title}\n\n${post.selftext}`,
        analysis.chilly_score,
        apiKey
      );

      const reply = replyResult.reply;
      totalTokens += replyResult.tokensUsed || 0;

      // Save to database
      const { data: lead, error: leadError } = await supabase
        .from('lead_store')
        .insert({
          persona_id: personaId,
          post_id: post.id,
          author_id: post.author,
          subreddit: post.subreddit,
          post_title: post.title,
          post_body: post.selftext,
          post_url: post.permalink,
          chilly_score: analysis.chilly_score,
          reasoning: analysis.reasoning,
          intent_detected: analysis.intent_detected,
          generation_state: 'drafted',
          generated_reply: reply,
          tokens_spent: totalTokens,
        })
        .select()
        .single();

      if (leadError) {
        console.error('Error saving lead:', leadError);
        continue;
      }

      // Add to deduplication registry
      await supabase.from('deduplication_registry').insert({
        persona_id: personaId,
        post_id_hash: postHash,
      });

      processedLeads.push(lead);
    }

    // Update campaign stats
    rateLimiter.recordPost();
    const newConfig = rateLimiter.getConfig();
    await supabase
      .from('campaigns')
      .update({
        current_daily_count: newConfig.currentDailyCount,
        daily_post_cap: newConfig.dailyPostCap,
        last_post_date: newConfig.lastPostDate?.toISOString().split('T')[0],
      })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      leadsFound: processedLeads.length,
    });
  } catch (error: any) {
    console.error('Error in hunt cycle:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

